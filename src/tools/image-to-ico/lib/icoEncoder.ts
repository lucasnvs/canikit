/**
 * Assembles a valid .ico file from a map of size → PNG bytes.
 *
 * ICO binary format:
 *   Header  (6 bytes):  reserved=0, type=1, imageCount=N
 *   Directory (N×16 bytes each):
 *     [0]   width  (0 = 256)
 *     [1]   height (0 = 256)
 *     [2]   colorCount = 0 (no palette)
 *     [3]   reserved = 0
 *     [4-5] planes = 1  (little-endian uint16)
 *     [6-7] bitCount = 32 (little-endian uint16)
 *     [8-11] dataSize  (little-endian uint32)
 *     [12-15] dataOffset (little-endian uint32)
 *   Image data: PNG bytes for each entry (concatenated, at their offsets)
 *
 * Modern ICO (Vista+) supports embedded PNG data — no BMP encoding needed.
 */
export function buildIco(pngs: Map<number, Uint8Array>): Uint8Array {
  const entries = [...pngs.entries()].sort(([a], [b]) => a - b)
  const count = entries.length
  const headerSize = 6 + count * 16

  // Compute absolute data offsets for each image
  let offset = headerSize
  const offsets: number[] = []
  for (const [, png] of entries) {
    offsets.push(offset)
    offset += png.length
  }

  const totalSize = offset
  const buf = new ArrayBuffer(totalSize)
  const view = new DataView(buf)
  const u8 = new Uint8Array(buf)

  // ICO header
  view.setUint16(0, 0, true)      // reserved
  view.setUint16(2, 1, true)      // type = 1 (ICO)
  view.setUint16(4, count, true)  // number of images

  // Directory entries
  for (let i = 0; i < entries.length; i++) {
    const [size, png] = entries[i]
    const base = 6 + i * 16
    const dim = size === 256 ? 0 : size  // ICO convention: 0 means 256
    view.setUint8(base + 0, dim)           // width
    view.setUint8(base + 1, dim)           // height
    view.setUint8(base + 2, 0)             // colorCount
    view.setUint8(base + 3, 0)             // reserved
    view.setUint16(base + 4, 1, true)      // planes
    view.setUint16(base + 6, 32, true)     // bitCount
    view.setUint32(base + 8, png.length, true)   // dataSize
    view.setUint32(base + 12, offsets[i], true)  // dataOffset
  }

  // Image data
  for (let i = 0; i < entries.length; i++) {
    u8.set(entries[i][1], offsets[i])
  }

  return u8
}
