# qr-shadow-stl

Generate voxel-based STL geometry from QR codes in the browser. The app turns QR modules into a 3D voxel grid, extracts only exposed faces, and writes a binary STL for download.

Live demo: https://jazames.github.io/qr-shadow-stl/

## Basics

- Input text is encoded to a QR module grid (no decoding).
- The 2D grid is voxelized into a 3D solid volume.
- Only exposed faces are emitted as triangles (no internal walls).
- The mesh is written to a binary STL for download.

## Advanced Usage

- Multiple QR directions: you can provide one, two, or three texts to etch along Z (front), X (right), and Y (top). If you use more than one, they must resolve to the same QR module size (same QR version). Shorter text or different character sets can change the size, so keep inputs similar in length/complexity.
- Error correction: QR encoding is fixed to high error correction to keep the projected shadow readable.
- Resolution: higher values increase voxel density (and STL size). This controls how many voxels each QR module maps to.
- Wall thickness (voxels): thickens the lattice system that holds all of the floating cubes so the model stays printable; increase for strength, decrease for larger holes.
- Overall size (mm): sets the target cube size by scaling voxel size. Leave blank to keep the default 1 mm per voxel.

Programmatic example:

```ts
import { generateQrGrid } from './src/generator'

const result = generateQrGrid({
  frontText: 'https://example.com',
  rightText: 'https://example.com/right',
  topText: 'https://example.com/top',
  resolution: 1000,
  wallThicknessVoxels: 30,
  expectedSizeMm: 150
})

// result.stlBytes is a Uint8Array containing a binary STL
```

## Attribution

This project utilizes the QR generator from Project Nayuki (MIT License):
https://www.nayuki.io/page/qr-code-generator-library

Many thanks to Nayuki for wonderful software.

## Development

- `npm install`
- `npm run dev`
- `npm run build`

## Tests

- `npm run test`
