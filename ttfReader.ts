import {
  Dictionary,
  Fixed,
  Uint32,
  Uint16,
  FWord,
  Int16,
  UFWord,
} from './types';
import { FontFileReader } from './fontFileReader';

type Table = {
  checksum: number;
  offset: number;
  length: number;
};

type Head = {
  majorVersion: Uint16;
  minorVersion: Uint16;
  fontRevision: Fixed;
  checksumAdjustment: Uint32;
  magicNumber: Uint32;
  flags: Uint16;
  unitsPerEm: Uint16;
  created: Date;
  modified: Date;
  yMin: FWord;
  xMin: FWord;
  xMax: FWord;
  yMax: FWord;
  macStyle: Uint16;
  lowestRecPPEM: Uint16;
  fontDirectionHint: Int16;
  indexToLocFormat: Int16;
  glyphDataFormat: Int16;
};

type Cmap = {
  version: Uint16;
};

type Maxp = {
  version: Fixed;
  numGlyphs: Uint16;
  maxPoints: Uint16;
  maxContours: Uint16;
  maxCompositePoints: Uint16;
  maxCompositeContours: Uint16;
  maxZones: Uint16;
  maxTwilightPoints: Uint16;
  maxStorage: Uint16;
  maxFunctionDefs: Uint16;
  maxInstructionDefs: Uint16;
  maxStackElements: Uint16;
  maxSizeOfInstructions: Uint16;
  maxComponentElements: Uint16;
  maxComponentDepth: Uint16;
};

type Hhea = {
  version: Fixed;
  ascent: FWord;
  descent: FWord;
  lineGap: FWord;
  advanceWidthMax: UFWord;
  minLeftSideBearing: FWord;
  minRightSideBearing: FWord;
  xMaxExtent: FWord;
  caretSlopeRise: Int16;
  caretSlopeRun: Int16;
  caretOffset: FWord;
  reserved1: Int16;
  reserved2: Int16;
  reserved3: Int16;
  reserved4: Int16;
  metricDataFormat: Int16;
  numOfLongHorMetrics: Uint16;
};

type LongHorMetric = {
  advanceWidth: Uint16;
  leftSideBearing: Int16;
};

type Hmtx = {
  hMetrics: Array<LongHorMetric>;
  leftSideBearing: Array<FWord>;
};

type TtfReader = {
  tables: Dictionary<Table>;
  head: Head;
  maxp: Maxp;
  hhea: Hhea;
  hmtx: Hmtx;
};

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

const getGlyphOffset = (
  reader: FontFileReader,
  tables: Dictionary<Table>,
  head: Head,
  index: number,
) => {
  let offset;
  const old = reader.getPosition();
  if (head.indexToLocFormat === 1) {
    reader.setPosition(tables['loca'].offset + index * 4);
    offset = reader.getUint32();
  } else {
    reader.setPosition(tables['loca'].offset + index * 2);
    offset = reader.getUint16() * 2;
  }
  reader.setPosition(old);
  return offset + tables['glyf'].offset;
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
  const scalarType = reader.getUint32();
  const numTables = reader.getUint16();
  const searchRange = reader.getUint16();
  const entrySelector = reader.getUint16();
  const rangeShift = reader.getUint16();

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
    maxp,
    hhea,
    hmtx,
  };
};

export default ttfReader;
