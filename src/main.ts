import './style.css'

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
          <div class="spinner-placeholder">Processing indicator goes here</div>
        </div>
      </section>
    </main>
  `
}
