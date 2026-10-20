#!/usr/bin/env node
/**
 * Captures real screenshots of the Nafaa web app for the marketing site
 * (ARCH 4.6) and, only when asked, uploads them to the CMS media library.
 *
 * Default is a dry run: validate the manifest, sign in to each demo account,
 * capture every shot at 2x DPR into scripts/capture/out/, and write
 * results.json plus a review page (out/index.html). Nothing is uploaded.
 *
 * Usage (from apps/site):
 *   node scripts/capture/capture.mjs                    dry run, all shots
 *   node scripts/capture/capture.mjs --only=grocery-pos,app-login
 *   node scripts/capture/capture.mjs --account=bakery   one account's shots
 *   node scripts/capture/capture.mjs --public           shots that need no sign-in
 *   node scripts/capture/capture.mjs --validate         check the manifest only
 *   node scripts/capture/capture.mjs --upload           capture, then upload reviewed shots
 *
 * Options:
 *   --manifest=<file>      default scripts/capture/manifest.json
 *   --out=<dir>            default scripts/capture/out
 *   --base-url=<url>       app URL (default from manifest; env CAPTURE_BASE_URL)
 *   --api-url=<url>        app API for sign-in (default from manifest; env CAPTURE_API_URL)
 *   --headed               show the browser
 *   --include-unreviewed   with --upload, also upload shots whose alt is not marked reviewed
 *   --allow-remote         with --upload, allow a CMS API that is not localhost
 *
 * Environment:
 *   CAPTURE_<ACCOUNT>_EMAIL / _PASSWORD   per account, names set in the manifest
 *   CAPTURE_DEMO_PATTERN                  regex a demo tenant must match (default "demo")
 *   CAPTURE_PLAYWRIGHT                    path to a playwright or playwright-core package dir
 *   CAPTURE_CHANNEL                       browser channel, e.g. "chrome" (default: bundled
 *                                         Chromium, falling back to installed Chrome)
 *   CMS_API_URL, CMS_ADMIN_TOKEN          for --upload only
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEVICES, loadContract, loadManifest, shotSettings } from './lib/manifest.mjs';
import { apiGet, assertDemoTenant, firstId, login, setPersonalMode, storageEntries } from './lib/session.mjs';
import { contactSheet, pngSize, sha1 } from './lib/files.mjs';
import { assertUploadTarget, uploadShot } from './lib/upload.mjs';

// The contract is a .ts file loaded through Node's type stripping; apps/site
// has no "type" field, so Node warns once per import. That warning is noise here.
const emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest) => {
  const code = typeof rest[0] === 'object' ? rest[0]?.code : rest[1];
  if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return;
  emitWarning(warning, ...rest);
};

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, '../..');

const NAVIGATION_TIMEOUT_MS = 45_000;
const IDLE_TIMEOUT_MS = 15_000;
const SIGN_IN_PATHS = ['/login', '/onboarding', '/auth/'];

/** CSS that freezes motion and hides carets so repeated captures match. */
const STABILIZE_CSS = `
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
html { scroll-behavior: auto !important; }
`;

function parseArgs(argv) {
  const args = { flags: new Set(), values: {} };
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    if (rest.length > 0) args.values[key] = rest.join('=');
    else args.flags.add(key);
  }
  return args;
}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.CAPTURE_PLAYWRIGHT) {
    const dir = path.resolve(process.env.CAPTURE_PLAYWRIGHT);
    candidates.push(pathToFileURL(path.join(dir, 'index.mjs')).href);
  }
  candidates.push('playwright', 'playwright-core');
  for (const specifier of candidates) {
    try {
      const mod = await import(specifier);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    'Playwright is not installed. Add it to apps/site devDependencies (`playwright-core` works with an installed ' +
      'Chrome) or point CAPTURE_PLAYWRIGHT at a playwright package directory.',
  );
}

async function launchBrowser(chromium, headed) {
  const channel = process.env.CAPTURE_CHANNEL;
  const options = { headless: !headed };
  if (channel) return chromium.launch({ ...options, channel });
  try {
    return await chromium.launch(options);
  } catch (error) {
    // No bundled Chromium (playwright-core): use the installed Chrome.
    try {
      return await chromium.launch({ ...options, channel: 'chrome' });
    } catch {
      throw error;
    }
  }
}

function credentialsFor(account) {
  return { email: process.env[account.emailEnv], password: process.env[account.passwordEnv] };
}

function shotPath(shot, params) {
  return shot.path.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(params[key] ?? ''));
}

async function runAction(page, action) {
  if ('click' in action) await page.locator(action.click).first().click({ timeout: 10_000 });
  else if ('fill' in action) await page.locator(action.fill[0]).first().fill(String(action.fill[1]), { timeout: 10_000 });
  else if ('press' in action) await page.keyboard.press(action.press);
  else if ('hover' in action) await page.locator(action.hover).first().hover({ timeout: 10_000 });
  else if ('waitFor' in action) await page.locator(action.waitFor).first().waitFor({ timeout: 20_000 });
  else if ('scroll' in action) await page.locator(action.scroll).first().scrollIntoViewIfNeeded({ timeout: 10_000 });
  else if ('wait' in action) await page.waitForTimeout(Number(action.wait));
}

/** Captures one shot into `outDir`; returns the result record. */
async function captureShot({ browser, manifest, shot, session, baseUrl, apiUrl, outDir }) {
  const settings = shotSettings(manifest, shot);
  const record = shotRecord(manifest, shot);

  let params = {};
  if (shot.resolve) {
    const id = firstId(await apiGet({ apiUrl, session }, shot.resolve.api));
    if (!id) return { ...record, status: 'skipped', reason: `no item found at ${shot.resolve.api} for {${shot.resolve.param}}` };
    params = { [shot.resolve.param]: id };
  }
  const appPath = shotPath(shot, params);
  if (session) {
    try {
      await setPersonalMode({ apiUrl, session }, settings.theme);
    } catch (error) {
      return { ...record, status: 'failed', reason: `could not set ${settings.theme} mode: ${error.message}` };
    }
  }

  const context = await browser.newContext({
    ...DEVICES[settings.device],
    locale: 'en-PK',
    timezoneId: 'Asia/Karachi',
    colorScheme: settings.theme,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  try {
    const entries = storageEntries(session, settings.locale, settings.theme);
    const origin = new URL(baseUrl).origin;
    await context.addInitScript(
      ({ items, appOrigin }) => {
        if (window.location.origin !== appOrigin) return;
        for (const [key, value] of items) window.localStorage.setItem(key, value);
      },
      { items: entries, appOrigin: origin },
    );
    if (shot.clock) await context.clock?.setFixedTime(new Date(shot.clock));

    const page = await context.newPage();
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
    await page.goto(new URL(appPath, baseUrl).href, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: IDLE_TIMEOUT_MS }).catch(() => {});

    const landed = new URL(page.url()).pathname;
    if (session && SIGN_IN_PATHS.some((prefix) => landed.startsWith(prefix))) {
      return { ...record, status: 'failed', reason: `redirected to ${landed}; the session was not accepted or onboarding is not finished` };
    }

    await page.addStyleTag({ content: STABILIZE_CSS });
    if (settings.hide.length > 0) {
      await page.addStyleTag({ content: `${settings.hide.join(',\n')} { visibility: hidden !important; }` });
    }
    if (settings.remove.length > 0) {
      await page.addStyleTag({ content: `${settings.remove.join(',\n')} { display: none !important; }` });
    }
    if (shot.waitFor) await page.locator(shot.waitFor).first().waitFor({ timeout: 20_000 });
    for (const action of shot.actions ?? []) await runAction(page, action);
    if (shot.waitGone) await page.locator(shot.waitGone).first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
    // Autofocused inputs would show a focus ring in every capture.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      return document.fonts.ready.then(() => true);
    });
    await page.waitForTimeout(settings.waitMs);
    // The app shows an offline banner and an "Offline" pill when the browser
    // reports no network; such a capture would misrepresent the product.
    if (session && !(await page.evaluate(() => navigator.onLine))) {
      return { ...record, status: 'failed', reason: 'the browser reported offline during capture; run again' };
    }

    let buffer;
    if (shot.clip) {
      const target = page.locator(shot.clip).first();
      buffer = (await target.count()) > 0 ? await target.screenshot({ type: 'png' }) : null;
      if (!buffer) return { ...record, status: 'failed', reason: `clip selector not found: ${shot.clip}` };
    } else {
      buffer = await page.screenshot({ type: 'png', fullPage: settings.fullPage });
    }

    const fileName = `${shot.id}.png`;
    await writeFile(path.join(outDir, fileName), buffer);
    const size = pngSize(buffer);
    return {
      ...record,
      status: 'captured',
      url: appPath,
      file: path.join(outDir, fileName),
      fileName,
      bytes: buffer.byteLength,
      width: size?.width ?? null,
      height: size?.height ?? null,
      sha1: sha1(buffer),
    };
  } catch (error) {
    return { ...record, status: 'failed', reason: error.message.split('\n')[0] };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestFile = path.resolve(args.values.manifest ?? path.join(here, 'manifest.json'));
  const outDir = path.resolve(args.values.out ?? path.join(here, 'out'));

  const contract = await loadContract(siteRoot);
  const { manifest, problems } = await loadManifest(manifestFile, contract);
  if (problems.length > 0) {
    console.error(`Manifest has ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Manifest OK: ${manifest.shots.length} shots, ${Object.keys(manifest.accounts ?? {}).length} accounts.`);
  if (args.flags.has('validate')) return;

  const baseUrl = args.values['base-url'] ?? process.env.CAPTURE_BASE_URL ?? manifest.defaults?.baseUrl;
  const apiUrl = (args.values['api-url'] ?? process.env.CAPTURE_API_URL ?? manifest.defaults?.apiUrl ?? '').replace(/\/$/, '');
  const upload = args.flags.has('upload');
  const only = args.values.only ? new Set(args.values.only.split(',').map((id) => id.trim())) : null;

  let shots = manifest.shots;
  if (only) shots = shots.filter((shot) => only.has(shot.id));
  if (args.values.account) shots = shots.filter((shot) => shot.account === args.values.account);
  if (args.flags.has('public')) shots = shots.filter((shot) => !shot.account);
  if (shots.length === 0) {
    console.error('No shots match the filters.');
    process.exit(1);
  }

  let cmsApiUrl = null;
  let cmsToken = null;
  if (upload) {
    cmsApiUrl = (process.env.CMS_API_URL ?? apiUrl).replace(/\/$/, '');
    cmsToken = process.env.CMS_ADMIN_TOKEN;
    if (!cmsToken) throw new Error('--upload needs CMS_ADMIN_TOKEN (an apps/admin access token).');
    assertUploadTarget(cmsApiUrl, args.flags.has('allow-remote'));
  }

  // The app must be up before anything else happens.
  const probe = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!probe?.ok) {
    throw new Error(`The web app is not reachable at ${baseUrl}. Start it with: pnpm --filter @nafaa/web dev (from the repo root).`);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const chromium = await loadPlaywright();
  const browser = await launchBrowser(chromium, args.flags.has('headed'));
  const results = [];

  try {
    const byAccount = new Map();
    for (const shot of shots) {
      const key = shot.account ?? '';
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key).push(shot);
    }

    for (const [accountKey, accountShots] of byAccount) {
      let session = null;
      if (accountKey) {
        const account = manifest.accounts[accountKey];
        const { email, password } = credentialsFor(account);
        if (!email || !password) {
          const reason = `no credentials: set ${account.emailEnv} and ${account.passwordEnv}`;
          for (const shot of accountShots) results.push({ ...shotRecord(manifest, shot), status: 'skipped', reason });
          console.log(`- ${accountKey}: skipped ${accountShots.length} shot(s), ${reason}`);
          continue;
        }
        try {
          session = await login({ apiUrl, email, password });
          assertDemoTenant(session);
        } catch (error) {
          for (const shot of accountShots) results.push({ ...shotRecord(manifest, shot), status: 'skipped', reason: error.message });
          console.log(`- ${accountKey}: skipped, ${error.message}`);
          continue;
        }
        console.log(`- ${accountKey}: signed in as demo tenant "${session.tenant.name}"`);
      }

      for (const shot of accountShots) {
        const result = await captureShot({ browser, manifest, shot, session, baseUrl, apiUrl, outDir });
        results.push(result);
        const detail = result.status === 'captured' ? `${result.width}x${result.height}, ${(result.bytes / 1024).toFixed(0)} KB` : result.reason;
        console.log(`  ${result.status.padEnd(8)} ${shot.id} (${detail})`);
      }
    }
  } finally {
    await browser.close();
  }

  if (upload) {
    for (const result of results) {
      if (result.status !== 'captured') continue;
      if (!result.reviewed && !args.flags.has('include-unreviewed')) {
        result.upload = { status: 'held', reason: 'alt text not marked reviewed in the manifest' };
        continue;
      }
      if (result.bytes > contract.MEDIA_LIMITS.imageMaxBytes) {
        result.upload = { status: 'failed', reason: `file is over ${contract.MEDIA_LIMITS.imageMaxBytes} bytes` };
        continue;
      }
      try {
        const buffer = await readFile(result.file);
        const shot = manifest.shots.find((item) => item.id === result.id);
        result.upload = await uploadShot({ apiUrl: cmsApiUrl, token: cmsToken, buffer, fileName: result.fileName, shot });
      } catch (error) {
        result.upload = { status: 'failed', reason: error.message };
      }
      console.log(`  upload ${result.upload.status.padEnd(9)} ${result.id}${result.upload.mediaId ? ` -> ${result.upload.mediaId}` : ''}`);
    }
  }

  const summary = {
    when: new Date().toISOString(),
    mode: upload ? 'upload' : 'dry-run',
    baseUrl,
    manifest: path.relative(siteRoot, manifestFile),
    counts: {
      captured: results.filter((r) => r.status === 'captured').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
    },
    results: results.map(({ file, ...rest }) => ({ ...rest, file: file ? path.relative(siteRoot, file) : null })),
  };
  await writeFile(path.join(outDir, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(path.join(outDir, 'index.html'), contactSheet(results, { when: summary.when, baseUrl }));

  console.log(
    `\n${summary.mode}: ${summary.counts.captured} captured, ${summary.counts.skipped} skipped, ${summary.counts.failed} failed.` +
      `\nReview: ${path.relative(process.cwd(), path.join(outDir, 'index.html'))}`,
  );
  if (upload) {
    const created = results.filter((r) => r.upload?.status === 'created');
    if (created.length > 0) console.log('Add these mediaId values to the manifest so later runs replace instead of re-upload.');
  }
  if (summary.counts.failed > 0) process.exitCode = 1;
}

function shotRecord(manifest, shot) {
  const settings = shotSettings(manifest, shot);
  return {
    id: shot.id,
    path: shot.path,
    device: settings.device,
    theme: settings.theme,
    frame: settings.frame,
    alt: shot.alt,
    caption: shot.caption ?? null,
    tags: shot.tags,
    reviewed: shot.reviewed === true,
    mediaId: shot.mediaId ?? null,
    account: shot.account ?? null,
  };
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
