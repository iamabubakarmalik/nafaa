/**
 * Uploads captured screenshots to the CMS media library
 * (API-CONTRACT 8.4: POST /admin/marketing/cms/media and POST /media/:id/replace).
 *
 * Only runs with `--upload`. It needs an admin access token (CMS_ADMIN_TOKEN,
 * from an apps/admin session with `marketing.cms.edit`) and refuses any API
 * that is not on localhost unless `--allow-remote` is passed, so a mistyped
 * env var cannot push to production.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function assertUploadTarget(apiUrl, allowRemote) {
  let host;
  try {
    host = new URL(apiUrl).hostname;
  } catch {
    throw new Error(`invalid CMS API URL: ${apiUrl}`);
  }
  if (!LOCAL_HOSTS.has(host) && !allowRemote) {
    throw new Error(`refusing to upload to ${apiUrl}: not localhost. Pass --allow-remote after checking the target.`);
  }
}

/** The API wraps responses as `{ success, data }`; older handlers return the row itself. */
function payload(body) {
  return body && typeof body === 'object' && body.data && typeof body.data === 'object' ? body.data : body;
}

function errorText(status, body) {
  const message = typeof body?.message === 'string' ? body.message : Array.isArray(body?.message) ? body.message.join('; ') : '';
  return `HTTP ${status}${message ? `: ${message}` : ''}`;
}

/**
 * Uploads one shot. With `mediaId` the file replaces that media row (same id,
 * so pages using it update without edits); otherwise a new row is created.
 * Returns `{ status: 'created' | 'replaced' | 'duplicate', mediaId }`.
 */
export async function uploadShot({ apiUrl, token, buffer, fileName, shot }) {
  const base = `${apiUrl}/admin/marketing/cms/media`;
  const headers = { authorization: `Bearer ${token}` };
  const file = new Blob([buffer], { type: 'image/png' });

  if (shot.mediaId) {
    const form = new FormData();
    form.append('file', file, fileName);
    const response = await fetch(`${base}/${encodeURIComponent(shot.mediaId)}/replace`, { method: 'POST', headers, body: form });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`replace ${shot.mediaId}: ${errorText(response.status, body)}`);
    return { status: 'replaced', mediaId: payload(body)?.id ?? shot.mediaId };
  }

  const form = new FormData();
  form.append('file', file, fileName);
  form.append('alt', shot.alt);
  form.append('kind', 'SCREENSHOT');
  form.append('tags', shot.tags.join(','));
  if (shot.caption) form.append('caption', shot.caption);

  const response = await fetch(base, { method: 'POST', headers, body: form });
  const body = await response.json().catch(() => null);
  const duplicateOf = body?.duplicateOf ?? body?.data?.duplicateOf;
  if (response.status === 409 && duplicateOf?.id) return { status: 'duplicate', mediaId: duplicateOf.id };
  if (!response.ok) throw new Error(`upload ${shot.id}: ${errorText(response.status, body)}`);
  return { status: 'created', mediaId: payload(body)?.id ?? null };
}
