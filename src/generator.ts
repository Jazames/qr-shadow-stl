import { qrcodegen } from './vendor/nayuki/qrcodegen.js'
import { gridToBinaryStl } from './stl/stlGenerator.js'
import { DEFAULT_RESOLUTION } from './stl/stlGenerator.js'
import type { VoxelGrid3d } from './stl/stlGenerator.js'
import { CubeNode } from './voxel/cubeNode.js'

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

const isActiveNode = (node: CubeNode): boolean => {
  return node.isSolid || node.hasSurfacesNormalToX || node.hasSurfacesNormalToY || node.hasSurfacesNormalToZ
}

const hasAnySurfaces = (node: CubeNode): boolean => {
  return node.hasSurfacesNormalToX || node.hasSurfacesNormalToY || node.hasSurfacesNormalToZ
}

const areConnected = (nodeA: CubeNode, nodeB: CubeNode, axis: 'x' | 'y' | 'z'): boolean => {
  const hasXSurfaceA = nodeA.hasSurfacesNormalToX || nodeA.isSolid
  const hasYSurfaceA = nodeA.hasSurfacesNormalToY || nodeA.isSolid
  const hasZSurfaceA = nodeA.hasSurfacesNormalToZ || nodeA.isSolid
  const hasXSurfaceB = nodeB.hasSurfacesNormalToX || nodeB.isSolid
  const hasYSurfaceB = nodeB.hasSurfacesNormalToY || nodeB.isSolid
  const hasZSurfaceB = nodeB.hasSurfacesNormalToZ || nodeB.isSolid

  switch (axis) {
    case 'x':
      return (hasYSurfaceA && hasYSurfaceB) || (hasZSurfaceA && hasZSurfaceB)
    case 'y':
      return (hasXSurfaceA && hasXSurfaceB) || (hasZSurfaceA && hasZSurfaceB)
    case 'z':
      return (hasXSurfaceA && hasXSurfaceB) || (hasYSurfaceA && hasYSurfaceB)
    default:
      return false
  }
}

const connectSets = (sets: Array<Set<CubeNode>>, nodeA: CubeNode, nodeB: CubeNode): Array<Set<CubeNode>> => {
  const newSets: Array<Set<CubeNode>> = []
  
  // If no sets exist yet, create the first set
  if (sets.length === 0) {
    newSets.push(new Set<CubeNode>([nodeA, nodeB]))
    return newSets
  }

  // Check existing sets for membership, and merge as needed
  let foundA = false
  let foundB = false
  for (let i = 0; i < sets.length; i++) {
    const setA = sets[i]
    if (setA.has(nodeA)) {
      foundA = true
      for (let j = 0; j < sets.length; j++) {
        if (i != j && sets[j].has(nodeB)) {
          foundB = true
          const mergedSet = new Set<CubeNode>([...setA, ...sets[j]])
          newSets.push(mergedSet)
        }
      }
    }
  }

  // Neither node found in existing sets, create a new set
  if (!foundA && !foundB) {
    newSets.push(new Set<CubeNode>([nodeA, nodeB]))
  }

  // Node A found, Node B not found - add B to A's set
  if (foundA && !foundB) {
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]
      if (set.has(nodeA)) {
        set.add(nodeB)
        newSets.push(set)
      }
    }
  }
  
  // Node B found, Node A not found - add A to B's set
  if (!foundA && foundB) {
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]
      if (set.has(nodeB)) {
        set.add(nodeA)
        newSets.push(set)
      }
    }
  }

  // Need to add in other sets that were not involved in the merge
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]
    if (!set.has(nodeA) && !set.has(nodeB)) {
      newSets.push(set)
    }
  }
  return newSets
}



export const trimFloatingVoxels = (cubeGrid: CubeGrid3d): void => {
  const sizeX = cubeGrid.length
  const sizeY = sizeX > 0 ? cubeGrid[0].length : 0
  const sizeZ = sizeY > 0 ? cubeGrid[0][0].length : 0

  let sets: Array<Set<CubeNode>> = []

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        const node = cubeGrid[x][y][z]
        const nodePlusX = x + 1 < sizeX ? cubeGrid[x + 1][y][z] : null
        const nodeMinusX = x - 1 >= 0 ? cubeGrid[x - 1][y][z] : null 
        const nodePlusY = y + 1 < sizeY ? cubeGrid[x][y + 1][z] : null
        const nodeMinusY = y - 1 >= 0 ? cubeGrid[x][y - 1][z] : null
        const nodePlusZ = z + 1 < sizeZ ? cubeGrid[x][y][z + 1] : null
        const nodeMinusZ = z - 1 >= 0 ? cubeGrid[x][y][z - 1] : null

        if (nodePlusX && areConnected(node, nodePlusX, 'x')) {
          sets = connectSets(sets, node, nodePlusX)
        }
        if (nodeMinusX && areConnected(node, nodeMinusX, 'x')) {
          sets = connectSets(sets, node, nodeMinusX)
        }

        if (nodePlusY && areConnected(node, nodePlusY, 'y')) {
          sets = connectSets(sets, node, nodePlusY)
        }
        if (nodeMinusY && areConnected(node, nodeMinusY, 'y')) {
          sets = connectSets(sets, node, nodeMinusY)
        }

        if (nodePlusZ && areConnected(node, nodePlusZ, 'z')) {
          sets = connectSets(sets, node, nodePlusZ)
        }
        if (nodeMinusZ && areConnected(node, nodeMinusZ, 'z')) {
          sets = connectSets(sets, node, nodeMinusZ)
        }

        // If it's a floating node we'll put it in its own set
        if (hasAnySurfaces(node)) {
          let found = false
          for (const set of sets) {
            if (set.has(node)) {
              found = true
              break
            }
          }
          if (!found) {
            sets.push(new Set<CubeNode>([node]))
          }
        }
      }
    }
  }

  // Identify the largest connected component
  let largestSet: Set<CubeNode> | null = null
  for (const set of sets) {
    //console.log(`Connected component size: ${set.size}`)
    if (!largestSet || set.size > largestSet.size) {
      largestSet = set
    }
  }
  
  // Clear all nodes not in the largest connected component
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        const node = cubeGrid[x][y][z]
        if (isActiveNode(node) && (!largestSet || !largestSet.has(node))) {
          node.clearAll()
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
  trimFloatingVoxels(cubeGrid)

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
