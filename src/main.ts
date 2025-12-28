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
          <span class="field-label">Front QR content (Z direction)</span>
          <input id="qr-input-front" type="text" placeholder="https://youtu.be/yfG94k41MrI" />
        </label>
        <label class="field">
          <span class="field-label">Right QR content (X direction)</span>
          <input id="qr-input-right" type="text" placeholder="https://youtu.be/rgLgPTXdR4M" />
        </label>
        <label class="field">
          <span class="field-label">Top QR content (Y direction)</span>
          <input id="qr-input-top" type="text" placeholder="https://youtu.be/VGPQzsuYfkY" />
        </label>
        <details class="advanced">
          <summary>Advanced settings</summary>
          <div class="advanced-grid">
            <label class="field">
              <span class="field-label">Cube resolution</span>
              <input id="resolution-input" type="number" min="1" step="1" value="100" />
            </label>
            <label class="field">
              <span class="field-label">Wall thickness (voxels)</span>
              <input id="wall-thickness-input" type="number" min="1" step="1" value="5" />
            </label>
            <label class="field">
              <span class="field-label">Overall size (mm)</span>
              <input id="size-input" type="number" min="0" step="0.1" value="150" />
            </label>
            <p class="field-hint">
              Size scales the full cube. Leave blank to keep the current output scale.
            </p>
          </div>
        </details>
        <button id="download-btn" type="button">Download STL</button>
        <div class="status-area" aria-live="polite">
          <div class="spinner-placeholder">Waiting to generate QR...</div>
        </div>
      </section>
    </main>
  `

  const frontInput = app.querySelector<HTMLInputElement>('#qr-input-front')
  const rightInput = app.querySelector<HTMLInputElement>('#qr-input-right')
  const topInput = app.querySelector<HTMLInputElement>('#qr-input-top')
  const resolutionInput = app.querySelector<HTMLInputElement>('#resolution-input')
  const wallThicknessInput = app.querySelector<HTMLInputElement>('#wall-thickness-input')
  const sizeInput = app.querySelector<HTMLInputElement>('#size-input')
  const downloadBtn = app.querySelector<HTMLButtonElement>('#download-btn')
  const statusArea = app.querySelector<HTMLDivElement>('.status-area')

  const setStatus = (message: string) => {
    if (statusArea) {
      statusArea.textContent = message
    }
  }

  const readNumber = (input: HTMLInputElement | null, fallback?: number): number | undefined => {
    const raw = input?.value?.trim() ?? ''
    if (!raw) {
      return fallback
    }
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      return fallback
    }
    return value
  }

  downloadBtn?.addEventListener('click', () => {
    const frontText = (frontInput?.value ?? '').trim()
    if (!frontText) {
      setStatus('Enter text to encode for the front QR.')
      return
    }

    try {
      const grid = generateQrGrid({
        frontText,
        rightText: (rightInput?.value ?? '').trim() || undefined,
        topText: (topInput?.value ?? '').trim() || undefined,
        resolution: readNumber(resolutionInput, 1000),
        wallThicknessVoxels: readNumber(wallThicknessInput, 30),
        expectedSizeMm: readNumber(sizeInput)
      })
      const bytes = grid.stlBytes.slice().buffer;
      const blob = new Blob([bytes], { type: 'model/stl' })
      const url = URL.createObjectURL(blob)

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'qr-shadow.stl'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      setStatus(
        `STL ready (${grid.width}x${grid.height} QR). Downloaded with high error correction.`
      )
    } catch (error) {
      console.error('Failed to encode QR', error)
      const message = error instanceof Error
        ? error.message
        : 'Could not generate QR. Please try different text.'
      setStatus(message)
    }
  })
}
