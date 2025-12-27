import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { surfaceExtract, writeBinaryStl } from "../src/stl/stlGenerator.js";
test("1x1x1 cube generates 12 triangles and valid binary STL", () => {
    const grid = {
        sizeX: 1,
        sizeY: 1,
        sizeZ: 1,
        data: new Uint8Array([0x0f])
    };
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
    return (async () => {
        const outDir = path.resolve("tests", "out");
        await mkdir(outDir, { recursive: true });
        await writeFile(path.join(outDir, "cube-1x1x1.stl"), stl);
    })();
});
