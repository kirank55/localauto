import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function crc32(buffer) {
  let crc = ~0
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const radius = 0.18
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const px = size === 1 ? 0.5 : x / (size - 1)
      const py = size === 1 ? 0.5 : y / (size - 1)
      const cx = Math.min(Math.max(px, radius), 1 - radius)
      const cy = Math.min(Math.max(py, radius), 1 - radius)
      const inside = Math.hypot(px - cx, py - cy) <= radius
      const stem = px >= 0.28 && px <= 0.44 && py >= 0.22 && py <= 0.76
      const foot = px >= 0.28 && px <= 0.72 && py >= 0.62 && py <= 0.76
      const index = row + 1 + x * 4
      if (!inside) {
        raw[index] = 0
        raw[index + 1] = 0
        raw[index + 2] = 0
        raw[index + 3] = 0
      } else if (stem || foot) {
        raw[index] = 244
        raw[index + 1] = 244
        raw[index + 2] = 243
        raw[index + 3] = 255
      } else {
        raw[index] = 23
        raw[index + 1] = 23
        raw[index + 2] = 23
        raw[index + 3] = 255
      }
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icon', { recursive: true })
for (const size of [16, 32, 48, 128]) writeFileSync(`public/icon/${size}.png`, png(size))
