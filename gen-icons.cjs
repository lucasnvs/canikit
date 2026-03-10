/**
 * Gera os ícones placeholder necessários para o Tauri compilar.
 * Usa apenas módulos built-in do Node.js (sem npm install).
 * Execute: node gen-icons.js
 */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const ICONS_DIR = path.join(__dirname, 'src-tauri', 'icons')
fs.mkdirSync(ICONS_DIR, { recursive: true })

// ── CRC32 (necessário para o formato PNG) ──────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return ((crc ^ 0xffffffff) >>> 0)
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// ── Gera PNG sólido (cor única) ────────────────────────────────────────────
function createPNG(size, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: largura, altura, bitdepth=8, colortype=2 (RGB), outros=0
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB

  // Dados brutos: para cada linha, 1 byte filter=0 + 3 bytes por pixel
  const rowSize = 1 + size * 3
  const rawData = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    const base = y * rowSize
    rawData[base] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      rawData[base + 1 + x * 3 + 0] = r
      rawData[base + 1 + x * 3 + 1] = g
      rawData[base + 1 + x * 3 + 2] = b
    }
  }

  const idat = zlib.deflateSync(rawData, { level: 6 })

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Gera ICO com PNG embutido (formato moderno, Windows Vista+) ────────────
function createICO(pngData, size) {
  // ICONDIR header
  const header = Buffer.from([0, 0, 1, 0, 1, 0])  // reserved, type=1, count=1

  // ICONDIRENTRY (16 bytes)
  const entry = Buffer.alloc(16)
  entry[0] = size === 256 ? 0 : size  // width (0 = 256)
  entry[1] = size === 256 ? 0 : size  // height
  entry[2] = 0   // color count
  entry[3] = 0   // reserved
  entry.writeUInt16LE(1, 4)            // planes
  entry.writeUInt16LE(32, 6)           // bit count
  entry.writeUInt32LE(pngData.length, 8)
  entry.writeUInt32LE(22, 12)          // offset = 6 (header) + 16 (entry)

  return Buffer.concat([header, entry, pngData])
}

// ── Cor do ícone: #e94560 (accent do NevesTools) ──────────────────────────
const R = 233, G = 69, B = 96

const png32  = createPNG(32,  R, G, B)
const png128 = createPNG(128, R, G, B)
const png256 = createPNG(256, R, G, B)  // para o ICO de alta qualidade

fs.writeFileSync(path.join(ICONS_DIR, '32x32.png'),   png32)
fs.writeFileSync(path.join(ICONS_DIR, '128x128.png'), png128)
fs.writeFileSync(path.join(ICONS_DIR, '128x128@2x.png'), createPNG(256, R, G, B))
fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'),    createICO(png32, 32))

console.log('Ícones gerados em src-tauri/icons/:')
fs.readdirSync(ICONS_DIR).forEach(f => console.log(' ', f))
