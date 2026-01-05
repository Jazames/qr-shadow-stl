# AGENTS

## Goal
Generate an STL of voxel-based geometry derived from QR codes. All geometry is integer-grid based until STL write-time.

## Non-goals
- No QR decoding.
- No server/backend.
- No image rendering required to generate output.

## Tech
- Vite + TypeScript (browser-only)
- Vendored Nayuki QR generator (`src/vendor/nayuki/qrcodegen.ts`)
- Output STL: binary by default
- Live demo: https://jazames.github.io/qr-shadow-stl/

## Core pipeline
1. `encodeQrToBoolGrid(text, ecc, quietZone) -> BoolGrid2d`
2. `voxelizeQr(grid2d, moduleSizeVoxels, thicknessVoxels) -> VoxelGrid3d`
3. `surfaceExtract(voxels) -> Triangle[]` (exposed faces only; no internal walls)
4. `writeBinaryStl(tris, voxelSizeMm) -> Uint8Array`
5. Download via Blob in browser

## Data structures
- BoolGrid2d: `{ width, height, data: Uint8Array }` row-major, 1=black
- VoxelGrid3d: `{ sizeX, sizeY, sizeZ, data: Uint8Array }` x-fastest, 1=solid
- Triangle: `{ v1, v2, v3 }` vertices in integer grid units

## Invariants
- All voxel coordinates are integers.
- Never emit internal faces: a face is emitted only when neighbor in that direction is empty/out-of-bounds.
- Consistent triangle winding so normals point outward.

## Implementation notes
- Start with exposed-face emission (correctness first).
- Add greedy meshing later (performance).
- Quiet zone default: 4 modules (allow 6-8).

## Attribution
- QR generator library by Project Nayuki (MIT License): https://www.nayuki.io/page/qr-code-generator-library

## What to implement first
- `src/qr/qrTypes.ts`, `src/qr/qrEncode.ts`
- `src/voxel/voxelGrid.ts`, `src/voxel/voxelizeQr.ts`
- `src/mesh/surfaceExtractor.ts`
- `src/stl/stlBinaryWriter.ts`
- Wire `src/main.ts` to a minimal UI + download.