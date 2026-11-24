(function () {
  'use strict';

  const VERSION = '1.1.0';
  const hasScanner = typeof Html5Qrcode !== 'undefined';
  const html5QrCode = hasScanner ? new Html5Qrcode('reader') : null;
  let isScanning = false;
  let cameras = [];
  let currentCameraIndex = 0;
  let history = [];
  let qrReady = false;

  const $ = (id) => document.getElementById(id);
  const btnStart = $('btn-start');
  const btnStop = $('btn-stop');
  const btnSwitch = $('btn-switch');
  const resultSection = $('result-section');
  const resultText = $('result-text');
  const btnCopy = $('btn-copy');
  const btnOpen = $('btn-open');
  const btnClear = $('btn-clear');
  const historyEl = $('result-history');

  function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* -------------------- Lector -------------------- */

  function addToHistory(text) {
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    history.unshift({ text, time });
    if (history.length > 10) history.pop();
    renderHistory();
  }

  function renderHistory() {
    historyEl.innerHTML = '';
    if (history.length === 0) return;
    const title = document.createElement('h3');
    title.textContent = 'Historial';
    historyEl.appendChild(title);
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `<span class="hist-text">${escapeHtml(item.text)}</span><span class="hist-time">${item.time}</span>`;
      historyEl.appendChild(div);
    });
  }

  function onScanSuccess(decodedText) {
    resultText.textContent = decodedText;
    resultSection.hidden = false;
    addToHistory(decodedText);
    showToast('Código escaneado');
    btnOpen.style.display = /^https?:\/\//i.test(decodedText) ? '' : 'none';
  }

  function onScanFailure() {
    // Los fallos de lectura son normales mientras el escáner está activo.
  }

  async function startScanner() {
    if (!hasScanner) {
      showToast('El lector no está disponible en este dispositivo');
      return;
    }
    try {
      cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        showToast('No se encontró cámara');
        return;
      }
      btnSwitch.disabled = cameras.length < 2;
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      await html5QrCode.start(cameras[currentCameraIndex].id, config, onScanSuccess, onScanFailure);
      isScanning = true;
      btnStart.disabled = true;
      btnStop.disabled = false;
      btnSwitch.disabled = cameras.length < 2;
    } catch (err) {
      showToast('Error: ' + (err.message || err));
    }
  }

  async function stopScanner() {
    if (!isScanning || !html5QrCode) return;
    try {
      await html5QrCode.stop();
      isScanning = false;
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnSwitch.disabled = true;
    } catch (err) {
      showToast('Error al detener: ' + (err.message || err));
    }
  }

  async function switchCamera() {
    if (cameras.length < 2) return;
    await stopScanner();
    currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
    await startScanner();
  }

  btnStart.addEventListener('click', startScanner);
  btnStop.addEventListener('click', stopScanner);
  btnSwitch.addEventListener('click', switchCamera);

  btnCopy.addEventListener('click', () => {
    const text = resultText.textContent;
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Copiado')).catch(() => showToast('Error al copiar'));
    } else {
      showToast('Copia manual: ' + text);
    }
  });

  btnOpen.addEventListener('click', () => {
    const text = resultText.textContent;
    if (/^https?:\/\//i.test(text)) window.open(text, '_blank', 'noopener');
  });

  btnClear.addEventListener('click', () => {
    resultText.textContent = '';
    resultSection.hidden = true;
    history = [];
    renderHistory();
  });

  // Subir imagen para leer códigos sin cámara.
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !hasScanner) return;
    try {
      const result = await html5QrCode.scanFile(file, true);
      onScanSuccess(result);
    } catch (err) {
      showToast('No se pudo leer el código');
    }
    fileInput.value = '';
  });

  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn btn-ghost';
  uploadBtn.textContent = 'Subir imagen';
  uploadBtn.addEventListener('click', () => fileInput.click());
  document.querySelector('.controls').appendChild(uploadBtn);

  /* -------------------- 1.1.0: creador de QR -------------------- */

  const qrInput = $('qr-input');
  const qrCount = $('qr-count');
  const qrCapacity = $('qr-capacity');
  const qrSize = $('qr-size');
  const qrLevel = $('qr-level');
  const qrCanvas = $('qr-canvas');
  const qrOutput = $('qr-output');
  const qrStatus = $('qr-status');
  const btnGenerate = $('btn-generate');
  const btnDownload = $('btn-download');
  const btnCopyQr = $('btn-copy-qr');

  function updateCounter() {
    const length = qrInput.value.length;
    qrCount.textContent = `${length} / 1200`;
    const level = qrLevel.value;
    const rough = level === 'L' ? 'L' : level === 'M' ? 'M' : level === 'Q' ? 'Q' : 'H';
    qrCapacity.textContent = `Corrección ${rough} · ${length > 700 ? 'texto largo' : length > 250 ? 'texto medio' : 'texto corto'}`;
  }

  function drawQr(text, level, size) {
    const qr = qrcode(0, level);
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const quiet = 4;
    const modules = count + quiet * 2;
    const cell = Math.max(1, Math.floor(size / modules));
    const canvasSize = cell * modules;

    qrCanvas.width = canvasSize;
    qrCanvas.height = canvasSize;
    const ctx = qrCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = '#1d1f20';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect((col + quiet) * cell, (row + quiet) * cell, cell, cell);
        }
      }
    }
    return { modules: count, pixels: canvasSize };
  }

  function generateQr() {
    const text = qrInput.value.trim();
    if (!text) {
      showToast('Escribe un texto o enlace');
      qrInput.focus();
      return;
    }
    if (typeof qrcode !== 'function') {
      showToast('No se pudo cargar el generador de QR');
      return;
    }
    try {
      const info = drawQr(text, qrLevel.value, Number(qrSize.value));
      qrOutput.hidden = false;
      qrStatus.textContent = `QR de ${info.modules}×${info.modules} módulos · ${info.pixels}×${info.pixels} px`;
      btnDownload.disabled = false;
      btnCopyQr.disabled = false;
      qrReady = true;
      showToast('QR creado');
    } catch (err) {
      qrReady = false;
      btnDownload.disabled = true;
      btnCopyQr.disabled = true;
      showToast('El contenido es demasiado largo para este QR');
    }
  }

  function downloadQr() {
    if (!qrReady) return;
    const link = document.createElement('a');
    link.download = 'mqr-' + new Date().toISOString().slice(0, 10) + '.png';
    link.href = qrCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('PNG descargado');
  }

  async function copyQr() {
    if (!qrReady) return;
    try {
      const blob = await new Promise(resolve => qrCanvas.toBlob(resolve, 'image/png'));
      if (blob && navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Imagen copiada');
      } else {
        await navigator.clipboard.writeText(qrInput.value.trim());
        showToast('Texto copiado (la imagen no es compatible aquí)');
      }
    } catch (err) {
      showToast('No se pudo copiar; usa «Descargar PNG»');
    }
  }

  qrInput.addEventListener('input', updateCounter);
  qrLevel.addEventListener('change', updateCounter);
  btnGenerate.addEventListener('click', generateQr);
  btnDownload.addEventListener('click', downloadQr);
  btnCopyQr.addEventListener('click', copyQr);

  /* -------------------- Pestañas -------------------- */

  const tabRead = $('tab-read');
  const tabCreate = $('tab-create');
  const panelRead = $('panel-read');
  const panelCreate = $('panel-create');

  function selectTab(which) {
    const create = which === 'create';
    tabRead.classList.toggle('is-active', !create);
    tabCreate.classList.toggle('is-active', create);
    tabRead.setAttribute('aria-selected', String(!create));
    tabCreate.setAttribute('aria-selected', String(create));
    panelRead.hidden = create;
    panelCreate.hidden = !create;
    if (create) stopScanner();
  }

  tabRead.addEventListener('click', () => selectTab('read'));
  tabCreate.addEventListener('click', () => selectTab('create'));

  /* -------------------- Aviso de donación -------------------- */

  const PREFS_KEY = 'mqr.donation.prefs';

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (err) { /* almacenamiento no disponible */ }
  }

  function maybeShowDonation() {
    const prefs = loadPrefs();
    if (prefs.hidden) return;
    const launches = (prefs.launches || 0) + 1;
    prefs.launches = launches;
    savePrefs(prefs);
    if (launches % 3 !== 0) return;
    const modal = $('donation-modal');
    setTimeout(() => { modal.hidden = false; }, 1200);
  }

  function closeDonation(hide) {
    if (hide) {
      const prefs = loadPrefs();
      prefs.hidden = true;
      savePrefs(prefs);
    }
    $('donation-modal').hidden = true;
  }

  $('donation-close').addEventListener('click', () => closeDonation(false));
  $('donation-later').addEventListener('click', () => closeDonation(false));
  $('donation-modal').addEventListener('click', (e) => {
    if (e.target === $('donation-modal')) closeDonation(false);
  });
  $('donation-hide').addEventListener('change', (e) => {
    if (e.target.checked) closeDonation(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = $('donation-modal');
      if (!modal.hidden) {
        closeDonation(false);
        return;
      }
      if (!resultSection.hidden) {
        resultText.textContent = '';
        resultSection.hidden = true;
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !panelCreate.hidden) generateQr();
  });

  const versionLabel = $('app-version-label');
  if (versionLabel) versionLabel.textContent = 'v' + VERSION;
  updateCounter();
  maybeShowDonation();

  window.QRReader = {
    version: VERSION,
    generate: generateQr,
    get qrReady() { return qrReady; }
  };
})();

window.goBack = function () {
  const modal = document.getElementById('donation-modal');
  if (modal && !modal.hidden) { modal.hidden = true; return true; }
  const create = document.getElementById('panel-create');
  if (create && !create.hidden) {
    document.getElementById('tab-read').click();
    return true;
  }
  const rs = document.getElementById('result-section');
  if (rs && !rs.hidden) { rs.hidden = true; return true; }
  return false;
};
