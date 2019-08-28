# ttf-boundaries

`*.ttf` files parser. Returns json with decoded tables.

And additionally contains `glyphIndexMap` object, which is dictionary mapping utf-8 char to `glyphIndex` which is used in other tables such as `loca` or `hmtx`.

## Usage

```js
import ttfBoundaries from 'ttf-boundaries';
// ...
const font = await ttfBoundaries('Inter-Regular.ttf');
```

## Install

```bash
yarn add ttf-boundaries
```

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
