const resolution = 1000;
const wallThicknessVoxels = 10;
const isSolid = (grid, x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
        return false;
    }
    const idx = x + grid.sizeX * (y + grid.sizeY * z);
    return (grid.data[idx] & 0x01) === 0x01;
};
const isEmpty = (grid, x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
        return true;
    }
    const idx = x + grid.sizeX * (y + grid.sizeY * z);
    return (grid.data[idx] & 0x0F) === 0;
};
const hasXSurface = (grid, x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
        return false;
    }
    return (grid.data[x + grid.sizeX * (y + grid.sizeY * z)] & 0x02) === 0x02;
};
const hasYSurface = (grid, x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
        return false;
    }
    return (grid.data[x + grid.sizeX * (y + grid.sizeY * z)] & 0x04) === 0x04;
};
const hasZSurface = (grid, x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= grid.sizeX || y >= grid.sizeY || z >= grid.sizeZ) {
        return false;
    }
    return (grid.data[x + grid.sizeX * (y + grid.sizeY * z)] & 0x08) === 0x08;
};
const addFace = (tris, p0, p1, p2, p3) => {
    tris.push({ v1: p0, v2: p1, v3: p2 });
    tris.push({ v1: p0, v2: p2, v3: p3 });
};
export const surfaceExtract = (grid) => {
    const tris = [];
    for (let z = 0; z < grid.sizeZ; z++) {
        for (let y = 0; y < grid.sizeY; y++) {
            for (let x = 0; x < grid.sizeX; x++) {
                if (!isSolid(grid, x, y, z)) { //TODO: revert to isEmpty
                    continue;
                }
                // Handle any needed shared surfaces
                const x0 = x * resolution;
                const x1 = (x * resolution) + resolution;
                const y0 = y * resolution;
                const y1 = (y * resolution) + resolution;
                const z0 = z * resolution;
                const z1 = (z * resolution) + resolution;
                if (isEmpty(grid, x + 1, y, z) && hasXSurface(grid, x, y, z)) {
                    addFace(tris, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
                }
                if (isEmpty(grid, x - 1, y, z) && hasXSurface(grid, x, y, z)) {
                    addFace(tris, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
                }
                if (!hasYSurface(grid, x, y + 1, z) && hasYSurface(grid, x, y, z)) {
                    addFace(tris, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
                }
                if (!hasYSurface(grid, x, y - 1, z) && hasYSurface(grid, x, y, z)) {
                    addFace(tris, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
                }
                if (!hasZSurface(grid, x, y, z + 1) && hasZSurface(grid, x, y, z)) {
                    addFace(tris, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
                }
                if (!hasZSurface(grid, x, y, z - 1) && hasZSurface(grid, x, y, z)) {
                    addFace(tris, [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
                }
                //Handle the internal faces
                if (!isSolid(grid, x, y, z)) {
                    //Handle case where only Y and Z surfaces are present
                    if (hasYSurface(grid, x, y, z) && hasZSurface(grid, x, y, z) && !hasXSurface(grid, x, y, z)) {
                        const innerY0 = y0 + wallThicknessVoxels;
                        const innerY1 = y1 - wallThicknessVoxels;
                        const innerZ0 = z0 + wallThicknessVoxels;
                        const innerZ1 = z1 - wallThicknessVoxels;
                        addFace(tris, [x0, innerY0, innerZ0], [x0, innerY0, innerZ1], [x1, innerY0, innerZ1], [x1, innerY0, innerZ0]);
                        addFace(tris, [x0, innerY1, innerZ0], [x1, innerY1, innerZ0], [x1, innerY1, innerZ1], [x0, innerY1, innerZ1]);
                        addFace(tris, [x0, innerY0, innerZ0], [x1, innerY0, innerZ0], [x1, innerY1, innerZ0], [x0, innerY1, innerZ0]);
                        addFace(tris, [x0, innerY0, innerZ1], [x0, innerY1, innerZ1], [x1, innerY1, innerZ1], [x1, innerY0, innerZ1]);
                    }
                }
            }
        }
    }
    return tris;
};
export const writeBinaryStl = (tris, voxelSizeMm) => {
    const triangleCount = tris.length;
    const headerBytes = 80;
    const triRecordBytes = 50;
    const buffer = new ArrayBuffer(headerBytes + 4 + triangleCount * triRecordBytes);
    const view = new DataView(buffer);
    // 80-byte header left as zeros
    view.setUint32(headerBytes, triangleCount, true);
    let offset = headerBytes + 4;
    const writeVertex = (v) => {
        view.setFloat32(offset, v[0] * voxelSizeMm, true);
        view.setFloat32(offset + 4, v[1] * voxelSizeMm, true);
        view.setFloat32(offset + 8, v[2] * voxelSizeMm, true);
        offset += 12;
    };
    for (const tri of tris) {
        // normal (nx, ny, nz) — zeroed (12 bytes)
        view.setFloat32(offset, 0, true);
        view.setFloat32(offset + 4, 0, true);
        view.setFloat32(offset + 8, 0, true);
        offset += 12;
        writeVertex(tri.v1);
        writeVertex(tri.v2);
        writeVertex(tri.v3);
        view.setUint16(offset, 0, true); // attribute byte count
        offset += 2;
    }
    return new Uint8Array(buffer);
};
export const gridToBinaryStl = (grid, voxelSizeMm) => {
    const tris = surfaceExtract(grid);
    return writeBinaryStl(tris, voxelSizeMm);
};
