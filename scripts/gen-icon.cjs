// Generate a simple solid-purple app/tray icon (256x256 PNG) with no deps.
// Run once: node scripts/gen-icon.cjs
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const W = 256, H = 256
const R = 124, G = 107, B = 245 // #7C6BF5

// raw RGBA scanlines, each prefixed with filter byte 0
const row = Buffer.alloc(1 + W * 4)
row[0] = 0
for (let x = 0; x < W; x++) {
  row[1 + x * 4] = R
  row[1 + x * 4 + 1] = G
  row[1 + x * 4 + 2] = B
  row[1 + x * 4 + 3] = 255
}
const raw = Buffer.concat(Array.from({ length: H }, () => row))
const idat = zlib.deflateSync(raw)

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const body = Buffer.concat([t, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0, 0)
  return Buffer.concat([len, body, crc])
}

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return ~c
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])

const outDir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'icon.png'), png)
console.log('wrote assets/icon.png', png.length, 'bytes')
