import fs from 'fs';
import fontFileReader from './fontFileReader';
import ttfReader from './ttfReader';

const readFile = (fileName: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    fs.readFile(fileName, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });

(async () => {
  const buffer = await readFile('./Inter-Regular.ttf');
  const reader = fontFileReader(buffer);
  const ttf = ttfReader(reader);

  const charToGlyphIndex = (char: string) =>
    ttf.glyphIndexMap[char.codePointAt(0) || 0] || 0;

  console.log(ttf.hmtx.hMetrics[charToGlyphIndex('w')]);
  console.log(ttf.hmtx.hMetrics[charToGlyphIndex('a')]);
  // console.log(JSON.stringify(ttf, null, 4));
})();
