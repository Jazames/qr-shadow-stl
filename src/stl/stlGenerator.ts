export type Triangle = {
  v1: [number, number, number]
  v2: [number, number, number]
  v3: [number, number, number]
}

export type VoxelGrid3d = {
  sizeX: number
  sizeY: number
  sizeZ: number
  // The 0 bit indicates the center voxel is solid; 1 means filled, 0 means empty.
  // The 1 bit is whether the voxel has faces normal to the x-axis that allow passthrough. 1 means there are faces, 0 means no faces normal to x-axis.
  // The 2 bit is whether the voxel has faces normal to the y-axis that allow passthrough. 1 means there are faces, 0 means no faces normal to y-axis.
  // The 3 bit is whether the voxel has faces normal to the z-axis that allow passthrough. 1 means there are faces, 0 means no faces normal to z-axis.
  data: Uint8Array
}

export const DEFAULT_RESOLUTION = 1000
export const DEFAULT_WALL_THICKNESS_VOXELS = 10

const isOutOfBounds = (grid: VoxelGrid3d, x: number, y: number, z: number): boolean => {
  return x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ
}

const hasXSurface = (grid: VoxelGrid3d, x: number, y: number, z: number): boolean => {
  if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
    return false
  }
  return (grid.data[x + grid.sizeX * (y + grid.sizeY * z)] & 0x02) === 0x02
}

const hasYSurface = (grid: VoxelGrid3d, x: number, y: number, z: number): boolean => {
  if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
    return false
  }
  return (grid.data[x + grid.sizeX * (y + grid.sizeY * z)] & 0x04) === 0x04
}

const hasZSurface = (grid: VoxelGrid3d, x: number, y: number, z: number): boolean => {
  if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
    return false
  }
  return (grid.data[x + grid.sizeX * (y + grid.sizeY * z)] & 0x08) === 0x08
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


const addPosXFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  const hasX = hasXSurface(grid, x, y, z)
  const hasY = hasYSurface(grid, x, y, z)
  const hasZ = hasZSurface(grid, x, y, z)
  const neighborHasXSurface = hasXSurface(grid, x + 1, y, z)
  const neighborOutOfBounds = isOutOfBounds(grid, x + 1, y, z)


  //const x0 = x * resolution
  const x1 = (x * resolution) + resolution
  const y0 = y * resolution
  const y1 = (y * resolution) + resolution
  const z0 = z * resolution
  const z1 = (z * resolution) + resolution
  //const innerX0 = x0 + wallThicknessVoxels
  const innerX1 = x1 - wallThicknessVoxels
  const innerY0 = y0 + wallThicknessVoxels
  const innerY1 = y1 - wallThicknessVoxels
  const innerZ0 = z0 + wallThicknessVoxels
  const innerZ1 = z1 - wallThicknessVoxels


  //Solid cube
  if (hasX && hasY && hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x1, y0, z1]
      )
      return;
    }
    if (!neighborHasXSurface)
    {
      // Small outer face
      addFace(
        tris,
        [x1, innerY0, innerZ0],
        [x1, innerY1, innerZ0],
        [x1, innerY1, innerZ1],
        [x1, innerY0, innerZ1]
      )
    }
    return;
  }


  if (hasX) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x1, y0, z1]
      )
    }
    if (!neighborHasXSurface)
    {
      //Small outer face
      addFace(
        tris,
        [x1, innerY0, innerZ0],
        [x1, innerY1, innerZ0],
        [x1, innerY1, innerZ1],
        [x1, innerY0, innerZ1]
      )
    }

    //Inner faces

    //Small inner face
    addFace(
      tris,
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY1, innerZ0],
      [innerX1, innerY0, innerZ0]
    )

  } else {
    //Case where hasX is false
    if (neighborOutOfBounds) {
      //Outer wireframe faces
      addFace(
        tris,
        [x1, y1, z1],
        [x1, y0, z1],
        [x1, innerY0, innerZ1],
        [x1, innerY1, innerZ1]
      )
      addFace(
        tris,
        [x1, y1, z1],
        [x1, innerY1, innerZ1],
        [x1, innerY1, innerZ0],
        [x1, y1, z0]
      )
      addFace(
        tris,
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, innerY1, innerZ0],
        [x1, innerY0, innerZ0]
      )
      addFace(
        tris,
        [x1, y0, z0],
        [x1, innerY0, innerZ0],
        [x1, innerY0, innerZ1],
        [x1, y0, z1]
      )
    }

    //Inner faces

    addFace(
      tris,
      [innerX1, innerY0, innerZ0],
      [x1, innerY0, innerZ0],
      [x1, innerY1, innerZ0],
      [innerX1, innerY1, innerZ0]
    )
    addFace(
      tris,
      [innerX1, innerY0, innerZ0],
      [innerX1, innerY0, innerZ1],
      [x1, innerY0, innerZ1],
      [x1, innerY0, innerZ0]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [x1, innerY1, innerZ1],
      [x1, innerY0, innerZ1],
      [innerX1, innerY0, innerZ1]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY1, innerZ0],
      [x1, innerY1, innerZ0],
      [x1, innerY1, innerZ1]
    )
  }

  if (!hasY) {
    addFace(
      tris,
      [innerX1, y0, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY0, innerZ0],
      [innerX1, y0, innerZ0]
    )

    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [innerX1, y1, innerZ1],
      [innerX1, y1, innerZ0],
      [innerX1, innerY1, innerZ0]
    )
  }

  if (!hasZ) {
    addFace(
      tris,
      [innerX1, innerY0, z0],
      [innerX1, innerY1, z0],
      [innerX1, innerY1, innerZ0],
      [innerX1, innerY0, innerZ0]
    )

    addFace(
      tris,
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY1, z1],
      [innerX1, innerY0, z1]
    )
  }
}

const addNegXFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  const hasX = hasXSurface(grid, x, y, z)
  const hasY = hasYSurface(grid, x, y, z)
  const hasZ = hasZSurface(grid, x, y, z)
  const neighborHasXSurface = hasXSurface(grid, x - 1, y, z)
  const neighborOutOfBounds = isOutOfBounds(grid, x - 1, y, z)

  const x0 = x * resolution
  //const x1 = (x * resolution) + resolution
  const y0 = y * resolution
  const y1 = (y * resolution) + resolution
  const z0 = z * resolution
  const z1 = (z * resolution) + resolution
  const innerX0 = x0 + wallThicknessVoxels
  const innerY0 = y0 + wallThicknessVoxels
  const innerY1 = y1 - wallThicknessVoxels
  const innerZ0 = z0 + wallThicknessVoxels
  const innerZ1 = z1 - wallThicknessVoxels

  //Solid cube
  if (hasX && hasY && hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y1, z0]
      )
      return
    }
    if (!neighborHasXSurface)
    {
      // Small outer face
      addFace(
        tris,
        [x0, innerY0, innerZ0],
        [x0, innerY0, innerZ1],
        [x0, innerY1, innerZ1],
        [x0, innerY1, innerZ0]
      )
    }
    return
  }

  if (hasX) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y1, z0]
      )
    }
    if (!neighborHasXSurface)
    {
      //Small outer face
      addFace(
        tris,
        [x0, innerY0, innerZ0],
        [x0, innerY0, innerZ1],
        [x0, innerY1, innerZ1],
        [x0, innerY1, innerZ0]
      )
    }

    //Inner faces

    //Small inner face
    addFace(
      tris,
      [innerX0, innerY1, innerZ0],
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ0]
    )

  } else {
    //Case where hasX is false
    if (neighborOutOfBounds) {
      //Outer wireframe faces
      addFace(
        tris,
        [x0, y1, z1],
        [x0, innerY1, innerZ1],
        [x0, innerY0, innerZ1],
        [x0, y0, z1]
      )
      addFace(
        tris,
        [x0, y1, z1],
        [x0, y1, z0],
        [x0, innerY1, innerZ0],
        [x0, innerY1, innerZ1]
      )
      addFace(
        tris,
        [x0, y0, z0],
        [x0, innerY0, innerZ0],
        [x0, innerY1, innerZ0],
        [x0, y1, z0]
      )
      addFace(
        tris,
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, innerY0, innerZ1],
        [x0, innerY0, innerZ0]
      )
    }

    //Inner faces

    addFace(
      tris,
      [innerX0, innerY0, innerZ0],
      [x0, innerY0, innerZ0],
      [x0, innerY1, innerZ0],
      [innerX0, innerY1, innerZ0]
    )
    addFace(
      tris,
      [innerX0, innerY0, innerZ0],
      [innerX0, innerY0, innerZ1],
      [x0, innerY0, innerZ1],
      [x0, innerY0, innerZ0]
    )
    addFace(
      tris,
      [innerX0, innerY1, innerZ1],
      [x0, innerY1, innerZ1],
      [x0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ1]
    )
    addFace(
      tris,
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY1, innerZ0],
      [x0, innerY1, innerZ0],
      [x0, innerY1, innerZ1]
    )
  }

  if (!hasY) {
    addFace(
      tris,
      [innerX0, y0, innerZ1],
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ0],
      [innerX0, y0, innerZ0]
    )

    addFace(
      tris,
      [innerX0, innerY1, innerZ1],
      [innerX0, y1, innerZ1],
      [innerX0, y1, innerZ0],
      [innerX0, innerY1, innerZ0]
    )
  }

  if (!hasZ) {
    addFace(
      tris,
      [innerX0, innerY0, z0],
      [innerX0, innerY1, z0],
      [innerX0, innerY1, innerZ0],
      [innerX0, innerY0, innerZ0]
    )

    addFace(
      tris,
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY1, z1],
      [innerX0, innerY0, z1]
    )
  }
}

const addPosYFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  const hasX = hasXSurface(grid, x, y, z)
  const hasY = hasYSurface(grid, x, y, z)
  const hasZ = hasZSurface(grid, x, y, z)
  const neighborHasYSurface = hasYSurface(grid, x, y + 1, z)
  const neighborOutOfBounds = isOutOfBounds(grid, x, y + 1, z)

  const x0 = x * resolution
  const x1 = (x * resolution) + resolution
  //const y0 = y * resolution
  const y1 = (y * resolution) + resolution
  const z0 = z * resolution
  const z1 = (z * resolution) + resolution
  const innerX0 = x0 + wallThicknessVoxels
  const innerX1 = x1 - wallThicknessVoxels
  //const innerY0 = y0 + wallThicknessVoxels
  const innerY1 = y1 - wallThicknessVoxels
  const innerZ0 = z0 + wallThicknessVoxels
  const innerZ1 = z1 - wallThicknessVoxels

  //Solid cube
  if (hasX && hasY && hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y1, z0],
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0]
      )
      return
    }
    if (!neighborHasYSurface)
    {
      // Small outer face
      addFace(
        tris,
        [innerX0, y1, innerZ0],
        [innerX0, y1, innerZ1],
        [innerX1, y1, innerZ1],
        [innerX1, y1, innerZ0]
      )
    }
    return
  }

  if (hasY) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y1, z0],
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0]
      )
    }
    if (!neighborHasYSurface)
    {
      //Small outer face
      addFace(
        tris,
        [innerX0, y1, innerZ0],
        [innerX0, y1, innerZ1],
        [innerX1, y1, innerZ1],
        [innerX1, y1, innerZ0]
      )
    }

    //Inner faces

    //Small inner face
    addFace(
      tris,
      [innerX1, innerY1, innerZ0],
      [innerX1, innerY1, innerZ1],
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY1, innerZ0]
    )

  } else {
    //Case where hasY is false
    if (neighborOutOfBounds) {
      //Outer wireframe faces
      addFace(
        tris,
        [x1, y1, z1],
        [innerX1, y1, innerZ1],
        [innerX0, y1, innerZ1],
        [x0, y1, z1]
      )
      addFace(
        tris,
        [x1, y1, z1],
        [x1, y1, z0],
        [innerX1, y1, innerZ0],
        [innerX1, y1, innerZ1]
      )
      addFace(
        tris,
        [x0, y1, z0],
        [innerX0, y1, innerZ0],
        [innerX1, y1, innerZ0],
        [x1, y1, z0]
      )
      addFace(
        tris,
        [x0, y1, z0],
        [x0, y1, z1],
        [innerX0, y1, innerZ1],
        [innerX0, y1, innerZ0]
      )
    }

    //Inner faces

    addFace(
      tris,
      [innerX0, innerY1, innerZ0],
      [innerX0, y1, innerZ0],
      [innerX1, y1, innerZ0],
      [innerX1, innerY1, innerZ0]
    )
    addFace(
      tris,
      [innerX0, innerY1, innerZ0],
      [innerX0, innerY1, innerZ1],
      [innerX0, y1, innerZ1],
      [innerX0, y1, innerZ0]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [innerX1, y1, innerZ1],
      [innerX0, y1, innerZ1],
      [innerX0, innerY1, innerZ1]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY1, innerZ0],
      [innerX1, y1, innerZ0],
      [innerX1, y1, innerZ1]
    )
  }

  if (!hasX) {
    addFace(
      tris,
      [x0, innerY1, innerZ1],
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY1, innerZ0],
      [x0, innerY1, innerZ0]
    )

    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [x1, innerY1, innerZ1],
      [x1, innerY1, innerZ0],
      [innerX1, innerY1, innerZ0]
    )
  }

  if (!hasZ) {
    addFace(
      tris,
      [innerX0, innerY1, z0],
      [innerX1, innerY1, z0],
      [innerX1, innerY1, innerZ0],
      [innerX0, innerY1, innerZ0]
    )

    addFace(
      tris,
      [innerX0, innerY1, innerZ1],
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY1, z1],
      [innerX0, innerY1, z1]
    )
  }
}

const addNegYFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  const hasX = hasXSurface(grid, x, y, z)
  const hasY = hasYSurface(grid, x, y, z)
  const hasZ = hasZSurface(grid, x, y, z)
  const neighborHasYSurface = hasYSurface(grid, x, y - 1, z)
  const neighborOutOfBounds = isOutOfBounds(grid, x, y - 1, z)

  const x0 = x * resolution
  const x1 = (x * resolution) + resolution
  const y0 = y * resolution
  //const y1 = (y * resolution) + resolution
  const z0 = z * resolution
  const z1 = (z * resolution) + resolution
  const innerX0 = x0 + wallThicknessVoxels
  const innerX1 = x1 - wallThicknessVoxels
  const innerY0 = y0 + wallThicknessVoxels
  //const innerY1 = y1 - wallThicknessVoxels
  const innerZ0 = z0 + wallThicknessVoxels
  const innerZ1 = z1 - wallThicknessVoxels

  //Solid cube
  if (hasX && hasY && hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1]
      )
      return
    }
    if (!neighborHasYSurface)
    {
      // Small outer face
      addFace(
        tris,
        [innerX0, y0, innerZ0],
        [innerX1, y0, innerZ0],
        [innerX1, y0, innerZ1],
        [innerX0, y0, innerZ1]
      )
    }
    return
  }

  if (hasY) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1]
      )
    }
    if (!neighborHasYSurface)
    {
      //Small outer face
      addFace(
        tris,
        [innerX0, y0, innerZ0],
        [innerX1, y0, innerZ0],
        [innerX1, y0, innerZ1],
        [innerX0, y0, innerZ1]
      )
    }

    //Inner faces

    //Small inner face
    addFace(
      tris,
      [innerX0, innerY0, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY0, innerZ0],
      [innerX0, innerY0, innerZ0]
    )

  } else {
    //Case where hasY is false
    if (neighborOutOfBounds) {
      //Outer wireframe faces
      addFace(
        tris,
        [x1, y0, z1],
        [x0, y0, z1],
        [innerX0, y0, innerZ1],
        [innerX1, y0, innerZ1]
      )
      addFace(
        tris,
        [x1, y0, z1],
        [innerX1, y0, innerZ1],
        [innerX1, y0, innerZ0],
        [x1, y0, z0]
      )
      addFace(
        tris,
        [x0, y0, z0],
        [x1, y0, z0],
        [innerX1, y0, innerZ0],
        [innerX0, y0, innerZ0]
      )
      addFace(
        tris,
        [x0, y0, z0],
        [innerX0, y0, innerZ0],
        [innerX0, y0, innerZ1],
        [x0, y0, z1]
      )
    }

    //Inner faces

    addFace(
      tris,
      [innerX0, y0, innerZ0],
      [innerX0, innerY0, innerZ0],
      [innerX1, innerY0, innerZ0],
      [innerX1, y0, innerZ0]
    )
    addFace(
      tris,
      [innerX0, y0, innerZ0],
      [innerX0, y0, innerZ1],
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ0]
    )
    addFace(
      tris,
      [innerX1, y0, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX0, innerY0, innerZ1],
      [innerX0, y0, innerZ1]
    )
    addFace(
      tris,
      [innerX1, y0, innerZ1],
      [innerX1, y0, innerZ0],
      [innerX1, innerY0, innerZ0],
      [innerX1, innerY0, innerZ1]
    )
  }

  if (!hasX) {
    addFace(
      tris,
      [x0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ0],
      [x0, innerY0, innerZ0]
    )

    addFace(
      tris,
      [innerX1, innerY0, innerZ1],
      [x1, innerY0, innerZ1],
      [x1, innerY0, innerZ0],
      [innerX1, innerY0, innerZ0]
    )
  }

  if (!hasZ) {
    addFace(
      tris,
      [innerX0, innerY0, z0],
      [innerX1, innerY0, z0],
      [innerX1, innerY0, innerZ0],
      [innerX0, innerY0, innerZ0]
    )

    addFace(
      tris,
      [innerX0, innerY0, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY0, z1],
      [innerX0, innerY0, z1]
    )
  }
}

const addPosZFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  const hasX = hasXSurface(grid, x, y, z)
  const hasY = hasYSurface(grid, x, y, z)
  const hasZ = hasZSurface(grid, x, y, z)
  const neighborHasZSurface = hasZSurface(grid, x, y, z + 1)
  const neighborOutOfBounds = isOutOfBounds(grid, x, y, z + 1)

  const x0 = x * resolution
  const x1 = (x * resolution) + resolution
  const y0 = y * resolution
  const y1 = (y * resolution) + resolution
  //const z0 = z * resolution
  const z1 = (z * resolution) + resolution
  const innerX0 = x0 + wallThicknessVoxels
  const innerX1 = x1 - wallThicknessVoxels
  const innerY0 = y0 + wallThicknessVoxels
  const innerY1 = y1 - wallThicknessVoxels
  //const innerZ0 = z0 + wallThicknessVoxels
  const innerZ1 = z1 - wallThicknessVoxels

  //Solid cube
  if (hasX && hasY && hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1]
      )
      return
    }
    if (!neighborHasZSurface)
    {
      // Small outer face
      addFace(
        tris,
        [innerX0, innerY0, z1],
        [innerX1, innerY0, z1],
        [innerX1, innerY1, z1],
        [innerX0, innerY1, z1]
      )
    }
    return
  }

  if (hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1]
      )
    }
    if (!neighborHasZSurface)
    {
      //Small outer face
      addFace(
        tris,
        [innerX0, innerY0, z1],
        [innerX1, innerY0, z1],
        [innerX1, innerY1, z1],
        [innerX0, innerY1, z1]
      )
    }

    //Inner faces

    //Small inner face
    addFace(
      tris,
      [innerX0, innerY1, innerZ1],
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX0, innerY0, innerZ1]
    )

  } else {
    //Case where hasZ is false
    if (neighborOutOfBounds) {
      //Outer wireframe faces
      addFace(
        tris,
        [x1, y1, z1],
        [x0, y1, z1],
        [innerX0, innerY1, z1],
        [innerX1, innerY1, z1]
      )
      addFace(
        tris,
        [x1, y1, z1],
        [innerX1, innerY1, z1],
        [innerX1, innerY0, z1],
        [x1, y0, z1]
      )
      addFace(
        tris,
        [x0, y0, z1],
        [x1, y0, z1],
        [innerX1, innerY0, z1],
        [innerX0, innerY0, z1]
      )
      addFace(
        tris,
        [x0, y0, z1],
        [innerX0, innerY0, z1],
        [innerX0, innerY1, z1],
        [x0, y1, z1]
      )
    }

    //Inner faces

    addFace(
      tris,
      [innerX0, innerY0, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY0, z1],
      [innerX0, innerY0, z1]
    )
    addFace(
      tris,
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY1, z1],
      [innerX0, innerY0, z1]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [innerX0, innerY1, innerZ1],
      [innerX0, innerY1, z1],
      [innerX1, innerY1, z1]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX1, innerY0, z1],
      [innerX1, innerY1, z1]
    )
  }

  if (!hasX) {
    addFace(
      tris,
      [x0, innerY0, innerZ1],
      [innerX0, innerY0, innerZ1],
      [innerX0, innerY1, innerZ1],
      [x0, innerY1, innerZ1]
    )

    addFace(
      tris,
      [innerX1, innerY0, innerZ1],
      [x1, innerY0, innerZ1],
      [x1, innerY1, innerZ1],
      [innerX1, innerY1, innerZ1]
    )
  }

  if (!hasY) {
    addFace(
      tris,
      [innerX0, y0, innerZ1],
      [innerX1, y0, innerZ1],
      [innerX1, innerY0, innerZ1],
      [innerX0, innerY0, innerZ1]
    )

    addFace(
      tris,
      [innerX0, innerY1, innerZ1],
      [innerX1, innerY1, innerZ1],
      [innerX1, y1, innerZ1],
      [innerX0, y1, innerZ1]
    )
  }
}

const addNegZFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  const hasX = hasXSurface(grid, x, y, z)
  const hasY = hasYSurface(grid, x, y, z)
  const hasZ = hasZSurface(grid, x, y, z)
  const neighborHasZSurface = hasZSurface(grid, x, y, z - 1)
  const neighborOutOfBounds = isOutOfBounds(grid, x, y, z - 1)

  const x0 = x * resolution
  const x1 = (x * resolution) + resolution
  const y0 = y * resolution
  const y1 = (y * resolution) + resolution
  const z0 = z * resolution
  //const z1 = (z * resolution) + resolution
  const innerX0 = x0 + wallThicknessVoxels
  const innerX1 = x1 - wallThicknessVoxels
  const innerY0 = y0 + wallThicknessVoxels
  const innerY1 = y1 - wallThicknessVoxels
  const innerZ0 = z0 + wallThicknessVoxels
  //const innerZ1 = z1 - wallThicknessVoxels

  //Solid cube
  if (hasX && hasY && hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y0, z0]
      )
      return
    }
    if (!neighborHasZSurface)
    {
      // Small outer face
      addFace(
        tris,
        [innerX0, innerY0, z0],
        [innerX0, innerY1, z0],
        [innerX1, innerY1, z0],
        [innerX1, innerY0, z0]
      )
    }
    return
  }

  if (hasZ) {
    if (neighborOutOfBounds) {
      //Full Outer face
      addFace(
        tris,
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y0, z0]
      )
    }
    if (!neighborHasZSurface)
    {
      //Small outer face
      addFace(
        tris,
        [innerX0, innerY0, z0],
        [innerX0, innerY1, z0],
        [innerX1, innerY1, z0],
        [innerX1, innerY0, z0]
      )
    }

    //Inner faces

    //Small inner face
    addFace(
      tris,
      [innerX1, innerY0, innerZ0],
      [innerX1, innerY1, innerZ0],
      [innerX0, innerY1, innerZ0],
      [innerX0, innerY0, innerZ0]
    )

  } else {
    //Case where hasZ is false
    if (neighborOutOfBounds) {
      //Outer wireframe faces
      addFace(
        tris,
        [x1, y1, z0],
        [innerX1, innerY1, z0],
        [innerX0, innerY1, z0],
        [x0, y1, z0]
      )
      addFace(
        tris,
        [x1, y1, z0],
        [x1, y0, z0],
        [innerX1, innerY0, z0],
        [innerX1, innerY1, z0]
      )
      addFace(
        tris,
        [x0, y0, z0],
        [innerX0, innerY0, z0],
        [innerX1, innerY0, z0],
        [x1, y0, z0]
      )
      addFace(
        tris,
        [x0, y0, z0],
        [x0, y1, z0],
        [innerX0, innerY1, z0],
        [innerX0, innerY0, z0]
      )
    }

    //Inner faces

    addFace(
      tris,
      [innerX0, innerY0, innerZ0],
      [innerX1, innerY0, innerZ0],
      [innerX1, innerY0, z0],
      [innerX0, innerY0, z0]
    )
    addFace(
      tris,
      [innerX0, innerY0, innerZ0],
      [innerX0, innerY1, innerZ0],
      [innerX0, innerY1, z0],
      [innerX0, innerY0, z0]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ0],
      [innerX0, innerY1, innerZ0],
      [innerX0, innerY1, z0],
      [innerX1, innerY1, z0]
    )
    addFace(
      tris,
      [innerX1, innerY1, innerZ0],
      [innerX1, innerY0, innerZ0],
      [innerX1, innerY0, z0],
      [innerX1, innerY1, z0]
    )
  }

  if (!hasX) {
    addFace(
      tris,
      [x0, innerY0, innerZ0],
      [innerX0, innerY0, innerZ0],
      [innerX0, innerY1, innerZ0],
      [x0, innerY1, innerZ0]
    )

    addFace(
      tris,
      [innerX1, innerY0, innerZ0],
      [x1, innerY0, innerZ0],
      [x1, innerY1, innerZ0],
      [innerX1, innerY1, innerZ0]
    )
  }

  if (!hasY) {
    addFace(
      tris,
      [innerX0, y0, innerZ0],
      [innerX1, y0, innerZ0],
      [innerX1, innerY0, innerZ0],
      [innerX0, innerY0, innerZ0]
    )

    addFace(
      tris,
      [innerX0, innerY1, innerZ0],
      [innerX1, innerY1, innerZ0],
      [innerX1, y1, innerZ0],
      [innerX0, y1, innerZ0]
    )
  }
}


const addFaces = (  
  tris: Triangle[],
  grid: VoxelGrid3d,
  x: number,
  y: number,
  z: number,
  resolution: number,
  wallThicknessVoxels: number
): void => {
  addPosXFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
  addNegXFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
  addPosYFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
  addNegYFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
  addPosZFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
  addNegZFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
}

export const surfaceExtract = (
  grid: VoxelGrid3d,
  resolution: number = DEFAULT_RESOLUTION,
  wallThicknessVoxels: number = DEFAULT_WALL_THICKNESS_VOXELS
): Triangle[] => {
  const tris: Triangle[] = []

  for (let z = 0; z < grid.sizeZ; z++) {
    for (let y = 0; y < grid.sizeY; y++) {
      for (let x = 0; x < grid.sizeX; x++) {
        addFaces(tris, grid, x, y, z, resolution, wallThicknessVoxels)
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
    view.setFloat32(offset + 0, v[0] * voxelSizeMm, true)
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

export const gridToBinaryStl = (
  grid: VoxelGrid3d,
  voxelSizeMm: number,
  resolution: number = DEFAULT_RESOLUTION,
  wallThicknessVoxels: number = DEFAULT_WALL_THICKNESS_VOXELS
): Uint8Array => {
  const tris = surfaceExtract(grid, resolution, wallThicknessVoxels)
  return writeBinaryStl(tris, voxelSizeMm)
}
