import {
  Dictionary,
  Mapping,
  Fixed,
  Uint32,
  Uint16,
  FWord,
  Int16,
  UFWord,
  Offset32,
  Offset16,
} from './types';

export type Table = {
  checksum: number;
  offset: number;
  length: number;
};

export type Head = {
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

export type NameRecord = {
  platformID: Uint16;
  encodingID: Uint16;
  languageID: Uint16;
  nameID: Uint16;
  length: Uint16;
  offset: Offset16;
};

export type LangTagRecord = {
  length: Uint16;
  offset: Offset16;
};

export type Name =
  | {
      format: 0;
      count: Uint16;
      stringOffset: Offset16;
      nameRecord: Array<NameRecord>;
    }
  | {
      format: 1;
      count: Uint16;
      stringOffset: Offset16;
      nameRecord: Array<NameRecord>;
      langTagCount: Uint16;
      langTagRecord: Array<LangTagRecord>;
    };

export type EncodingRecord = {
  platformID: Uint16;
  encodingID: Uint16;
  offset: Offset32;
};

export type Format4 = {
  format: Uint16;
  length: Uint16;
  language: Uint16;
  segCountX2: Uint16;
  searchRange: Uint16;
  entrySelector: Uint16;
  rangeShift: Uint16;
  endCode: Array<Uint16>;
  startCode: Array<Uint16>;
  idDelta: Array<Int16>;
  idRangeOffset: Array<Uint16>;
};

export type Cmap = {
  version: Uint16;
  numTables: Uint16;
  encodingRecords: Array<EncodingRecord>;
};

export type Maxp = {
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

export type Hhea = {
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

export type LongHorMetric = {
  advanceWidth: Uint16;
  leftSideBearing: Int16;
};

export type Hmtx = {
  hMetrics: Array<LongHorMetric>;
  leftSideBearing: Array<FWord>;
};

export type Loca = Array<Offset16> | Array<Offset32>;

type GlyphHeader = {
  numberOfContours: Int16;
  xMin: Int16;
  yMin: Int16;
  xMax: Int16;
  yMax: Int16;
};

export type Glyf = Array<GlyphHeader>;

export type TtfReader = {
  tables: Dictionary<Table>;
  head: Head;
  name: Name;
  cmap: Cmap;
  loca: Loca;
  maxp: Maxp;
  hhea: Hhea;
  hmtx: Hmtx;
  glyf: Glyf;
  glyphIndexMap: Mapping<number>;
};
