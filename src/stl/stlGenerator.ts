export type Triangle = {
  v1: [number, number, number]
  v2: [number, number, number]
  v3: [number, number, number]
}

export type VoxelGrid3d = {
  sizeX: number
  sizeY: number
  sizeZ: number
  data: Uint8Array
}

const isSolid = (grid: VoxelGrid3d, x: number, y: number, z: number): boolean => {
  if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
    return false
  }
  const idx = x + grid.sizeX * (y + grid.sizeY * z)
  return grid.data[idx] === 1
}

const addFace = (
  tris: Triangle[],
  p0: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number]
): void => {
  tris.push({ v1: p0, v2: p1, v3: p2 })
  tris.push({ v1: p0, v2: p2, v3: p3 })
}

export const surfaceExtract = (grid: VoxelGrid3d): Triangle[] => {
  const tris: Triangle[] = []

  for (let z = 0; z < grid.sizeZ; z++) {
    for (let y = 0; y < grid.sizeY; y++) {
      for (let x = 0; x < grid.sizeX; x++) {
        if (!isSolid(grid, x, y, z)) continue

        const x0 = x
        const x1 = x + 1
        const y0 = y
        const y1 = y + 1
        const z0 = z
        const z1 = z + 1

        if (!isSolid(grid, x + 1, y, z)) {
          addFace(
            tris,
            [x1, y0, z0],
            [x1, y1, z0],
            [x1, y1, z1],
            [x1, y0, z1]
          )
        }

        if (!isSolid(grid, x - 1, y, z)) {
          addFace(
            tris,
            [x0, y0, z0],
            [x0, y0, z1],
            [x0, y1, z1],
            [x0, y1, z0]
          )
        }

        if (!isSolid(grid, x, y + 1, z)) {
          addFace(
            tris,
            [x0, y1, z0],
            [x0, y1, z1],
            [x1, y1, z1],
            [x1, y1, z0]
          )
        }

        if (!isSolid(grid, x, y - 1, z)) {
          addFace(
            tris,
            [x0, y0, z0],
            [x1, y0, z0],
            [x1, y0, z1],
            [x0, y0, z1]
          )
        }

        if (!isSolid(grid, x, y, z + 1)) {
          addFace(
            tris,
            [x0, y0, z1],
            [x1, y0, z1],
            [x1, y1, z1],
            [x0, y1, z1]
          )
        }

        if (!isSolid(grid, x, y, z - 1)) {
          addFace(
            tris,
            [x0, y0, z0],
            [x0, y1, z0],
            [x1, y1, z0],
            [x1, y0, z0]
          )
        }
      }
    }
  }

  return tris
}

export const writeBinaryStl = (tris: Triangle[], voxelSizeMm: number): Uint8Array => {
  const triangleCount = tris.length
  const headerBytes = 80
  const triRecordBytes = 50
  const buffer = new ArrayBuffer(headerBytes + 4 + triangleCount * triRecordBytes)
  const view = new DataView(buffer)

  // 80-byte header left as zeros
  view.setUint32(headerBytes, triangleCount, true)

  let offset = headerBytes + 4

  const writeVertex = (v: [number, number, number]) => {
    view.setFloat32(offset, v[0] * voxelSizeMm, true)
    view.setFloat32(offset + 4, v[1] * voxelSizeMm, true)
    view.setFloat32(offset + 8, v[2] * voxelSizeMm, true)
    offset += 12
  }

  for (const tri of tris) {
    // normal (nx, ny, nz) — zeroed (12 bytes)
    view.setFloat32(offset, 0, true)
    view.setFloat32(offset + 4, 0, true)
    view.setFloat32(offset + 8, 0, true)
    offset += 12

    writeVertex(tri.v1)
    writeVertex(tri.v2)
    writeVertex(tri.v3)

    view.setUint16(offset, 0, true) // attribute byte count
    offset += 2
  }

  return new Uint8Array(buffer)
}

export const gridToBinaryStl = (grid: VoxelGrid3d, voxelSizeMm: number): Uint8Array => {
  const tris = surfaceExtract(grid)
  return writeBinaryStl(tris, voxelSizeMm)
}
