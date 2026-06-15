import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../static/tabbar')
fs.mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function createIcon(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4
      const [r, g, b, a] = draw(x, y, size)
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 })
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function circle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2
}

function ring(x, y, cx, cy, r, t) {
  const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
  return d <= r && d >= r - t
}

const icons = {
  home: (x, y, s, color) => {
    const cx = s / 2
    const cy = s / 2
    const roof = y >= cy - 10 && y <= cy + 2 && Math.abs(x - cx) <= (y - (cy - 10)) * 0.9 + 2
    const body = x >= cx - 10 && x <= cx + 10 && y >= cy && y <= cy + 14
    const door = x >= cx - 4 && x <= cx + 4 && y >= cy + 6 && y <= cy + 14
    if (roof || body) return [...hex(color), 255]
    if (door) return [255, 255, 255, 255]
    return [0, 0, 0, 0]
  },
  weight: (x, y, s, color) => {
    const cx = s / 2
    const cy = s / 2 + 2
    if (ring(x, y, cx, cy, 12, 2.5)) return [...hex(color), 255]
    if (y >= cy - 2 && y <= cy + 2 && x >= cx - 12 && x <= cx + 12) return [...hex(color), 255]
    return [0, 0, 0, 0]
  },
  medical: (x, y, s, color) => {
    const cx = s / 2
    const cy = s / 2
    const v = x >= cx - 2 && x <= cx + 2 && y >= cy - 10 && y <= cy + 10
    const h = y >= cy - 2 && y <= cy + 2 && x >= cx - 10 && x <= cx + 10
    if (circle(x, y, cx, cy, 12) && !(v || h)) return [...hex(color), 120]
    if (v || h) return [...hex(color), 255]
    return [0, 0, 0, 0]
  },
  archive: (x, y, s, color) => {
    const cx = s / 2
    const cy = s / 2 + 2
    const box = x >= cx - 11 && x <= cx + 11 && y >= cy - 4 && y <= cy + 12
    const tab = x >= cx - 6 && x <= cx + 2 && y >= cy - 9 && y <= cy - 4
    if (box || tab) return [...hex(color), 255]
    return [0, 0, 0, 0]
  }
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

for (const [name, draw] of Object.entries(icons)) {
  for (const [suffix, color] of [['', '#909399'], ['-active', '#ff7d3f']]) {
    const png = createIcon(81, (x, y, s) => draw(x, y, s, color))
    fs.writeFileSync(path.join(outDir, `${name}${suffix}.png`), png)
  }
}

console.log('TabBar icons created in static/tabbar/')
