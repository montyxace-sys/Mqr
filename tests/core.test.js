const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('OK   ' + name);
    passed++;
  } catch (err) {
    console.error('FAIL ' + name + ': ' + err.message);
    process.exitCode = 1;
  }
}

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const qrcode = require('qrcode-generator');

function matrix(text, level) {
  const qr = qrcode(0, level || 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cells = [];
  for (let row = 0; row < count; row++) {
    const line = [];
    for (let col = 0; col < count; col++) line.push(qr.isDark(row, col) ? 1 : 0);
    cells.push(line.join(''));
  }
  return cells;
}

test('Genera una matriz QR válida para una URL', () => {
  const cells = matrix('https://msoft.com.es');
  assert.ok(cells.length >= 21, 'la matriz debe tener al menos 21 módulos');
  assert.ok(cells.every(line => line.length === cells.length), 'la matriz debe ser cuadrada');
  assert.ok(cells.some(line => line.includes('1')), 'debe contener módulos oscuros');
});

test('El QR es determinista para el mismo contenido', () => {
  assert.deepEqual(matrix('MQr 1.1.0'), matrix('MQr 1.1.0'));
});

test('Contenidos distintos producen QRs distintos', () => {
  assert.notDeepEqual(matrix('hola'), matrix('adiós'));
});

test('Los cuatro niveles de corrección generan QR', () => {
  for (const level of ['L', 'M', 'Q', 'H']) {
    assert.ok(matrix('MSoft', level).length >= 21, 'nivel ' + level);
  }
});

test('UTF-8 está disponible para texto con acentos', () => {
  const qr = qrcode(0, 'M');
  qr.addData('Información para MSoft — ñandú');
  qr.make();
  assert.ok(qr.getModuleCount() >= 21);
});

test('Las librerías están incluidas localmente (sin CDN)', () => {
  for (const file of [
    'app/assets/js/vendor/html5-qrcode.min.js',
    'app/assets/js/vendor/qrcode.js',
    'app/assets/js/vendor/qrcode-utf8.js'
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)), 'falta ' + file);
  }
  const html = read('app/index.html');
  assert.equal(html.includes('unpkg.com'), false, 'no debe cargar librerías desde unpkg');
  assert.ok(html.includes('assets/js/vendor/qrcode.js'));
});

test('La versión 1.1.0 está sincronizada', () => {
  assert.equal(JSON.parse(read('package.json')).version, '1.1.0');
  assert.ok(read('desktop/preload.js').includes("1.1.0"));
  assert.ok(read('app/index.html').includes('v1.1.0'));
});

test('El aviso de donación y los enlaces están presentes', () => {
  const html = read('app/index.html');
  const js = read('app/assets/js/app.js');
  assert.ok(html.includes('https://paypal.me/MsoftGenuino'));
  assert.ok(html.includes('https://liberapay.com/Msoft/donate'));
  assert.ok(js.includes('launches % 3'));
  assert.ok(html.includes('donation-hide'));
});

console.log(`\n${passed} correctas, ${process.exitCode ? 'algunas fallidas' : '0 fallidas'}.`);
