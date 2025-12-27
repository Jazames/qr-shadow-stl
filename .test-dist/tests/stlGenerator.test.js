import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { surfaceExtract, writeBinaryStl } from "../src/stl/stlGenerator.js";
const solidVoxel = 0x0f;
const createGrid = (sizeX, sizeY, sizeZ, isSolidVoxel) => {
    const data = new Uint8Array(sizeX * sizeY * sizeZ);
    let idx = 0;
    for (let z = 0; z < sizeZ; z++) {
        for (let y = 0; y < sizeY; y++) {
            for (let x = 0; x < sizeX; x++) {
                data[idx++] = isSolidVoxel(x, y, z) ? solidVoxel : 0x00;
            }
        }
    }
    return { sizeX, sizeY, sizeZ, data };
};
const writeStlFixture = async (name, stl) => {
    const outDir = path.resolve("tests", "out");
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, name), stl);
};
const singleVoxelGrid = (value) => ({
    sizeX: 1,
    sizeY: 1,
    sizeZ: 1,
    data: new Uint8Array([value])
});
test("1x1x1 cube generates 12 triangles and valid binary STL", async () => {
    const grid = createGrid(1, 1, 1, () => true);
    const tris = surfaceExtract(grid);
    assert.equal(tris.length, 12);
    const stl = writeBinaryStl(tris, 1);
    assert.equal(stl.byteLength, 80 + 4 + 12 * 50);
    const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
    assert.equal(view.getUint32(80, true), 12);
    const triangleCount = 12;
    const stride = 50;
    const start = 84;
    for (let i = 0; i < triangleCount; i++) {
        const base = start + i * stride;
        // Skip normal (12 bytes) and check vertex positions (9 floats).
        for (let v = 0; v < 9; v++) {
            const coord = view.getFloat32(base + 12 + v * 4, true);
            assert.ok(coord === 0 || coord === 1000, `unexpected coord ${coord}`);
        }
    }
    await writeStlFixture("cube-1x1x1.stl", stl);
});
test("3x3x3 cube missing center line along x-axis generates 128 triangles", async () => {
    const grid = createGrid(3, 3, 3, (_, y, z) => !(y === 1 && z === 1));
    const tris = surfaceExtract(grid);
    assert.equal(tris.length, 128);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("cube-3x3x3-missing-x.stl", stl);
});
test("3x3x3 cube missing center line along y-axis generates 128 triangles", async () => {
    const grid = createGrid(3, 3, 3, (x, _, z) => !(x === 1 && z === 1));
    const tris = surfaceExtract(grid);
    assert.equal(tris.length, 128);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("cube-3x3x3-missing-y.stl", stl);
});
test("3x3x3 cube missing center line along z-axis generates 128 triangles", async () => {
    const grid = createGrid(3, 3, 3, (x, y, _) => !(x === 1 && y === 1));
    const tris = surfaceExtract(grid);
    assert.equal(tris.length, 128);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("cube-3x3x3-missing-z.stl", stl);
});
test("2x2x2 cube missing one row along each axis generates 12 triangles", async () => {
    const grid = createGrid(2, 2, 2, (x, y, z) => x !== 0 && y !== 0 && z !== 0);
    const tris = surfaceExtract(grid);
    assert.equal(tris.length, 12);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("cube-2x2x2-missing-xyz-row.stl", stl);
});
test("1x1x1 box with x-axis hole generates 8 triangles", async () => {
    const grid = singleVoxelGrid(0x08 | 0x04);
    const tris = surfaceExtract(grid);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("box-1x1x1-x-hole.stl", stl);
    assert.equal(tris.length, 8);
});
test("1x1x1 box with y-axis hole generates 8 triangles", async () => {
    const grid = singleVoxelGrid(0x08 | 0x02);
    const tris = surfaceExtract(grid);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("box-1x1x1-y-hole.stl", stl);
    assert.equal(tris.length, 8);
});
test("1x1x1 box with z-axis hole generates 8 triangles", async () => {
    const grid = singleVoxelGrid(0x04 | 0x02);
    const tris = surfaceExtract(grid);
    const stl = writeBinaryStl(tris, 1);
    await writeStlFixture("box-1x1x1-z-hole.stl", stl);
    assert.equal(tris.length, 8);
});
