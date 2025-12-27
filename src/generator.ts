import { qrcodegen } from './vendor/nayuki/qrcodegen'
import { gridToBinaryStl } from './stl/stlGenerator'
import type { VoxelGrid3d } from './stl/stlGenerator'
import { CubeNode } from './voxel/cubeNode'

export type BoolGrid2d = {
  width: number
  height: number
  //data: Uint8Array
}

export type CubeGrid3d = CubeNode[][][]

export type QrGenerationResult = BoolGrid2d & {
  cubeGrid: CubeGrid3d
  stlBytes: Uint8Array
}

const getDataFromCubeNode = (node: CubeNode): number => {
  let value: number = 0
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

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        const idx = x + sizeX * (y + sizeY * z)
        data[idx] = getDataFromCubeNode(cubeGrid[x][y][z])
      }
    }
  }

  return { sizeX, sizeY, sizeZ, data }
}

export const generateQrGrid = (text: string): QrGenerationResult => {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.HIGH)
  const size = qr.size
  const cubeGrid: CubeGrid3d = Array.from({ length: size }, () =>
    Array.from({ length: size }, () =>
      Array.from({ length: size }, () => new CubeNode())
    )
  )

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isModuleFilled = qr.getModule(x, y)
      if (!isModuleFilled) {
        for (let z = 0; z < size; z++) {
          cubeGrid[x][y][z].clearX()
        }
      }
      //data[y * size + x] = isModuleFilled ? 1 : 0
    }
  }

  const voxelGrid = cubeGridToVoxelGrid(cubeGrid)
  const voxelSizeMm = 1
  const stlBytes = gridToBinaryStl(voxelGrid, voxelSizeMm)

  return { width: size, height: size, cubeGrid, stlBytes }
}
