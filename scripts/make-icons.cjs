// Turn the generated logo (squircle on a gray scene) into clean app icons:
// auto-crops the tile out of the background, masks the rounded corners to
// transparency, and writes the window/tray PNG, the in-app PNG, and the
// installer .ico. Run: node scripts/make-icons.cjs
const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')
const _pti = require('png-to-ico')
const pngToIco = _pti.default || _pti

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'assets', 'logo-source.png')

function chroma(r, g, b) { return Math.max(r, g, b) - Math.min(r, g, b) }

async function main() {
  const img = await Jimp.read(SRC)
  const { width: W, height: H, data } = img.bitmap

  // 1) find the bounding box of the vivid purple tile (gray background is dull)
  let minX = W, minY = H, maxX = 0, maxY = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (chroma(data[i], data[i + 1], data[i + 2]) > 70) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  // 2) square + a hair of padding, clamped to the image
  let bw = maxX - minX, bh = maxY - minY
  let side = Math.max(bw, bh)
  const pad = Math.round(side * 0.02); side += pad * 2
  let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  let sx = Math.round(cx - side / 2), sy = Math.round(cy - side / 2)
  sx = Math.max(0, Math.min(sx, W - side)); sy = Math.max(0, Math.min(sy, H - side))
  side = Math.min(side, W - sx, H - sy)
  img.crop(sx, sy, side, side)

  const S = 512
  img.resize(S, S)

  // 3) mask the rounded-square corners to transparent
  const r = Math.round(S * 0.205)
  img.scan(0, 0, S, S, function (x, y, idx) {
    const dx = x < r ? r - x : (x > S - 1 - r ? x - (S - 1 - r) : 0)
    const dy = y < r ? r - y : (y > S - 1 - r ? y - (S - 1 - r) : 0)
    if (dx > 0 && dy > 0 && dx * dx + dy * dy > r * r) this.bitmap.data[idx + 3] = 0
  })

  fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true })
  fs.mkdirSync(path.join(ROOT, 'src', 'assets'), { recursive: true })
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true })

  await img.clone().writeAsync(path.join(ROOT, 'assets', 'icon.png'))            // window + tray (512)
  await img.clone().resize(256, 256).writeAsync(path.join(ROOT, 'src', 'assets', 'logo.png')) // in-app

  // 4) multi-size .ico for the installer / exe
  const sizes = [256, 128, 64, 48, 32, 16]
  const bufs = []
  for (const s of sizes) bufs.push(await img.clone().resize(s, s).getBufferAsync(Jimp.MIME_PNG))
  const ico = await pngToIco(bufs)
  fs.writeFileSync(path.join(ROOT, 'build', 'icon.ico'), ico)

  console.log('icons written: assets/icon.png (512), src/assets/logo.png (256), build/icon.ico')
  console.log('crop was', side + 'px from', sx + ',' + sy)
}

main().catch((e) => { console.error('icon build failed:', e.message); process.exit(1) })
