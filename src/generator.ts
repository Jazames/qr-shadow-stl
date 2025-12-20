import { qrcodegen } from './vendor/nayuki/qrcodegen'
import { CubeNode } from './voxel/cubeNode'

export type BoolGrid2d = {
  width: number
  height: number
  data: Uint8Array
}

export type CubeGrid3d = CubeNode[][][]

export const generateQrGrid = (text: string): BoolGrid2d & { cubeGrid: CubeGrid3d } => {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.HIGH)
  const size = qr.size
  const data = new Uint8Array(size * size)
  const cubeGrid: CubeGrid3d = Array.from({ length: size }, () =>
    Array.from({ length: size }, () =>
      Array.from({ length: size }, () => new CubeNode())
    )
  )

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isModuleFilled = qr.getModule(x, y)
      if (isModuleFilled) {
        for (let z = 0; z < size; z++) {mmit 
          cubeGrid[x][y][z].clearX()
        }
      }
      data[y * size + x] = isModuleFilled ? 1 : 0
    }
  }

  return { width: size, height: size, data, cubeGrid }
}
