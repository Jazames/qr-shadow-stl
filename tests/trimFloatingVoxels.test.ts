import test from "node:test"
import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { trimFloatingVoxels, type CubeGrid3d } from "../src/generator.js"
import { CubeNode } from "../src/voxel/cubeNode.js"
import { surfaceExtract, writeBinaryStl, type VoxelGrid3d } from "../src/stl/stlGenerator.js"

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

const createCubeGridWithNodes = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  createNode: (x: number, y: number, z: number) => CubeNode
): CubeGrid3d =>
  Array.from({ length: sizeX }, (_, x) =>
    Array.from({ length: sizeY }, (_, y) =>
      Array.from({ length: sizeZ }, (_, z) => createNode(x, y, z))
    )
  )

const makeNode = (options?: {
  solid?: boolean
  surfaces?: { x?: boolean; y?: boolean; z?: boolean }
}): CubeNode => {
  const node = new CubeNode(options?.solid ?? false)
  if (!options?.solid) {
    node.clearAll()
  }
  if (options?.surfaces) {
    node.hasSurfacesNormalToX = options.surfaces.x ?? false
    node.hasSurfacesNormalToY = options.surfaces.y ?? false
    node.hasSurfacesNormalToZ = options.surfaces.z ?? false
  }
  return node
}

const getDataFromCubeNode = (node: CubeNode): number => {
  let value = 0
  if (node.isSolid) {
    value |= 0x01
  }
  if (node.hasSurfacesNormalToX) {
    value |= 0x02
  }
  if (node.hasSurfacesNormalToY) {
    value |= 0x04
  }
  if (node.hasSurfacesNormalToZ) {
    value |= 0x08
  }
  return value
}

const cubeGridToVoxelGrid = (cubeGrid: CubeGrid3d): VoxelGrid3d => {
  const sizeX = cubeGrid.length
  const sizeY = sizeX > 0 ? cubeGrid[0].length : 0
  const sizeZ = sizeY > 0 ? cubeGrid[0][0].length : 0
  const data = new Uint8Array(sizeX * sizeY * sizeZ)

  let idx = 0
  for (let z = 0; z < sizeZ; z++) {
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        data[idx++] = getDataFromCubeNode(cubeGrid[x][y][z])
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

const writeGridPair = async (name: string, before: CubeGrid3d, after: CubeGrid3d): Promise<void> => {
  const resolution = 10
  const wallThickness = 1
  const beforeTris = surfaceExtract(cubeGridToVoxelGrid(before), resolution, wallThickness)
  const afterTris = surfaceExtract(cubeGridToVoxelGrid(after), resolution, wallThickness)
  await writeStlFixture(`${name}-before.stl`, writeBinaryStl(beforeTris, 1))
  await writeStlFixture(`${name}-after.stl`, writeBinaryStl(afterTris, 1))
}

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

const isActiveNode = (node: CubeNode): boolean =>
  node.isSolid || node.hasSurfacesNormalToX || node.hasSurfacesNormalToY || node.hasSurfacesNormalToZ

const countActive = (cubeGrid: CubeGrid3d): number => {
  let total = 0
  for (let x = 0; x < cubeGrid.length; x++) {
    for (let y = 0; y < cubeGrid[x].length; y++) {
      for (let z = 0; z < cubeGrid[x][y].length; z++) {
        if (isActiveNode(cubeGrid[x][y][z])) {
          total++
        }
      }
    }
  }
  return total
}

const isRingCell = (y: number, z: number): boolean =>
  y === 0 || z === 0 || y === 4 || z === 4

test("trimFloatingVoxels keeps the 1x5x5 ring and removes a floating center cube", async () => {
  const cubeGrid = createCubeGrid(1, 5, 5, (_, y, z) => isRingCell(y, z) || (y === 2 && z === 2))
  const before = createCubeGrid(1, 5, 5, (_, y, z) => isRingCell(y, z) || (y === 2 && z === 2))

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-ring-1x5x5", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 16)
  for (let y = 0; y < 5; y++) {
    for (let z = 0; z < 5; z++) {
      const expectedSolid = isRingCell(y, z)
      assert.equal(cubeGrid[0][y][z].isSolid, expectedSolid, `unexpected solid at y=${y} z=${z}`)
    }
  }
})

test("trimFloatingVoxels preserves a single-voxel component", async () => {
  const cubeGrid = createCubeGrid(1, 1, 1, () => true)
  const before = createCubeGrid(1, 1, 1, () => true)

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-single-voxel", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 1)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
})

test("trimFloatingVoxels removes a smaller disconnected component", async () => {
  const cubeGrid = createCubeGrid(1, 4, 1, (_, y) => y === 0 || y === 1 || y === 3)
  const before = createCubeGrid(1, 4, 1, (_, y) => y === 0 || y === 1 || y === 3)

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-smaller-component", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 2)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[0][1][0].isSolid, true)
  assert.equal(cubeGrid[0][3][0].isSolid, false)
})

test("trimFloatingVoxels keeps a larger disconnected component over origin voxel", async () => {
  const cubeGrid = createCubeGrid(4, 2, 1, (x, y) =>
    (x === 0 && y === 0) || (x >= 2 && y === 0) || (x >= 2 && y === 1)
  )
  const before = createCubeGrid(4, 2, 1, (x, y) =>
    (x === 0 && y === 0) || (x >= 2 && y === 0) || (x >= 2 && y === 1)
  )

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-larger-component", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 4)
  assert.equal(cubeGrid[0][0][0].isSolid, false)
  assert.equal(cubeGrid[2][0][0].isSolid, true)
  assert.equal(cubeGrid[3][0][0].isSolid, true)
  assert.equal(cubeGrid[2][1][0].isSolid, true)
  assert.equal(cubeGrid[3][1][0].isSolid, true)
})

test("trimFloatingVoxels keeps larger component when connected by x-surfaces-only node", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(5, 1, 1, (x) => {
      if (x === 0) {
        return makeNode({ solid: true })
      }
      if (x === 1) {
        return makeNode({ surfaces: { x: true } })
      }
      if (x >= 2) {
        return makeNode({ solid: true })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-x-surfaces-only-forward", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 3)
  assert.equal(cubeGrid[0][0][0].isSolid, false)
  assert.equal(cubeGrid[2][0][0].isSolid, true)
  assert.equal(cubeGrid[3][0][0].isSolid, true)
  assert.equal(cubeGrid[4][0][0].isSolid, true)
})

test("trimFloatingVoxels keeps larger component when x-axis direction is reversed", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(5, 1, 1, (x) => {
      if (x === 4) {
        return makeNode({ solid: true })
      }
      if (x === 3) {
        return makeNode({ surfaces: { x: true } })
      }
      if (x <= 2) {
        return makeNode({ solid: true })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-x-surfaces-only-reverse", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 3)
  assert.equal(cubeGrid[4][0][0].isSolid, false)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[1][0][0].isSolid, true)
  assert.equal(cubeGrid[2][0][0].isSolid, true)
})

test("trimFloatingVoxels keeps larger component when connected by y-surfaces-only node", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 5, 1, (_, y) => {
      if (y === 0) {
        return makeNode({ solid: true })
      }
      if (y === 1) {
        return makeNode({ surfaces: { y: true } })
      }
      if (y >= 2) {
        return makeNode({ solid: true })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-y-surfaces-only-forward", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 3)
  assert.equal(cubeGrid[0][0][0].isSolid, false)
  assert.equal(cubeGrid[0][2][0].isSolid, true)
  assert.equal(cubeGrid[0][3][0].isSolid, true)
  assert.equal(cubeGrid[0][4][0].isSolid, true)
})

test("trimFloatingVoxels keeps larger component when y-axis direction is reversed", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 5, 1, (_, y) => {
      if (y === 4) {
        return makeNode({ solid: true })
      }
      if (y === 3) {
        return makeNode({ surfaces: { y: true } })
      }
      if (y <= 2) {
        return makeNode({ solid: true })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-y-surfaces-only-reverse", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 3)
  assert.equal(cubeGrid[0][4][0].isSolid, false)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[0][1][0].isSolid, true)
  assert.equal(cubeGrid[0][2][0].isSolid, true)
})

test("trimFloatingVoxels keeps larger component when connected by z-surfaces-only node", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 1, 5, (_, __, z) => {
      if (z === 0) {
        return makeNode({ solid: true })
      }
      if (z === 1) {
        return makeNode({ surfaces: { z: true } })
      }
      if (z >= 2) {
        return makeNode({ solid: true })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-z-surfaces-only-forward", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 3)
  assert.equal(cubeGrid[0][0][0].isSolid, false)
  assert.equal(cubeGrid[0][0][2].isSolid, true)
  assert.equal(cubeGrid[0][0][3].isSolid, true)
  assert.equal(cubeGrid[0][0][4].isSolid, true)
})

test("trimFloatingVoxels keeps larger component when z-axis direction is reversed", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 1, 5, (_, __, z) => {
      if (z === 4) {
        return makeNode({ solid: true })
      }
      if (z === 3) {
        return makeNode({ surfaces: { z: true } })
      }
      if (z <= 2) {
        return makeNode({ solid: true })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-z-surfaces-only-reverse", before, cubeGrid)

  assert.equal(countSolid(cubeGrid), 3)
  assert.equal(cubeGrid[0][0][4].isSolid, false)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[0][0][1].isSolid, true)
  assert.equal(cubeGrid[0][0][2].isSolid, true)
})

test("trimFloatingVoxels keeps ZSS for SYZSS along the x-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(5, 1, 1, (x) => {
      if (x === 0 || x >= 3) {
        return makeNode({ solid: true })
      }
      if (x === 1) {
        return makeNode({ surfaces: { y: true } })
      }
      if (x === 2) {
        return makeNode({ surfaces: { z: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-syzss-x-forward", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 3)
  assert.equal(isActiveNode(cubeGrid[0][0][0]), false)
  assert.equal(isActiveNode(cubeGrid[1][0][0]), false)
  assert.equal(cubeGrid[2][0][0].isSolid, false)
  assert.equal(cubeGrid[2][0][0].hasSurfacesNormalToZ, true)
  assert.equal(cubeGrid[3][0][0].isSolid, true)
  assert.equal(cubeGrid[4][0][0].isSolid, true)
})

test("trimFloatingVoxels keeps YSS for SZYSS along the x-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(5, 1, 1, (x) => {
      if (x === 0 || x >= 3) {
        return makeNode({ solid: true })
      }
      if (x === 1) {
        return makeNode({ surfaces: { z: true } })
      }
      if (x === 2) {
        return makeNode({ surfaces: { y: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-szyss-x-reverse", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 3)
  assert.equal(isActiveNode(cubeGrid[0][0][0]), false)
  assert.equal(isActiveNode(cubeGrid[1][0][0]), false)
  assert.equal(cubeGrid[2][0][0].isSolid, false)
  assert.equal(cubeGrid[2][0][0].hasSurfacesNormalToY, true)
  assert.equal(cubeGrid[3][0][0].isSolid, true)
  assert.equal(cubeGrid[4][0][0].isSolid, true)
})

test("trimFloatingVoxels keeps ZSS for SXZSS along the y-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 5, 1, (_, y) => {
      if (y === 0 || y >= 3) {
        return makeNode({ solid: true })
      }
      if (y === 1) {
        return makeNode({ surfaces: { x: true } })
      }
      if (y === 2) {
        return makeNode({ surfaces: { z: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-sxzss-y-forward", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 3)
  assert.equal(isActiveNode(cubeGrid[0][0][0]), false)
  assert.equal(isActiveNode(cubeGrid[0][1][0]), false)
  assert.equal(cubeGrid[0][2][0].isSolid, false)
  assert.equal(cubeGrid[0][2][0].hasSurfacesNormalToZ, true)
  assert.equal(cubeGrid[0][3][0].isSolid, true)
  assert.equal(cubeGrid[0][4][0].isSolid, true)
})

test("trimFloatingVoxels keeps XSS for SZXSS along the y-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 5, 1, (_, y) => {
      if (y === 0 || y >= 3) {
        return makeNode({ solid: true })
      }
      if (y === 1) {
        return makeNode({ surfaces: { z: true } })
      }
      if (y === 2) {
        return makeNode({ surfaces: { x: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-szxss-y-reverse", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 3)
  assert.equal(isActiveNode(cubeGrid[0][0][0]), false)
  assert.equal(isActiveNode(cubeGrid[0][1][0]), false)
  assert.equal(cubeGrid[0][2][0].isSolid, false)
  assert.equal(cubeGrid[0][2][0].hasSurfacesNormalToX, true)
  assert.equal(cubeGrid[0][3][0].isSolid, true)
  assert.equal(cubeGrid[0][4][0].isSolid, true)
})

test("trimFloatingVoxels keeps YSS for SXYSS along the z-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 1, 5, (_, __, z) => {
      if (z === 0 || z >= 3) {
        return makeNode({ solid: true })
      }
      if (z === 1) {
        return makeNode({ surfaces: { x: true } })
      }
      if (z === 2) {
        return makeNode({ surfaces: { y: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-sxyss-z-forward", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 3)
  assert.equal(isActiveNode(cubeGrid[0][0][0]), false)
  assert.equal(isActiveNode(cubeGrid[0][0][1]), false)
  assert.equal(cubeGrid[0][0][2].isSolid, false)
  assert.equal(cubeGrid[0][0][2].hasSurfacesNormalToY, true)
  assert.equal(cubeGrid[0][0][3].isSolid, true)
  assert.equal(cubeGrid[0][0][4].isSolid, true)
})

test("trimFloatingVoxels keeps XSS for SYXSS along the z-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 1, 5, (_, __, z) => {
      if (z === 0 || z >= 3) {
        return makeNode({ solid: true })
      }
      if (z === 1) {
        return makeNode({ surfaces: { y: true } })
      }
      if (z === 2) {
        return makeNode({ surfaces: { x: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-syxss-z-reverse", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 3)
  assert.equal(isActiveNode(cubeGrid[0][0][0]), false)
  assert.equal(isActiveNode(cubeGrid[0][0][1]), false)
  assert.equal(cubeGrid[0][0][2].isSolid, false)
  assert.equal(cubeGrid[0][0][2].hasSurfacesNormalToX, true)
  assert.equal(cubeGrid[0][0][3].isSolid, true)
  assert.equal(cubeGrid[0][0][4].isSolid, true)
})

test("trimFloatingVoxels keeps AY(YZ)ZA along the x-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(5, 1, 1, (x) => {
      if (x === 0 || x === 4) {
        return makeNode({ solid: true })
      }
      if (x === 1) {
        return makeNode({ surfaces: { y: true } })
      }
      if (x === 2) {
        return makeNode({ surfaces: { y: true, z: true } })
      }
      if (x === 3) {
        return makeNode({ surfaces: { z: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-ayyzzx-x-axis", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 5)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[4][0][0].isSolid, true)
})

test("trimFloatingVoxels keeps AY(YZ)ZA along the y-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 5, 1, (_, y) => {
      if (y === 0 || y === 4) {
        return makeNode({ solid: true })
      }
      if (y === 1) {
        return makeNode({ surfaces: { x: true } })
      }
      if (y === 2) {
        return makeNode({ surfaces: { x: true, z: true } })
      }
      if (y === 3) {
        return makeNode({ surfaces: { z: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-ayyzzx-y-axis", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 5)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[0][4][0].isSolid, true)
})

test("trimFloatingVoxels keeps AY(YZ)ZA along the z-axis", async () => {
  const buildGrid = () =>
    createCubeGridWithNodes(1, 1, 5, (_, __, z) => {
      if (z === 0 || z === 4) {
        return makeNode({ solid: true })
      }
      if (z === 1) {
        return makeNode({ surfaces: { x: true } })
      }
      if (z === 2) {
        return makeNode({ surfaces: { x: true, y: true } })
      }
      if (z === 3) {
        return makeNode({ surfaces: { y: true } })
      }
      return makeNode()
    })

  const cubeGrid = buildGrid()
  const before = buildGrid()

  trimFloatingVoxels(cubeGrid)
  await writeGridPair("trim-ayyzzx-z-axis", before, cubeGrid)

  assert.equal(countActive(cubeGrid), 5)
  assert.equal(cubeGrid[0][0][0].isSolid, true)
  assert.equal(cubeGrid[0][0][4].isSolid, true)
})
