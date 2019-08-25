export type FontFileReader = {
  getUint8: () => number;
  getUint16: () => number;
  getUint32: () => number;
  getInt16: () => number;
  getInt32: () => number;
  getFword: () => number;
  get2Dot14: () => number;
  getFixed: () => number;
  getString: (length: number) => string;
  getDate: () => Date;
  getPosition: () => number;
  setPosition: (targetPosition: number) => void;
};

const fontFileReader = (buffer: Buffer): FontFileReader => {
  const data: Uint8Array = new Uint8Array(buffer);
  let position = 0;

  const getUint8 = () => data[position++];
  const getUint16 = () => ((getUint8() << 8) | getUint8()) >>> 0;
  const getUint32 = () => getInt32() >>> 0;
  const getInt16 = () => {
    let number = getUint16();
    if (number & 0x8000) {
      number -= 1 << 16;
    }
    return number;
  };
  const getInt32 = () =>
    (getUint8() << 24) | (getUint8() << 16) | (getUint8() << 8) | getUint8();

  const getFword = getInt16;

  const get2Dot14 = () => getInt16() / (1 << 14);

  const getFixed = () => getInt32() / (1 << 16);

  const getString = (length: number) => {
    let string = '';
    for (let i = 0; i < length; i++) {
      string += String.fromCharCode(getUint8());
    }
    return string;
  };

  const getDate = () => {
    const macTime = getUint32() * 0x100000000 + getUint32();
    const utcTime = macTime * 1000 + Date.UTC(1904, 1, 1);
    return new Date(utcTime);
  };

  const getPosition = () => position;
  const setPosition = (targetPosition: number) => (position = targetPosition);

  return {
    getUint8,
    getUint16,
    getUint32,
    getInt16,
    getInt32,
    getFword,
    get2Dot14,
    getFixed,
    getString,
    getDate,
    getPosition,
    setPosition,
  };
};

export default fontFileReader;