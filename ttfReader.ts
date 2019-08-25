import { Dictionary, Uint16, Mapping } from './types';
import {
  Name,
  Cmap,
  Maxp,
  Hhea,
  Hmtx,
  TtfReader,
  Table,
  Head,
  Format4,
} from './ttf';
import { FontFileReader } from './fontFileReader';

const calculateTableChecksum = (
  reader: FontFileReader,
  offset: number,
  length: number,
) => {
  const old = reader.getPosition();
  reader.setPosition(offset);
  let sum = 0;
  let nlongs = ((length + 3) / 4) | 0;
  while (nlongs > 0) {
    sum = ((sum + reader.getUint32()) & 0xffffffff) >>> 0;
    nlongs -= 1;
  }
  reader.setPosition(old);
  return sum;
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/head
const readHeadTable = (reader: FontFileReader, offset: number): Head => {
  const old = reader.getPosition();
  reader.setPosition(offset);

  const head = {
    majorVersion: reader.getUint16(),
    minorVersion: reader.getUint16(),
    fontRevision: reader.getFixed(),
    checksumAdjustment: reader.getUint32(),
    magicNumber: reader.getUint32(),
    flags: reader.getUint16(),
    unitsPerEm: reader.getUint16(),
    created: reader.getDate(),
    modified: reader.getDate(),
    xMin: reader.getFWord(),
    yMin: reader.getFWord(),
    xMax: reader.getFWord(),
    yMax: reader.getFWord(),
    macStyle: reader.getUint16(),
    lowestRecPPEM: reader.getUint16(),
    fontDirectionHint: reader.getInt16(),
    indexToLocFormat: reader.getInt16(),
    glyphDataFormat: reader.getInt16(),
  };

  reader.setPosition(old);

  if (head.magicNumber !== 0x5f0f3cf5) {
    throw new Error('Magic number is incorrect');
  }

  return head;
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/name
const readNameTable = (reader: FontFileReader, offset: number): Name => {
  const old = reader.getPosition();
  reader.setPosition(offset);

  const format = reader.getUint16();
  let name: Name;
  if (format === 0) {
    name = {
      format: 0,
      count: reader.getUint16(),
      stringOffset: reader.getUint16(),
      nameRecord: [],
    };

    for (let i = 0; i < name.count; i++) {
      name.nameRecord.push({
        platformID: reader.getUint16(),
        encodingID: reader.getUint16(),
        languageID: reader.getUint16(),
        nameID: reader.getUint16(),
        length: reader.getUint16(),
        offset: reader.getUint16(),
      });
    }
  } else if (format === 1) {
    let partialName: Partial<Name> = {
      format: 1,
      count: reader.getUint16(),
      stringOffset: reader.getUint16(),
      nameRecord: [],
    };

    for (let i = 0; i < partialName.count!; i++) {
      partialName.nameRecord!.push({
        platformID: reader.getUint16(),
        encodingID: reader.getUint16(),
        languageID: reader.getUint16(),
        nameID: reader.getUint16(),
        length: reader.getUint16(),
        offset: reader.getUint16(),
      });
    }

    partialName.langTagCount = reader.getUint16();
    partialName.langTagRecord = [];

    for (let i = 0; i < partialName.langTagCount; i++) {
      partialName.langTagRecord.push({
        length: reader.getUint16(),
        offset: reader.getUint16(),
      });
    }
    name = partialName as Name;
  } else {
    throw new Error('Incorrect format');
  }

  reader.setPosition(old);

  return name;
};

type ParseFormat4Output = Format4 & { glyphIndexMap: Mapping<number> };

// https://docs.microsoft.com/en-us/typography/opentype/spec/cmap#format-4-segment-mapping-to-delta-values
const parseFormat4 = (reader: FontFileReader): ParseFormat4Output => {
  const format4: ParseFormat4Output = {
    format: 4,
    length: reader.getUint16(),
    language: reader.getUint16(),
    segCountX2: reader.getUint16(),
    searchRange: reader.getUint16(),
    entrySelector: reader.getUint16(),
    rangeShift: reader.getUint16(),
    endCode: [],
    startCode: [],
    idDelta: [],
    idRangeOffset: [],
    glyphIndexMap: {},
  };

  const segCount = format4.segCountX2 >> 1;

  for (let i = 0; i < segCount; i++) {
    format4.endCode.push(reader.getUint16());
  }

  reader.getUint16(); // reserved pad

  for (let i = 0; i < segCount; i++) {
    format4.startCode.push(reader.getUint16());
  }

  for (let i = 0; i < segCount; i++) {
    format4.idDelta.push(reader.getInt16());
  }

  const idRangeOffsetsStart = reader.getPosition();

  for (let i = 0; i < segCount; i++) {
    format4.idRangeOffset.push(reader.getUint16());
  }

  for (let i = 0; i < segCount - 1; i++) {
    let glyphIndex = 0;
    const endCode = format4.endCode[i];
    const startCode = format4.startCode[i];
    const idDelta = format4.idDelta[i];
    const idRangeOffset = format4.idRangeOffset[i];

    for (let c = startCode; c < endCode; c++) {
      if (idRangeOffset !== 0) {
        const startCodeOffset = (c - startCode) * 2;
        const currentRangeOffset = i * 2; // 2 because the numbers are 2 byte big.

        let glyphIndexOffset =
          idRangeOffsetsStart +
          idRangeOffset +
          currentRangeOffset +
          startCodeOffset;

        reader.setPosition(glyphIndexOffset);
        glyphIndex = reader.getUint16();
        if (glyphIndex !== 0) {
          glyphIndex = (glyphIndex + idDelta) & 0xffff;
        }
      } else {
        glyphIndex = (c + idDelta) & 0xffff;
      }
      format4.glyphIndexMap[c] = glyphIndex;
    }
  }

  return format4;
};

type ReadCmapTableOutput = Cmap & { glyphIndexMap: Mapping<number> };

// https://docs.microsoft.com/en-us/typography/opentype/spec/cmap
const readCmapTable = (
  reader: FontFileReader,
  offset: number,
): ReadCmapTableOutput => {
  const old = reader.getPosition();
  reader.setPosition(offset);

  const cmap: ReadCmapTableOutput = {
    version: reader.getUint16(),
    numTables: reader.getUint16(),
    encodingRecords: [],
    glyphIndexMap: {},
  };

  if (cmap.version !== 0) {
    throw new Error(`cmap version should be 0 but is ${cmap.version}`);
  }

  for (let i = 0; i < cmap.numTables; i++) {
    cmap.encodingRecords.push({
      platformID: reader.getUint16(),
      encodingID: reader.getUint16(),
      offset: reader.getUint32(),
    });
  }

  let selectedOffset = -1;
  for (let i = 0; i < cmap.numTables; i++) {
    const { platformID, encodingID, offset } = cmap.encodingRecords[i];
    const windowsPlatform =
      platformID === 3 &&
      (encodingID === 0 || encodingID === 1 || encodingID === 10);

    const unicodePlatform =
      platformID === 0 &&
      (encodingID === 0 ||
        encodingID === 1 ||
        encodingID === 2 ||
        encodingID === 3 ||
        encodingID === 4);

    if (windowsPlatform || unicodePlatform) {
      selectedOffset = offset;
      break;
    }
  }

  if (selectedOffset === -1) {
    throw new Error(
      "The font doesn't contain any recognized platform and encoding",
    );
  }

  reader.setPosition(offset + selectedOffset);
  const format = reader.getUint16();
  if (format === 4) {
    cmap.glyphIndexMap = parseFormat4(reader).glyphIndexMap;
  } else {
    throw new Error(`Unsupported format: ${format}. Required: 4.`);
  }

  reader.setPosition(old);

  return cmap;
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/maxp
const readMaxpTable = (reader: FontFileReader, offset: number): Maxp => {
  const old = reader.getPosition();
  reader.setPosition(offset);

  const maxp = {
    version: reader.getFixed(),
    numGlyphs: reader.getUint16(),
    maxPoints: reader.getUint16(),
    maxContours: reader.getUint16(),
    maxCompositePoints: reader.getUint16(),
    maxCompositeContours: reader.getUint16(),
    maxZones: reader.getUint16(),
    maxTwilightPoints: reader.getUint16(),
    maxStorage: reader.getUint16(),
    maxFunctionDefs: reader.getUint16(),
    maxInstructionDefs: reader.getUint16(),
    maxStackElements: reader.getUint16(),
    maxSizeOfInstructions: reader.getUint16(),
    maxComponentElements: reader.getUint16(),
    maxComponentDepth: reader.getUint16(),
  };

  reader.setPosition(old);

  return maxp;
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/hhea
const readHheaTable = (reader: FontFileReader, offset: number): Hhea => {
  const old = reader.getPosition();
  reader.setPosition(offset);

  const hhea = {
    version: reader.getFixed(),
    ascent: reader.getFWord(),
    descent: reader.getFWord(),
    lineGap: reader.getFWord(),
    advanceWidthMax: reader.getUFWord(),
    minLeftSideBearing: reader.getFWord(),
    minRightSideBearing: reader.getFWord(),
    xMaxExtent: reader.getFWord(),
    caretSlopeRise: reader.getInt16(),
    caretSlopeRun: reader.getInt16(),
    caretOffset: reader.getFWord(),
    reserved1: reader.getInt16(),
    reserved2: reader.getInt16(),
    reserved3: reader.getInt16(),
    reserved4: reader.getInt16(),
    metricDataFormat: reader.getInt16(),
    numOfLongHorMetrics: reader.getUint16(),
  };

  reader.setPosition(old);

  return hhea;
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/hmtx
const readHmtxTable = (
  reader: FontFileReader,
  offset: number,
  numGlyphs: number,
  numOfLongHorMetrics: Uint16,
): Hmtx => {
  const old = reader.getPosition();
  reader.setPosition(offset);

  const hMetrics = [];
  for (let i = 0; i < numOfLongHorMetrics; i++) {
    hMetrics.push({
      advanceWidth: reader.getUint16(),
      leftSideBearing: reader.getInt16(),
    });
  }

  const leftSideBearing = [];
  for (let i = 0; i < numGlyphs - numOfLongHorMetrics; i++) {
    leftSideBearing.push(reader.getFWord());
  }

  const hmtx = {
    hMetrics,
    leftSideBearing,
  };

  reader.setPosition(old);

  return hmtx;
};

const ttfReader = (reader: FontFileReader): TtfReader => {
  reader.getUint32(); // scalarType
  const numTables = reader.getUint16();
  reader.getUint16(); // searchRange
  reader.getUint16(); // entrySelector
  reader.getUint16(); // rangeShift

  const tables: Dictionary<Table> = {};

  for (let i = 0; i < numTables; i++) {
    const tag = reader.getString(4);
    tables[tag] = {
      checksum: reader.getUint32(),
      offset: reader.getUint32(),
      length: reader.getUint32(),
    };

    if (tag !== 'head') {
      const calculatedChecksum = calculateTableChecksum(
        reader,
        tables[tag].offset,
        tables[tag].length,
      );
      const { checksum } = tables[tag];
      if (calculatedChecksum !== checksum) {
        throw new Error(`Checksum doesn't match for table ${tag}`);
      }
    }
  }

  const head = readHeadTable(reader, tables['head'].offset);
  const name = readNameTable(reader, tables['name'].offset);
  const { glyphIndexMap, ...cmap } = readCmapTable(
    reader,
    tables['cmap'].offset,
  );
  const maxp = readMaxpTable(reader, tables['maxp'].offset);
  const hhea = readHheaTable(reader, tables['hhea'].offset);
  const hmtx = readHmtxTable(
    reader,
    tables['hmtx'].offset,
    maxp.numGlyphs,
    hhea.numOfLongHorMetrics,
  );

  return {
    tables,
    head,
    name,
    cmap,
    maxp,
    hhea,
    hmtx,
    glyphIndexMap,
  };
};

export default ttfReader;
