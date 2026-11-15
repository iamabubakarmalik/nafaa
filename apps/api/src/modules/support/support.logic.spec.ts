import {
  SupportRateLimiter,
  adminCan,
  adminCanAny,
  canDeleteMessage,
  canEditMessage,
  canPurgeMessage,
  canSetStatus,
  checkRecording,
  checkUpload,
  cleanAttachments,
  historyAfterEdit,
  hoursText,
  kindForAttachments,
  merchantAttachments,
  merchantCanSee,
  nextWaitingSince,
  normalizeSupportSettings,
  pickRoundRobin,
  proactiveDue,
  readHistory,
  statusAfterAdminMessage,
  statusAfterHandover,
  statusAfterMerchantMessage,
  supportSideForRole,
  visibleToMerchant,
  withinWorkingHours,
} from './support.logic';
import { pickLang, systemText } from './support.copy';
import { matchKnowledge } from './support.knowledge';
import { fillTemplate } from './support.proactive-copy';

describe('support: status transitions', () => {
  const ai = { aiEnabled: true, humanInvolved: false };
  it('merchant messages', () => {
    expect(statusAfterMerchantMessage('BOT', ai)).toBe('BOT');
    expect(statusAfterMerchantMessage('BOT', { ...ai, aiEnabled: false })).toBe('WAITING');
    expect(statusAfterMerchantMessage('WAITING', ai)).toBe('WAITING');
    expect(statusAfterMerchantMessage('OPEN', ai)).toBe('OPEN');
    expect(statusAfterMerchantMessage('PENDING_MERCHANT', ai)).toBe('OPEN');
    expect(statusAfterMerchantMessage('RESOLVED', { ...ai, humanInvolved: true })).toBe('OPEN');
    expect(statusAfterMerchantMessage('RESOLVED', ai)).toBe('BOT');
    expect(statusAfterMerchantMessage('RESOLVED', { aiEnabled: false, humanInvolved: false })).toBe('WAITING');
    expect(statusAfterMerchantMessage('CLOSED', ai)).toBe('CLOSED');
  });

  it('team messages: replies wait on the merchant, notes change nothing', () => {
    expect(statusAfterAdminMessage('WAITING', false)).toBe('PENDING_MERCHANT');
    expect(statusAfterAdminMessage('OPEN', false)).toBe('PENDING_MERCHANT');
    expect(statusAfterAdminMessage('BOT', false)).toBe('PENDING_MERCHANT');
    expect(statusAfterAdminMessage('RESOLVED', false)).toBe('PENDING_MERCHANT');
    expect(statusAfterAdminMessage('OPEN', true)).toBe('OPEN');
    expect(statusAfterAdminMessage('CLOSED', false)).toBe('CLOSED');
  });

  it('handover', () => {
    expect(statusAfterHandover('BOT')).toBe('WAITING');
    expect(statusAfterHandover('RESOLVED')).toBe('WAITING');
    expect(statusAfterHandover('OPEN')).toBe('OPEN');
    expect(statusAfterHandover('PENDING_MERCHANT')).toBe('PENDING_MERCHANT');
  });

  it('manual changes', () => {
    expect(canSetStatus('MERCHANT', 'BOT', 'WAITING')).toBe(true);
    expect(canSetStatus('MERCHANT', 'OPEN', 'RESOLVED')).toBe(true);
    expect(canSetStatus('MERCHANT', 'OPEN', 'CLOSED')).toBe(false);
    expect(canSetStatus('MERCHANT', 'CLOSED', 'RESOLVED')).toBe(false);
    expect(canSetStatus('MERCHANT', 'OPEN', 'PENDING_MERCHANT')).toBe(false);
    expect(canSetStatus('ADMIN', 'OPEN', 'RESOLVED')).toBe(true);
    expect(canSetStatus('ADMIN', 'RESOLVED', 'OPEN')).toBe(true);
    expect(canSetStatus('ADMIN', 'OPEN', 'BOT')).toBe(false);
    expect(canSetStatus('ADMIN', 'CLOSED', 'OPEN')).toBe(true);
    expect(canSetStatus('ADMIN', 'CLOSED', 'WAITING')).toBe(false);
  });

  it('SLA timer starts once and clears when the team replied', () => {
    const t0 = new Date('2026-11-15T10:00:00Z');
    const t1 = new Date('2026-11-15T10:05:00Z');
    expect(nextWaitingSince(null, 'WAITING', t0)).toEqual(t0);
    expect(nextWaitingSince(t0, 'OPEN', t1)).toEqual(t0);
    expect(nextWaitingSince(t0, 'PENDING_MERCHANT', t1)).toBeNull();
    expect(nextWaitingSince(null, 'BOT', t1)).toBeNull();
  });
});

describe('support: permissions', () => {
  it('sides by role', () => {
    expect(supportSideForRole('OWNER', 't1')).toBe('MERCHANT');
    expect(supportSideForRole('CASHIER', 't1')).toBe('MERCHANT');
    expect(supportSideForRole('SUPER_ADMIN', 'sys')).toBe('ADMIN');
    expect(supportSideForRole('ADMIN_STAFF', 'sys')).toBe('ADMIN');
    expect(supportSideForRole('PARTNER', 't1')).toBeNull();
    expect(supportSideForRole('OWNER', null)).toBeNull();
    expect(supportSideForRole(undefined, 't1')).toBeNull();
  });

  it('admin keys', () => {
    expect(adminCan({ isSuperAdmin: true, permissions: [] }, 'support.manage')).toBe(true);
    expect(adminCan({ isSuperAdmin: false, permissions: ['support.view'] }, 'support.reply')).toBe(false);
    expect(adminCan({ isSuperAdmin: false, permissions: ['support.reply'] }, 'support.view')).toBe(false);
    expect(adminCan(null, 'support.view')).toBe(false);
    expect(adminCanAny({ isSuperAdmin: false, permissions: ['communications.manage'] }, ['support.reply', 'communications.manage'])).toBe(true);
  });

  it('tenant isolation and internal notes', () => {
    expect(merchantCanSee({ tenantId: 'a' }, { tenantId: 'a' })).toBe(true);
    expect(merchantCanSee({ tenantId: 'a' }, { tenantId: 'b' })).toBe(false);
    expect(merchantCanSee({ tenantId: 'a' }, { tenantId: null })).toBe(false);
    expect(visibleToMerchant({ internal: true })).toBe(false);
    expect(visibleToMerchant({ internal: false })).toBe(true);
  });

  it('edit and delete', () => {
    const now = new Date('2026-11-15T10:10:00Z');
    const m = { sender: 'MERCHANT', senderUserId: 'u1', kind: 'TEXT', createdAt: new Date('2026-11-15T10:00:00Z'), deletedAt: null };
    expect(canEditMessage(m, { id: 'u1', side: 'MERCHANT' }, now)).toBe(true);
    expect(canEditMessage(m, { id: 'u2', side: 'MERCHANT' }, now)).toBe(false);
    expect(canEditMessage(m, { id: 'u1', side: 'MERCHANT' }, new Date('2026-11-15T10:20:00Z'))).toBe(false);
    expect(canEditMessage({ ...m, kind: 'VOICE' }, { id: 'u1', side: 'MERCHANT' }, now)).toBe(false);
    expect(canDeleteMessage(m, { id: 'u1', side: 'MERCHANT' })).toBe(true);
    expect(canDeleteMessage(m, { id: 'a1', side: 'ADMIN' })).toBe(false);
    expect(canDeleteMessage(m, { id: 'a1', side: 'ADMIN', manage: true })).toBe(true);
    expect(canDeleteMessage({ ...m, deletedAt: now }, { id: 'u1', side: 'MERCHANT' })).toBe(false);
  });
});

describe('support: round-robin assignment', () => {
  it('never-assigned first, then longest ago, then lighter load, then id', () => {
    const d = (s: string) => new Date(`2026-11-15T${s}:00Z`);
    expect(pickRoundRobin([])).toBeNull();
    expect(pickRoundRobin([{ id: 'a', lastAssignedAt: d('10:00'), openCount: 0 }, { id: 'b', lastAssignedAt: null, openCount: 5 }])).toBe('b');
    expect(pickRoundRobin([{ id: 'a', lastAssignedAt: d('10:05'), openCount: 0 }, { id: 'b', lastAssignedAt: d('10:00'), openCount: 3 }])).toBe('b');
    expect(pickRoundRobin([{ id: 'a', lastAssignedAt: d('10:00'), openCount: 2 }, { id: 'b', lastAssignedAt: d('10:00'), openCount: 1 }])).toBe('b');
    expect(pickRoundRobin([{ id: 'b', lastAssignedAt: null, openCount: 0 }, { id: 'a', lastAssignedAt: null, openCount: 0 }])).toBe('a');
  });
});

describe('support: rate limit', () => {
  it('burst and per-minute caps, refused attempts not counted', () => {
    const rl = new SupportRateLimiter({ burstMax: 3, burstWindowMs: 5_000, minuteMax: 5 });
    const t = 1_000_000;
    expect(rl.hit('u', t).ok).toBe(true);
    expect(rl.hit('u', t + 100).ok).toBe(true);
    expect(rl.hit('u', t + 200).ok).toBe(true);
    const blocked = rl.hit('u', t + 300);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBe(4_700);
    expect(rl.hit('other', t + 300).ok).toBe(true);
    expect(rl.hit('u', t + 6_000).ok).toBe(true);
    expect(rl.hit('u', t + 12_000).ok).toBe(true);
    const minute = rl.hit('u', t + 18_000);
    expect(minute.ok).toBe(false);
    expect(rl.hit('u', t + 61_000).ok).toBe(true);
  });
});

describe('support: settings, hours, uploads, copy', () => {
  it('normalizes settings and keeps three-language texts', () => {
    const s = normalizeSupportSettings({ workingHours: { days: [1, 1, 9, 2], start: '25:00' }, autoAssign: 'x', welcomeMessage: 'Salam', awayMessage: { en: 'Away' } });
    expect(s.workingHours.days).toEqual([1, 2]);
    expect(s.workingHours.start).toBe('09:00');
    expect(s.autoAssign).toBe('round_robin');
    expect(s.welcomeMessage.roman).toBe('Salam');
    expect(s.welcomeMessage.en).toBeTruthy();
    expect(s.awayMessage.en).toBe('Away');
    expect(s.awayMessage.ur).toBeTruthy();
  });

  it('working hours in Pakistan time', () => {
    const wh = { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '21:00' };
    expect(withinWorkingHours(wh, new Date('2026-11-16T05:00:00Z'))).toBe(true); // Mon 10:00 PKT
    expect(withinWorkingHours(wh, new Date('2026-11-16T03:00:00Z'))).toBe(false); // Mon 08:00 PKT
    expect(withinWorkingHours(wh, new Date('2026-11-15T05:00:00Z'))).toBe(false); // Sun
    const night = { days: [1], start: '22:00', end: '02:00' };
    expect(withinWorkingHours(night, new Date('2026-11-16T18:00:00Z'))).toBe(true); // Mon 23:00 PKT
    expect(withinWorkingHours(night, new Date('2026-11-16T20:00:00Z'))).toBe(true); // Tue 01:00 PKT, Monday's shift
    expect(hoursText(wh)).toBe('Mon–Sat 09:00–21:00 (PKT)');
  });

  it('uploads: size, type and extension', () => {
    expect(checkUpload({ mime: 'image/png', bytes: 1000, name: 'a.png' })).toBeNull();
    expect(checkUpload({ mime: 'audio/webm;codecs=opus', bytes: 1000, name: 'voice.webm' })).toBeNull();
    expect(checkUpload({ mime: 'audio/mp4', bytes: 1000, name: 'voice.m4a' })).toBeNull();
    expect(checkUpload({ mime: 'application/pdf', bytes: 16 * 1024 * 1024, name: 'a.pdf' })).toMatch(/15 MB/);
    expect(checkUpload({ mime: 'application/x-msdownload', bytes: 10, name: 'a.exe' })).toBeTruthy();
    expect(checkUpload({ mime: 'image/png', bytes: 10, name: 'a.png.exe' })).toBeTruthy();
    expect(checkUpload({ mime: 'image/svg+xml', bytes: 10, name: 'a.svg' })).toBeTruthy();
    expect(kindForAttachments([{ mime: 'audio/webm' }])).toBe('VOICE');
    expect(kindForAttachments([{ mime: 'image/png' }])).toBe('IMAGE');
    expect(kindForAttachments([{ mime: 'application/pdf' }])).toBe('FILE');
    const own = (u: string) => u.startsWith('https://res.cloudinary.com/');
    const clean = cleanAttachments([
      { url: 'https://res.cloudinary.com/x/a.png', mime: 'image/png', bytes: 10, name: 'a.png' },
      { url: 'https://evil.example/a.png', mime: 'image/png', bytes: 10, name: 'a.png' },
      { url: 'https://res.cloudinary.com/x/v.webm', mime: 'audio/webm', bytes: 10, name: 'v.webm', durationSec: 999, waveform: [2, -1, 0.5] },
    ], own);
    expect(clean).toHaveLength(2);
    expect(clean[1].durationSec).toBe(125);
    expect(clean[1].waveform).toEqual([1, 0, 0.5]);
  });

  it('copy: language pick and team wording', () => {
    expect(pickLang(null, 'ur')).toBe('ur');
    expect(pickLang('roman', 'en')).toBe('roman');
    expect(pickLang('fr', undefined)).toBe('en');
    expect(systemText('agent_joined', 'roman', { name: 'Ahmed' })).toBe('Ahmed (Nafaa team) chat mein shamil ho gaye');
    for (const lang of ['en', 'ur', 'roman'] as const) {
      expect(systemText('handover', lang)).not.toMatch(/human|insaan/i);
    }
  });

  it('knowledge match', () => {
    expect(matchKnowledge('printer print nahi kar raha')?.id).toBe('printer');
    expect(matchKnowledge('hello')).toBeNull();
  });
});

describe('support: proactive messages', () => {
  const s = normalizeSupportSettings({}).proactive;
  // Mon 16 Nov 2026, 12:00 PKT
  const now = new Date('2026-11-16T07:00:00Z');
  const base = {
    createdAt: new Date(now.getTime() - 10 * 60_000), tenantStatus: 'TRIAL', paused: false, lastActiveAt: now, products: 0, firstSaleAt: null,
    trialEndsAt: new Date(now.getTime() + 10 * 86_400_000), trialEndedAt: null, paid: false, sent: new Set<string>(), lastProactiveAt: null, optOut: false, merchantWroteAt: null,
  };
  const day = 86_400_000;

  it('welcome first, once, not in quiet hours, never to suspended or paused shops', () => {
    expect(proactiveDue(base, s, now)).toBe('welcome');
    expect(proactiveDue({ ...base, createdAt: new Date(now.getTime() - 60_000) }, s, now)).toBeNull();
    expect(proactiveDue({ ...base, sent: new Set(['welcome']) }, s, now)).toBeNull();
    expect(proactiveDue(base, s, new Date('2026-11-16T18:00:00Z'))).toBeNull(); // 23:00 PKT
    expect(proactiveDue({ ...base, tenantStatus: 'SUSPENDED' }, s, now)).toBeNull();
    expect(proactiveDue({ ...base, paused: true }, s, now)).toBeNull();
    expect(proactiveDue({ ...base, createdAt: new Date(now.getTime() - 30 * day) }, s, now)).not.toBe('welcome');
  });

  it('at most one a day; check-ins stop on opt-out or a recent message from the shop', () => {
    const after = { ...base, createdAt: new Date(now.getTime() - 1.5 * day), sent: new Set(['welcome']) };
    expect(proactiveDue({ ...after, lastProactiveAt: new Date(now.getTime() - 2 * 3_600_000) }, s, now)).toBeNull();
    expect(proactiveDue({ ...after, lastProactiveAt: new Date(now.getTime() - 1.2 * day) }, s, now)).toBe('day1_no_products');
    expect(proactiveDue({ ...after, optOut: true }, s, now)).toBeNull();
    expect(proactiveDue({ ...after, merchantWroteAt: new Date(now.getTime() - 3_600_000) }, s, now)).toBeNull();
  });

  it('lifecycle order and conditions', () => {
    const old = { ...base, createdAt: new Date(now.getTime() - 20 * day), sent: new Set(['welcome']), products: 5 };
    expect(proactiveDue({ ...old, trialEndsAt: null, trialEndedAt: new Date(now.getTime() - 2 * day) }, s, now)).toBe('trial_ended');
    expect(proactiveDue({ ...old, trialEndsAt: null, trialEndedAt: new Date(now.getTime() - 20 * day) }, s, now)).toBeNull();
    expect(proactiveDue({ ...old, trialEndsAt: new Date(now.getTime() + 1.5 * day) }, s, now)).toBe('trial_ending');
    expect(proactiveDue({ ...old, firstSaleAt: new Date(now.getTime() - day) }, s, now)).toBe('first_sale');
    expect(proactiveDue({ ...old, firstSaleAt: new Date(now.getTime() - 10 * day) }, s, now)).toBeNull();
    expect(proactiveDue({ ...old, lastActiveAt: new Date(now.getTime() - 4 * day) }, s, now)).toBe('inactive_3d');
    expect(proactiveDue({ ...old, paid: true, trialEndsAt: new Date(now.getTime() + day), lastActiveAt: new Date(now.getTime() - 4 * day) }, s, now)).toBeNull();
    const off = normalizeSupportSettings({ proactive: { messages: { inactive_3d: { enabled: false } } } }).proactive;
    expect(proactiveDue({ ...old, lastActiveAt: new Date(now.getTime() - 4 * day) }, off, now)).toBeNull();
  });

  it('templates fill real values and keep the team wording', () => {
    const t = fillTemplate(s.messages.trial_ending.template.roman, { owner: 'Ali', days: 2, trialEnd: '18 November', products: 12, bills: 30, customers: 4, planLink: 'x/billing' });
    expect(t).toContain('12 products');
    expect(t).not.toMatch(/\{\{/);
    for (const k of Object.keys(s.messages) as Array<keyof typeof s.messages>) {
      for (const lang of ['en', 'ur', 'roman'] as const) {
        expect(s.messages[k].template[lang]).toBeTruthy();
        expect(s.messages[k].template[lang]).not.toMatch(/insaan|human|chhoot/i);
      }
    }
  });
});

describe('support: keeping everything (history, soft delete, recordings)', () => {
  it('edit keeps the replaced text, oldest first', () => {
    const created = new Date('2026-11-15T10:00:00Z');
    const first = historyAfterEdit(null, { text: 'pehla', createdAt: created, editedAt: null, senderUserId: 'u1' });
    expect(first).toEqual([{ text: 'pehla', at: created.toISOString(), by: 'u1' }]);
    const edited = new Date('2026-11-15T10:02:00Z');
    const second = historyAfterEdit(first, { text: 'doosra', createdAt: created, editedAt: edited, senderUserId: 'u1' });
    expect(second.map((v) => v.text)).toEqual(['pehla', 'doosra']);
    expect(second[1].at).toBe(edited.toISOString());
    expect(readHistory('junk')).toEqual([]);
    expect(readHistory([{ text: 5 }, null])).toEqual([{ text: null, at: new Date(0).toISOString(), by: null }]);
  });

  it('only a super admin removes for good, once', () => {
    expect(canPurgeMessage({ purgedAt: null }, { isSuperAdmin: true })).toBe(true);
    expect(canPurgeMessage({ purgedAt: null }, { isSuperAdmin: false })).toBe(false);
    expect(canPurgeMessage({ purgedAt: new Date() }, { isSuperAdmin: true })).toBe(false);
  });

  it('shops never get call recordings', () => {
    const atts = [
      { url: 'u1', name: 'a', mime: 'audio/webm', bytes: 1, recording: 'call' as const },
      { url: 'u2', name: 'b', mime: 'image/png', bytes: 1 },
    ];
    expect(merchantAttachments(atts).map((a) => a.url)).toEqual(['u2']);
  });

  it('recording checks', () => {
    expect(checkRecording({ mime: 'audio/webm;codecs=opus', bytes: 1000 })).toBeNull();
    expect(checkRecording({ mime: 'video/webm', bytes: 50 * 1024 * 1024 })).toBeNull();
    expect(checkRecording({ mime: 'video/webm', bytes: 200 * 1024 * 1024 })).not.toBeNull();
    expect(checkRecording({ mime: 'application/pdf', bytes: 10 })).not.toBeNull();
    expect(checkRecording({ mime: 'audio/webm', bytes: 0 })).not.toBeNull();
  });

  it('recording calls is on unless turned off', () => {
    expect(normalizeSupportSettings(null).recordCalls).toBe(true);
    expect(normalizeSupportSettings({ recordCalls: false }).recordCalls).toBe(false);
    expect(normalizeSupportSettings({ recordCalls: 'no' }).recordCalls).toBe(true);
  });
});
