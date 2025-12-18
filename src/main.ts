import './style.css'
import { generateQrGrid } from './generator'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <main class="shell">
      <header class="hero">
        <p class="eyebrow">QR Shadow STL Generator</p>
        <h1>Generate designs for a 3D object that can cast a QR code as its shadow</h1>
        <p class="lede">
          Enter the text to encode, then download an STL that casts a QR code in shadow.
        </p>
      </header>

      <section class="panel">
        <label class="field">
          <span class="field-label">QR content</span>
          <input id="qr-input" type="text" placeholder="https://youtu.be/yfG94k41MrI" />
        </label>
        <button id="download-btn" type="button">Download STL</button>
        <div class="status-area" aria-live="polite">
          <div class="spinner-placeholder">Waiting to generate QR...</div>
        </div>
      </section>
    </main>
  `

  const input = app.querySelector<HTMLInputElement>('#qr-input')
  const downloadBtn = app.querySelector<HTMLButtonElement>('#download-btn')
  const statusArea = app.querySelector<HTMLDivElement>('.status-area')

  const setStatus = (message: string) => {
    if (statusArea) {
      statusArea.textContent = message
    }
  }

  downloadBtn?.addEventListener('click', () => {
    const text = (input?.value ?? '').trim()
    if (!text) {
      setStatus('Enter text to encode into the QR.')
      return
    }

    try {
      const grid = generateQrGrid(text)

      // TODO: Pass the grid into the voxel + STL pipeline and trigger download.
      console.log('QR bool grid ready', grid)
      setStatus(`QR generated (${grid.width}x${grid.height}) with high error correction.`)
    } catch (error) {
      console.error('Failed to encode QR', error)
      setStatus('Could not generate QR. Please try different text.')
    }
  })
}
