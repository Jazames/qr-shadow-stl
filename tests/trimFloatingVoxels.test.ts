import test from "node:test"
import assert from "node:assert/strict"
import { trimFloatingVoxels, type CubeGrid3d } from "../src/generator.js"
import { CubeNode } from "../src/voxel/cubeNode.js"

const createCubeGrid = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  isSolid: (x: number, y: number, z: number) => boolean
): CubeGrid3d =>
  Array.from({ length: sizeX }, (_, x) =>
    Array.from({ length: sizeY }, (_, y) =>
      Array.from({ length: sizeZ }, (_, z) => {
        const solid = isSolid(x, y, z)
        const node = new CubeNode(solid)
        if (!solid) {
          node.clearAll()
        }
        return node
      })
    )
  )

const countSolid = (cubeGrid: CubeGrid3d): number => {
  let total = 0
  for (let x = 0; x < cubeGrid.length; x++) {
    for (let y = 0; y < cubeGrid[x].length; y++) {
      for (let z = 0; z < cubeGrid[x][y].length; z++) {
        if (cubeGrid[x][y][z].isSolid) {
          total++
        }
      }
    }
  }
  return total
}

const isRingCell = (y: number, z: number): boolean =>
  y === 0 || z === 0 || y === 4 || z === 4

test("trimFloatingVoxels keeps the 1x5x5 ring and removes a floating center cube", () => {
  const cubeGrid = createCubeGrid(1, 5, 5, (_, y, z) => isRingCell(y, z) || (y === 2 && z === 2))

  trimFloatingVoxels(cubeGrid)

  assert.equal(countSolid(cubeGrid), 16)
  for (let y = 0; y < 5; y++) {
    for (let z = 0; z < 5; z++) {
      const expectedSolid = isRingCell(y, z)
      assert.equal(cubeGrid[0][y][z].isSolid, expectedSolid, `unexpected solid at y=${y} z=${z}`)
    }
  }
})

test("trimFloatingVoxels preserves a single-voxel component", () => {
  const cubeGrid = createCubeGrid(1, 1, 1, () => true)

  trimFloatingVoxels(cubeGrid)

  assert.equal(countSolid(cubeGrid), 1)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
})

test("trimFloatingVoxels removes a smaller disconnected component", () => {
  const cubeGrid = createCubeGrid(1, 4, 1, (_, y) => y === 0 || y === 1 || y === 3)

  trimFloatingVoxels(cubeGrid)

  assert.equal(countSolid(cubeGrid), 2)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[0][1][0].isSolid, true)
  assert.equal(cubeGrid[0][3][0].isSolid, false)
})

test("trimFloatingVoxels keeps a larger disconnected component over origin voxel", () => {
  const cubeGrid = createCubeGrid(4, 2, 1, (x, y) =>
    (x === 0 && y === 0) || (x >= 2 && y === 0) || (x >= 2 && y === 1)
  )

  trimFloatingVoxels(cubeGrid)

  assert.equal(countSolid(cubeGrid), 4)
  assert.equal(cubeGrid[0][0][0].isSolid, false)
  assert.equal(cubeGrid[2][0][0].isSolid, true)
  assert.equal(cubeGrid[3][0][0].isSolid, true)
  assert.equal(cubeGrid[2][1][0].isSolid, true)
  assert.equal(cubeGrid[3][1][0].isSolid, true)
})
