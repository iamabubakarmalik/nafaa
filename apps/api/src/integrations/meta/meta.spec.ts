import * as crypto from 'crypto';
import {
  appSecretProof, canReply, catalogBatches, catalogDiff, catalogItemData, catalogItemHash, classifyGraphError, containerState, expiryFrom,
  facebookPlan, friendlyMetaError, instagramPlan, parseSignedRequest, parseWebhook, resolveRefs, signState, tokenErrorStatus, tokenHealth,
  usageFromHeaders, verifyHubSignature, verifyState, type CatalogItemInput,
} from './meta-graph';
import { decideMetaAccess } from './meta-access';

const SECRET = 'test-app-secret';
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeSigned = (payload: object, secret = SECRET) => {
  const p = b64url(JSON.stringify(payload));
  return `${b64url(crypto.createHmac('sha256', secret).update(p).digest())}.${p}`;
};

describe('webhook signature (X-Hub-Signature-256)', () => {
  const body = Buffer.from(JSON.stringify({ object: 'page', entry: [] }));
  const good = `sha256=${crypto.createHmac('sha256', SECRET).update(body).digest('hex')}`;

  it('accepts the right signature', () => expect(verifyHubSignature(body, good, SECRET)).toBe(true));
  it('rejects a wrong secret, a changed body, a missing or malformed header', () => {
    expect(verifyHubSignature(body, good, 'other')).toBe(false);
    expect(verifyHubSignature(Buffer.from(`${body} `), good, SECRET)).toBe(false);
    expect(verifyHubSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyHubSignature(body, 'sha1=abc', SECRET)).toBe(false);
  });
});

describe('signed_request', () => {
  it('parses a valid request', () => {
    const r = parseSignedRequest(makeSigned({ algorithm: 'HMAC-SHA256', user_id: '123', issued_at: 1 }), SECRET);
    expect(r?.user_id).toBe('123');
  });
  it('rejects a wrong signature, wrong algorithm and junk', () => {
    expect(parseSignedRequest(makeSigned({ algorithm: 'HMAC-SHA256', user_id: '1' }, 'nope'), SECRET)).toBeNull();
    expect(parseSignedRequest(makeSigned({ algorithm: 'MD5', user_id: '1' }), SECRET)).toBeNull();
    expect(parseSignedRequest('abc', SECRET)).toBeNull();
    expect(parseSignedRequest(undefined, SECRET)).toBeNull();
  });
});

describe('appsecret_proof and OAuth state', () => {
  it('is the HMAC of the token with the secret', () => {
    expect(appSecretProof('tok', SECRET)).toBe(crypto.createHmac('sha256', SECRET).update('tok').digest('hex'));
  });
  it('round-trips state and refuses tampering and expiry', () => {
    const s = signState({ tenantId: 't1', userId: 'u1', origin: 'http://localhost:5173' }, 'k', 1_000);
    expect(verifyState(s, 'k', 2_000)).toEqual({ tenantId: 't1', userId: 'u1', origin: 'http://localhost:5173' });
    expect(verifyState(s, 'other', 2_000)).toBeNull();
    expect(verifyState(`x${s}`, 'k', 2_000)).toBeNull();
    expect(verifyState(s, 'k', 1_000 + 31 * 60_000)).toBe('expired');
  });
});

describe('errors and token expiry', () => {
  it('classifies Graph errors', () => {
    expect(classifyGraphError({ code: 190, error_subcode: 463 })).toBe('token');
    expect(classifyGraphError({ code: 4 })).toBe('rate_limit');
    expect(classifyGraphError({ code: 80004 })).toBe('rate_limit');
    expect(classifyGraphError({ code: 10, error_subcode: 2018278 })).toBe('window');
    expect(classifyGraphError({ code: 200 })).toBe('permission');
    expect(classifyGraphError({ code: 9004 })).toBe('media');
    expect(classifyGraphError({ code: 2 })).toBe('transient');
    expect(classifyGraphError({ code: 100, error_subcode: 33 })).toBe('not_found');
    expect(classifyGraphError({}, 503)).toBe('transient');
  });
  it('maps token errors to REVOKED or EXPIRED', () => {
    expect(tokenErrorStatus({ code: 190, error_subcode: 458 })).toBe('REVOKED');
    expect(tokenErrorStatus({ code: 190, error_subcode: 463 })).toBe('EXPIRED');
  });
  it('gives plain messages without technical words', () => {
    for (const k of ['token', 'permission', 'rate_limit', 'window'] as const) expect(friendlyMetaError(k)).not.toMatch(/token|api|secret/i);
  });
  it('tells token health', () => {
    const now = new Date('2026-11-09T00:00:00Z');
    expect(tokenHealth(null, now)).toBe('ok');
    expect(tokenHealth(new Date('2026-12-30T00:00:00Z'), now)).toBe('ok');
    expect(tokenHealth(new Date('2026-11-12T00:00:00Z'), now)).toBe('expiring');
    expect(tokenHealth(new Date('2026-11-08T00:00:00Z'), now)).toBe('expired');
    expect(expiryFrom(5_184_000, 0)?.getTime()).toBe(5_184_000_000);
    expect(expiryFrom(0)).toBeNull();
  });
  it('reads usage headers', () => {
    const u = usageFromHeaders({ 'x-business-use-case-usage': JSON.stringify({ '123': [{ type: 'pages', call_count: 96, total_cputime: 10, total_time: 5, estimated_time_to_regain_access: 7 }] }) });
    expect(u).toEqual({ maxPct: 96, waitMin: 7 });
    expect(usageFromHeaders({ 'x-app-usage': '{"call_count":12}' }).maxPct).toBe(12);
  });
});

describe('Messenger 24 hour window', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  it('allows a reply within 24 hours of the last customer message', () => {
    expect(canReply(new Date('2026-11-09T00:00:00Z'), now).ok).toBe(true);
    expect(canReply(new Date('2026-11-08T11:00:00Z'), now).ok).toBe(false);
    expect(canReply(null, now).ok).toBe(false);
  });
});

describe('publish plans', () => {
  const img = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://cdn.x/${i}.jpg`, kind: 'image' as const }));

  it('Instagram single image: container then publish', () => {
    const plan = instagramPlan('ig1', { kind: 'POST', caption: 'Hi', media: img(1) })!;
    expect(plan.map((s) => [s.path, s.body])).toEqual([
      ['ig1/media', { image_url: 'https://cdn.x/0.jpg', caption: 'Hi' }],
      ['ig1/media_publish', { creation_id: '{{container}}' }],
    ]);
  });

  it('Instagram carousel: item containers, carousel container with children, publish', () => {
    const plan = instagramPlan('ig1', { kind: 'POST', caption: 'Sale', media: img(3) })!;
    expect(plan).toHaveLength(5);
    expect(plan[0].body).toEqual({ image_url: 'https://cdn.x/0.jpg', is_carousel_item: true });
    const carousel = plan[3];
    expect(carousel.body).toEqual({ media_type: 'CAROUSEL', caption: 'Sale', children: '{{c0}},{{c1}},{{c2}}' });
    expect(resolveRefs(carousel.body, { c0: 'a', c1: 'b', c2: 'c' }).children).toBe('a,b,c');
    expect(resolveRefs(plan[4].body, { container: 'K' })).toEqual({ creation_id: 'K' });
  });

  it('Instagram reel waits for processing; no media gives no plan', () => {
    const plan = instagramPlan('ig1', { kind: 'REEL', caption: 'R', media: [{ url: 'https://cdn.x/v.mp4', kind: 'video' }] })!;
    expect(plan[0].body).toMatchObject({ media_type: 'REELS', video_url: 'https://cdn.x/v.mp4' });
    expect(plan[0].waitReady).toBe(true);
    expect(instagramPlan('ig1', { kind: 'POST', caption: 'x', media: [] })).toBeNull();
    expect(containerState('IN_PROGRESS')).toBe('wait');
    expect(containerState('FINISHED')).toBe('ready');
    expect(containerState('ERROR')).toBe('failed');
  });

  it('Facebook: photo, multi-photo with attached_media, link post', () => {
    expect(facebookPlan('p1', { kind: 'POST', caption: 'c', media: img(1) })).toEqual([{ ref: 'post', method: 'POST', path: 'p1/photos', body: { url: 'https://cdn.x/0.jpg', caption: 'c' } }]);
    const multi = facebookPlan('p1', { kind: 'POST', caption: 'c', media: img(2) });
    expect(multi[0].body).toEqual({ url: 'https://cdn.x/0.jpg', published: false });
    expect(resolveRefs(multi[2].body, { p0: 'A', p1: 'B' })).toEqual({ message: 'c', attached_media: [{ media_fbid: 'A' }, { media_fbid: 'B' }] });
    expect(facebookPlan('p1', { kind: 'POST', caption: 'c', media: [], link: 'https://x.pk/p' })[0]).toMatchObject({ path: 'p1/feed', body: { message: 'c', link: 'https://x.pk/p' } });
  });
});

describe('catalog batch payloads', () => {
  const item = (over: Partial<CatalogItemInput> = {}): CatalogItemInput => ({
    id: 'p1', title: 'Lawn suit', description: '', link: 'https://shop.pk/p1', image: 'https://cdn/1.jpg', extraImages: [],
    price: 2500, availability: 'in_stock', brand: 'Shop', ...over,
  });

  it('maps fields per Meta spec, including sale price and backorder', () => {
    const d = catalogItemData(item({ salePrice: 1999, availability: 'backorder', groupId: 'g1', extraImages: ['https://cdn/2.jpg'] }));
    expect(d).toMatchObject({
      id: 'p1', title: 'Lawn suit', description: 'Lawn suit', availability: 'available for order', condition: 'new',
      price: '2500.00 PKR', sale_price: '1999.00 PKR', item_group_id: 'g1', additional_image_link: ['https://cdn/2.jpg'],
    });
    expect(catalogItemData(item({ salePrice: 3000 })).sale_price).toBeUndefined();
  });

  it('sends only changed items and deletes removed ones', () => {
    const a = item();
    const b = item({ id: 'p2', title: 'Kurta' });
    const sent = new Map([['p1', catalogItemHash(catalogItemData(a))], ['gone', 'x']]);
    const diff = catalogDiff([a, b], sent);
    expect(diff.upserts.map((u) => u.id)).toEqual(['p2']);
    expect(diff.deletes).toEqual(['gone']);
    expect(diff.unchanged).toBe(1);
    expect(catalogDiff([a, b], sent, true).upserts).toHaveLength(2);
  });

  it('splits requests into items_batch bodies', () => {
    const diff = catalogDiff([item(), item({ id: 'p2' }), item({ id: 'p3' })], new Map([['old', 'h']]));
    const batches = catalogBatches(diff, 2);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toMatchObject({ item_type: 'PRODUCT_ITEM', allow_upsert: true });
    expect(batches[0].requests[0]).toMatchObject({ method: 'UPDATE', data: { id: 'p1' } });
    expect(batches[1].requests[1]).toEqual({ method: 'DELETE', data: { id: 'old' } });
  });
});

describe('webhook parsing', () => {
  it('reads Messenger messages, echoes and page comments', () => {
    const r = parseWebhook({
      object: 'page',
      entry: [{
        id: 'PAGE', time: 1,
        messaging: [
          { sender: { id: 'U1' }, recipient: { id: 'PAGE' }, timestamp: 1_700_000_000_000, message: { mid: 'm1', text: 'Price?' } },
          { sender: { id: 'PAGE' }, recipient: { id: 'U1' }, timestamp: 1_700_000_001_000, message: { mid: 'm2', text: '2500', is_echo: true } },
        ],
        changes: [{ field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'c1', post_id: 'PAGE_1', parent_id: 'PAGE_1', from: { id: 'U2', name: 'Ali' }, message: 'DM', created_time: 1_700_000_000 } }],
      }],
    });
    expect(r.messages.map((m) => [m.participantId, m.echo])).toEqual([['U1', false], ['U1', true]]);
    expect(r.comments[0]).toMatchObject({ platform: 'FACEBOOK', commentId: 'c1', objectId: 'PAGE_1', parentId: null, authorName: 'Ali' });
  });

  it('reads Instagram comments and ignores other objects', () => {
    const r = parseWebhook({ object: 'instagram', entry: [{ id: 'IG', time: 1_700_000_000, changes: [{ field: 'comments', value: { id: 'k1', text: 'Nice', from: { id: 'X', username: 'sara' }, media: { id: 'M1' } } }] }] });
    expect(r.comments[0]).toMatchObject({ platform: 'INSTAGRAM', accountId: 'IG', commentId: 'k1', objectId: 'M1', authorName: 'sara' });
    expect(parseWebhook({ object: 'whatsapp_business_account', entry: [] })).toEqual({ messages: [], comments: [] });
  });
});

describe('access rule', () => {
  const env = { META_APP_ID: '1', META_APP_SECRET: 's' } as NodeJS.ProcessEnv;
  const c = { killSwitch: {}, comingSoon: {}, metaBetaShops: ['beta'] };
  it('beta shops are live before review; others see soon', () => {
    expect(decideMetaAccess('beta', c, env)).toEqual({ live: true, reason: null, beta: true });
    expect(decideMetaAccess('other', c, env).reason).toBe('soon');
  });
  it('after review everyone is live unless the tile is on; kill switch wins', () => {
    expect(decideMetaAccess('other', c, { ...env, META_APP_LIVE: '1' }).live).toBe(true);
    expect(decideMetaAccess('other', { ...c, comingSoon: { meta: true } }, { ...env, META_APP_LIVE: '1' }).live).toBe(false);
    expect(decideMetaAccess('beta', { ...c, killSwitch: { META: true } }, env).reason).toBe('paused');
    expect(decideMetaAccess('beta', c, {} as NodeJS.ProcessEnv).reason).toBe('not_configured');
  });
});
