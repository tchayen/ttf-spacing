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

const saveFile = (fileName: string, data: string) =>
  new Promise((resolve, reject) => {
    if (typeof data !== 'string') {
      const error = new Error('Only strings can be written to file');
      reject(error);
    }

    fs.writeFile(fileName, data, error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

(async () => {
  const buffer = await readFile('./Inter-Regular.ttf');
  const reader = fontFileReader(buffer);
  const ttf = ttfReader(reader);

  await saveFile('./Inter-Regular.json', JSON.stringify(ttf));

  const charToGlyphIndex = (char: string) =>
    ttf.glyphIndexMap[char.codePointAt(0) || 0] || 0;

  const data = 'hrumpy wizards make toxic brew'
    .split('')
    .map(charToGlyphIndex)
    .map(index => ({ index, glyf: ttf.glyf[index] }))
    .map(({ glyf, index }) => {
      const hmtx = ttf.hmtx.hMetrics[index];
      return {
        x: glyf.xMin,
        y: glyf.yMin,
        width: glyf.xMax - glyf.xMin,
        height: glyf.yMax - glyf.yMin,
        lsb: hmtx.leftSideBearing,
        rsb: hmtx.advanceWidth - hmtx.leftSideBearing - (glyf.xMax - glyf.xMin),
      };
    });
  console.log(data);
})();
