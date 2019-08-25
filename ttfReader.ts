import { Dictionary } from './types';
import { FontFileReader } from './fontFileReader';

type Table = {
  checksum: number;
  offset: number;
  length: number;
};

type TtfReader = {
  tables: Dictionary<Table>;
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

  const readHeadTable = () => {
    const old = reader.getPosition();
    reader.setPosition(tables['head'].offset);

    const head = {
      version: reader.getFixed(),
      fontRevision: reader.getFixed(),
      checksumAdjustment: reader.getUint32(),
      magicNumber: reader.getUint32(),
      flags: reader.getUint16(),
      unitsPerEm: reader.getUint16(),
      created: reader.getDate(),
      modified: reader.getDate(),
      xMin: reader.getFword(),
      yMin: reader.getFword(),
      xMax: reader.getFword(),
      yMax: reader.getFword(),
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

  const head = readHeadTable();

  const getGlyphOffset = (index: number) => {
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

  return {
    tables,
  };
};

export default ttfReader;
