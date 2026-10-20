/**
 * File helpers: PNG size, checksum, and the review contact sheet.
 */
import { createHash } from 'node:crypto';

/** Width and height from a PNG's IHDR chunk, or null when it is not a PNG. */
export function pngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** SHA-1 hex digest, the checksum the media library uses as its duplicate guard. */
export function sha1(buffer) {
  return createHash('sha1').update(buffer).digest('hex');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * A static page listing every captured shot with its alt text, tags and
 * frame, so alt text can be checked against the real image before upload.
 */
export function contactSheet(results, meta) {
  const cards = results
    .map((result) => {
      const image = result.file
        ? `<img src="${escapeHtml(result.fileName)}" alt="${escapeHtml(result.alt)}" loading="lazy">`
        : `<div class="missing">${escapeHtml(result.status)}: ${escapeHtml(result.reason ?? '')}</div>`;
      return `<figure class="${escapeHtml(result.status)}">
  ${image}
  <figcaption>
    <strong>${escapeHtml(result.id)}</strong> <span>${escapeHtml(result.status)}</span>
    <p>${escapeHtml(result.alt)}</p>
    <p class="meta">${escapeHtml(result.path)} · ${escapeHtml(result.device)} · frame ${escapeHtml(result.frame)}${
      result.width ? ` · ${result.width}×${result.height}` : ''
    }${result.bytes ? ` · ${(result.bytes / 1024).toFixed(0)} KB` : ''}${result.reviewed ? ' · alt reviewed' : ' · alt NOT reviewed'}</p>
    <p class="meta">${escapeHtml((result.tags ?? []).join(', '))}</p>
  </figcaption>
</figure>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Screenshot capture review</title>
<style>
  :root { color-scheme: light; --line: #e2e8f0; --muted: #64748b; }
  body { margin: 0; padding: 24px 16px; font: 14px/1.5 system-ui, sans-serif; color: #0f172a; background: #f8fafc; }
  header { max-width: 1200px; margin: 0 auto 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  header p { margin: 0; color: var(--muted); }
  main { max-width: 1200px; margin: 0 auto; display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
  figure { margin: 0; background: #fff; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: 260px; object-fit: cover; object-position: top left; border-bottom: 1px solid var(--line); }
  .missing { height: 120px; display: grid; place-items: center; padding: 12px; color: var(--muted); border-bottom: 1px solid var(--line); text-align: center; }
  figcaption { padding: 12px 14px; }
  figcaption span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
  figcaption p { margin: 6px 0 0; }
  .meta { color: var(--muted); font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>Screenshot capture review</h1>
  <p>${escapeHtml(meta.when)} · ${escapeHtml(meta.baseUrl)} · ${results.filter((r) => r.file).length} captured, ${
    results.filter((r) => !r.file).length
  } skipped or failed</p>
</header>
<main>
${cards}
</main>
</body>
</html>
`;
}
