/** Writes the seed menus over the saved ones (the main seed only creates missing menus). Local use. */
import { menus } from './content';
import { CmsApi, resolveToken } from './lib/api';

async function main() {
  const apiUrl = process.env.CMS_API_URL ?? 'http://localhost:4000/api';
  const { token } = await resolveToken(apiUrl);
  const api = new CmsApi(apiUrl, token);
  for (const m of menus as Array<{ key: string; locale?: string; title: string; items: unknown[] }>) {
    await api.request('PUT', `/menus/${m.key}`, { locale: m.locale ?? 'en', title: m.title, items: m.items });
    console.log('menu updated', m.key);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
