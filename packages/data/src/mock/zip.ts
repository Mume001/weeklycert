// A ZIP with its files stored, not compressed: enough for the mock archive
// export (spec/20 J), without a library spec/09 does not list. In step 5 the
// worker builds the real one, with the real PDFs and XMLs, in storage.

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = (TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** 2026-09-14 00:00 as a DOS date, so the same files give the same bytes. */
const DOS_DATE = ((2026 - 1980) << 9) | (9 << 5) | 14

export function storedZip(
  files: readonly { name: string; body: Uint8Array }[],
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.body)
    const local = new Uint8Array(30 + name.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true)
    l.setUint16(6, 0x0800, true) // names are UTF-8
    l.setUint16(12, DOS_DATE, true)
    l.setUint32(14, crc, true)
    l.setUint32(18, file.body.length, true)
    l.setUint32(22, file.body.length, true)
    l.setUint16(26, name.length, true)
    local.set(name, 30)
    const head = new Uint8Array(46 + name.length)
    const h = new DataView(head.buffer)
    h.setUint32(0, 0x02014b50, true)
    h.setUint16(4, 20, true)
    h.setUint16(6, 20, true)
    h.setUint16(8, 0x0800, true)
    h.setUint16(14, DOS_DATE, true)
    h.setUint32(16, crc, true)
    h.setUint32(20, file.body.length, true)
    h.setUint32(24, file.body.length, true)
    h.setUint16(28, name.length, true)
    h.setUint32(42, offset, true)
    head.set(name, 46)
    parts.push(local, file.body)
    central.push(head)
    offset += local.length + file.body.length
  }
  const size = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, files.length, true)
  e.setUint16(10, files.length, true)
  e.setUint32(12, size, true)
  e.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of all) {
    out.set(p, at)
    at += p.length
  }
  return out
}
