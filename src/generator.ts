import { qrcodegen } from './vendor/nayuki/qrcodegen'

export type BoolGrid2d = {
  width: number
  height: number
  data: Uint8Array
}

export const generateQrGrid = (text: string): BoolGrid2d => {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.HIGH)
  const size = qr.size
  const data = new Uint8Array(size * size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      data[y * size + x] = qr.getModule(x, y) ? 1 : 0
    }
  }

  return { width: size, height: size, data }
}
