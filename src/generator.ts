import { qrcodegen } from './vendor/nayuki/qrcodegen'
import { gridToBinaryStl } from './stl/stlGenerator'
import { DEFAULT_RESOLUTION } from './stl/stlGenerator'
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

export type QrGenerationOptions = {
  frontText: string
  rightText?: string
  topText?: string
  resolution?: number
  wallThicknessVoxels?: number
  expectedSizeMm?: number
}

const DEFAULT_VOXEL_SIZE_MM = 1
const DEFAULT_WALL_THICKNESS = 30

type QrPayload = {
  qr: qrcodegen.QrCode
  size: number
}

const encodeQr = (text?: string): QrPayload | null => {
  const trimmed = text?.trim()
  if (!trimmed) {
    return null
  }
  const qr = qrcodegen.QrCode.encodeText(trimmed, qrcodegen.QrCode.Ecc.HIGH)
  return { qr, size: qr.size }
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

const resolveQrSize = (payloads: Array<QrPayload | null>): number => {
  const sizes = payloads.filter((payload): payload is QrPayload => payload !== null).map((payload) => payload.size)
  if (sizes.length === 0) {
    throw new Error('At least one QR input is required.')
  }
  const first = sizes[0]
  if (sizes.some((size) => size !== first)) {
    throw new Error('All QR inputs must resolve to the same module size.')
  }
  return first
}

const carveAlongX = (cubeGrid: CubeGrid3d, qr: qrcodegen.QrCode, size: number): void => {
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      if (!qr.getModule(y, z)) {
        for (let x = 0; x < size; x++) {
          cubeGrid[x][y][z].clearX()
        }
      }
    }
  }
}

const carveAlongY = (cubeGrid: CubeGrid3d, qr: qrcodegen.QrCode, size: number): void => {
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      if (!qr.getModule(x, z)) {
        for (let y = 0; y < size; y++) {
          cubeGrid[x][y][z].clearY()
        }
      }
    }
  }
}

const carveAlongZ = (cubeGrid: CubeGrid3d, qr: qrcodegen.QrCode, size: number): void => {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!qr.getModule(x, y)) {
        for (let z = 0; z < size; z++) {
          cubeGrid[x][y][z].clearZ()
        }
      }
    }
  }
}

export const generateQrGrid = (options: QrGenerationOptions): QrGenerationResult => {
  const frontPayload = encodeQr(options.frontText)
  const rightPayload = encodeQr(options.rightText)
  const topPayload = encodeQr(options.topText)
  const size = resolveQrSize([frontPayload, rightPayload, topPayload])
  const cubeGrid: CubeGrid3d = Array.from({ length: size }, () =>
    Array.from({ length: size }, () =>
      Array.from({ length: size }, () => new CubeNode())
    )
  )

  if (frontPayload) {
    carveAlongZ(cubeGrid, frontPayload.qr, size)
  }
  if (rightPayload) {
    carveAlongX(cubeGrid, rightPayload.qr, size)
  }
  if (topPayload) {
    carveAlongY(cubeGrid, topPayload.qr, size)
  }

  // Trim floating voxels

  const voxelGrid = cubeGridToVoxelGrid(cubeGrid)
  const resolution = options.resolution ?? DEFAULT_RESOLUTION
  const wallThicknessVoxels = options.wallThicknessVoxels ?? DEFAULT_WALL_THICKNESS
  const targetSizeMm = options.expectedSizeMm
  const voxelSizeMm = targetSizeMm && targetSizeMm > 0
    ? targetSizeMm / (size * resolution)
    : DEFAULT_VOXEL_SIZE_MM
  const stlBytes = gridToBinaryStl(voxelGrid, voxelSizeMm, resolution, wallThicknessVoxels)

  return { width: size, height: size, cubeGrid, stlBytes }
}
