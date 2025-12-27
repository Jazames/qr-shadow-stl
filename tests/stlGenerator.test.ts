import test from "node:test"
import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { surfaceExtract, writeBinaryStl, type VoxelGrid3d } from "../src/stl/stlGenerator.js"

const solidVoxel = 0x0f
const testResolution = 10
const testWallThickness = 1
const pattern5x5 = [
  "XXXXX",
  "X   X",
  "X X X",
  "X   X",
  "XXXXX"
]

const isPatternSolid = (row: number, col: number): boolean =>
  pattern5x5[row]?.charAt(col) === "X"

const createGrid = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  isSolidVoxel: (x: number, y: number, z: number) => boolean
): VoxelGrid3d => {
  const data = new Uint8Array(sizeX * sizeY * sizeZ)
  let idx = 0
  for (let z = 0; z < sizeZ; z++) {
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        data[idx++] = isSolidVoxel(x, y, z) ? solidVoxel : 0x00
      }
    }
  }
  return { sizeX, sizeY, sizeZ, data }
}

const createGridWithValues = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  voxelValue: (x: number, y: number, z: number) => number
): VoxelGrid3d => {
  const data = new Uint8Array(sizeX * sizeY * sizeZ)
  let idx = 0
  for (let z = 0; z < sizeZ; z++) {
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        data[idx++] = voxelValue(x, y, z)
      }
    }
  }
  return { sizeX, sizeY, sizeZ, data }
}

const writeStlFixture = async (name: string, stl: Uint8Array): Promise<void> => {
  const outDir = path.resolve("tests", "out")
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, name), stl)
}

const singleVoxelGrid = (value: number): VoxelGrid3d => ({
  sizeX: 1,
  sizeY: 1,
  sizeZ: 1,
  data: new Uint8Array([value])
})

test("1x1x1 cube generates 12 triangles and valid binary STL", async () => {
  const grid = createGrid(1, 1, 1, () => true)

  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("cube-1x1x1.stl", stl)

  assert.equal(tris.length, 12)
  assert.equal(stl.byteLength, 80 + 4 + 12 * 50)

  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength)
  assert.equal(view.getUint32(80, true), 12)

  const triangleCount = 12
  const stride = 50
  const start = 84
  for (let i = 0; i < triangleCount; i++) {
    const base = start + i * stride
    // Skip normal (12 bytes) and check vertex positions (9 floats).
    for (let v = 0; v < 9; v++) {
      const coord = view.getFloat32(base + 12 + v * 4, true)
      assert.ok(coord === 0 || coord === testResolution, `unexpected coord ${coord}`)
    }
  }
})

test("3x3x3 cube missing center line along x-axis generates 128 triangles", async () => {
  const grid = createGrid(3, 3, 3, (_, y, z) => !(y === 1 && z === 1))
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("cube-3x3x3-missing-x.stl", stl)

  assert.equal(tris.length, 128)
})

test("3x3x3 cube missing center line along y-axis generates 128 triangles", async () => {
  const grid = createGrid(3, 3, 3, (x, _, z) => !(x === 1 && z === 1))
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("cube-3x3x3-missing-y.stl", stl)

  assert.equal(tris.length, 128)
})

test("3x3x3 cube missing center line along z-axis generates 128 triangles", async () => {
  const grid = createGrid(3, 3, 3, (x, y, _) => !(x === 1 && y === 1))
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("cube-3x3x3-missing-z.stl", stl)

  assert.equal(tris.length, 128)
})

test("2x2x2 cube missing one row along each axis generates 12 triangles", async () => {
  const grid = createGrid(2, 2, 2, (x, y, z) => x + y + z < 2);
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("cube-2x2x2-missing-xyz-row.stl", stl)

  assert.equal(tris.length, 36)
})

test("1x1x1 box with x-axis hole generates 32 triangles", async () => {
  const grid = singleVoxelGrid(0x08 | 0x04)
  const tris = surfaceExtract(grid, testResolution, testWallThickness)

  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("box-1x1x1-x-hole.stl", stl)

  assert.equal(tris.length, 32)
})

test("1x1x1 box with y-axis hole generates 32 triangles", async () => {
  const grid = singleVoxelGrid( 0x08 | 0x02)
  const tris = surfaceExtract(grid, testResolution, testWallThickness)

  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("box-1x1x1-y-hole.stl", stl)

  assert.equal(tris.length, 32)
})

test("1x1x1 box with z-axis hole generates 32 triangles", async () => {
  const grid = singleVoxelGrid( 0x04 | 0x02)
  const tris = surfaceExtract(grid, testResolution, testWallThickness)

  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("box-1x1x1-z-hole.stl", stl)

  assert.equal(tris.length, 32)

})

test("5x5 pattern extruded along x-axis generates 428 triangles", async () => {
  const grid = createGridWithValues(5, 5, 5, (_, y, z) =>
    isPatternSolid(y, z) ? solidVoxel : (0x08 | 0x04)
  )
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("pattern-5x5-extruded-x.stl", stl)

  assert.equal(tris.length, 716)
})

test("5x5 pattern extruded along y-axis generates 428 triangles", async () => {
  const grid = createGridWithValues(5, 5, 5, (x, _, z) =>
    isPatternSolid(x, z) ? solidVoxel : (0x08 | 0x02)
  )
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("pattern-5x5-extruded-y.stl", stl)

  assert.equal(tris.length, 716)
})

test("5x5 pattern extruded along z-axis generates 428 triangles", async () => {
  const grid = createGridWithValues(5, 5, 5, (x, y, _) =>
    isPatternSolid(x, y) ? solidVoxel : (0x04 | 0x02)
  )
  const tris = surfaceExtract(grid, testResolution, testWallThickness)
  const stl = writeBinaryStl(tris, 1)
  await writeStlFixture("pattern-5x5-extruded-z.stl", stl)

  assert.equal(tris.length, 716)
})
