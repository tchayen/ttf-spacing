# ttf-spacing

`*.ttf` files parser. Returns json with decoded subset of TTF tables or mapping unicode char to its spacing information.

Useful for calculating spacing of letters for text rendering. See `index.html` for example.

Parsed ttf file additionally contains `glyphIndexMap` object, which is dictionary mapping utf-8 char to `glyphIndex` which is used in other tables such as `loca` or `hmtx`.

## Usage

```bash
yarn parse spacing Inter-Regular.ttf spacing.json
yarn parse ttf Inter-Regular.ttf font.json
```

## Install

Clone the repository. Sorry, no `npm` package for now.

## Docs

Library handles following tables:

- tables
- head
- name
- cmap
- maxp
- loca
- hhea
- hmtx
- glyf

For exact types, consult `types.ts`.

Shape of glyph spacing information is as follows:

```ts
export type Glyph = {
  x: number;
  y: number;
  width: number;
  height: number;
  lsb: number;
  rsb: number;
};
```

Where `lsb` is left side bearing, as found in `hmtx` table, while `rsb` is right side bearing, calculated with following formula:

```js
const rsb = hmtx.advanceWidth - hmtx.leftSideBearing - (glyf.xMax - glyf.xMin);
```
