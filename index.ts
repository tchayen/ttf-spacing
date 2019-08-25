import fs from 'fs';
import fontFileReader, { FontFileReader } from './fontFileReader';
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

  console.log(ttf);
})();
