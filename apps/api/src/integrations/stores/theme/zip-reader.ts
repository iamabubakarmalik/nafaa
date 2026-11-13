/**
 * Minimal, memory-safe zip reader for theme files.
 *
 * Shopify theme exports are written as a stream: the size fields can hold the
 * "unknown" marker (0xFFFFFFFF) instead of a real size, so a declared size is
 * never trusted. Entries are listed from the central directory (zip64 aware)
 * and each wanted file is inflated in chunks, counting the real output and
 * stopping at the caller's cap. Nothing is written to disk.
 */
import { Inflate } from 'fflate';

export interface ZipEntry {
  name: string;
  /** 0 = stored, 8 = deflate; others are not read. */
  method: number;
  /** Compressed size, or -1 when the archive does not say. */
  compSize: number;
  /** Size once unzipped as declared, or -1 when unknown. Only a hint. */
  size: number;
  /** Offset of the local file header. */
  offset: number;
}

const UNKNOWN32 = 0xffffffff;
const CHUNK = 64 * 1024;

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u64 = (b: Uint8Array, i: number) => u32(b, i) + u32(b, i + 4) * 2 ** 32;

/** Lists the archive's entries; null when the central directory can't be found. */
export function listZip(buf: Uint8Array, maxEntries: number): ZipEntry[] | 'too_many' | null {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (u32(buf, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  let count = u16(buf, eocd + 10);
  let cdOffset = u32(buf, eocd + 16);
  // zip64: the locator sits just before the end record and points at the zip64 end record.
  if ((count === 0xffff || cdOffset === UNKNOWN32) && eocd >= 20 && u32(buf, eocd - 20) === 0x07064b50) {
    const z64 = u64(buf, eocd - 12);
    if (z64 + 56 <= buf.length && u32(buf, z64) === 0x06064b50) {
      count = u64(buf, z64 + 32);
      cdOffset = u64(buf, z64 + 48);
    }
  }
  if (count > maxEntries) return 'too_many';
  const out: ZipEntry[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || u32(buf, p) !== 0x02014b50) break;
    const method = u16(buf, p + 10);
    let compSize = u32(buf, p + 20);
    let size = u32(buf, p + 24);
    const nameLen = u16(buf, p + 28);
    const extraLen = u16(buf, p + 30);
    const commentLen = u16(buf, p + 32);
    let offset = u32(buf, p + 42);
    const name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLen));
    // zip64 extra field: only the fields marked unknown are present, in this order.
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = u16(buf, e);
      const len = u16(buf, e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        const qEnd = q + len;
        if (size === UNKNOWN32 && q + 8 <= qEnd) { size = u64(buf, q); q += 8; }
        if (compSize === UNKNOWN32 && q + 8 <= qEnd) { compSize = u64(buf, q); q += 8; }
        if (offset === UNKNOWN32 && q + 8 <= qEnd) { offset = u64(buf, q); q += 8; }
      }
      e += 4 + len;
    }
    out.push({ name, method, compSize: compSize === UNKNOWN32 ? -1 : compSize, size: size === UNKNOWN32 ? -1 : size, offset });
    p = eEnd + commentLen;
  }
  return out;
}

class TooBig extends Error {}

/**
 * Unzips one entry, never producing more than `cap` bytes.
 * Returns the bytes, 'too_big' past the cap, or null when the entry can't be read.
 */
export function readEntry(buf: Uint8Array, entry: ZipEntry, cap: number): Uint8Array | 'too_big' | null {
  const h = entry.offset;
  if (h + 30 > buf.length || u32(buf, h) !== 0x04034b50) return null;
  const start = h + 30 + u16(buf, h + 26) + u16(buf, h + 28);
  const known = entry.compSize >= 0 && start + entry.compSize <= buf.length;
  const src = buf.subarray(start, known ? start + entry.compSize : buf.length);

  if (entry.method === 0) {
    if (!known) return null;
    return src.length > cap ? 'too_big' : src.slice();
  }
  if (entry.method !== 8) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;
  const inf = new Inflate((chunk) => {
    total += chunk.length;
    if (total > cap) throw new TooBig();
    chunks.push(chunk);
  });
  try {
    for (let i = 0; i < src.length; i += CHUNK) {
      const end = Math.min(i + CHUNK, src.length);
      inf.push(src.subarray(i, end), end >= src.length);
    }
  } catch (e) {
    if (e instanceof TooBig) return 'too_big';
    // Without a known compressed size the stream runs into the next entry's bytes;
    // what was inflated before that is the whole file.
    if (known || !chunks.length) return null;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
