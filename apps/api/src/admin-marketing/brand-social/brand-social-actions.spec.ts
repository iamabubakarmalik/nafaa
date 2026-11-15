import { commentActions, normalizeXPoll, platformActions, scopeGap, sumMetrics, xPollIssues } from './brand-social-actions.logic';
import { mergePostOptions, normalizePostOptions } from './brand-social-tiktok.logic';
import { validatePost } from './brand-social.logic';
import type { PlatformPublishState } from './brand-social.types';

const live = (extra: Partial<PlatformPublishState> = {}): PlatformPublishState => ({ status: 'PUBLISHED', postId: '123', permalink: 'https://x', attempts: 1, at: '2026-11-15T00:00:00.000Z', ...extra });
const acct = (platform: string, scopes: string[] = []) => ({ platform, status: 'CONNECTED', scopes, accessTokenEnc: 'enc' });

describe('platformActions', () => {
  it('Facebook: edit message and delete when the Page token has pages_manage_posts', () => {
    const a = platformActions('FACEBOOK', live(), acct('FACEBOOK', ['pages_manage_posts', 'pages_manage_engagement']), 'POST');
    expect(a.edit).toEqual({ ok: true, fields: ['message'], reason: null });
    expect(a.delete.ok).toBe(true);
    expect(a.toggleComments.ok).toBe(false);
  });

  it('Instagram: no caption edit; delete needs instagram_manage_contents; comments switch allowed', () => {
    const old = platformActions('INSTAGRAM', live(), acct('INSTAGRAM', ['instagram_basic', 'instagram_manage_comments']), 'POST');
    expect(old.edit.ok).toBe(false);
    expect(old.edit.reason).toMatch(/caption/);
    expect(old.delete.ok).toBe(false);
    expect(old.delete.reason).toMatch(/Reconnect Instagram/);
    expect(old.toggleComments.ok).toBe(true);
    const fresh = platformActions('INSTAGRAM', live(), acct('INSTAGRAM', ['instagram_manage_contents', 'instagram_manage_comments']), 'POST');
    expect(fresh.delete.ok).toBe(true);
    expect(platformActions('INSTAGRAM', live(), acct('INSTAGRAM'), 'STORY').toggleComments.ok).toBe(false);
  });

  it('YouTube: title and description edit only with youtube.force-ssl', () => {
    const without = platformActions('YOUTUBE', live(), acct('YOUTUBE', ['https://www.googleapis.com/auth/youtube.upload']), 'VIDEO');
    expect(without.edit.ok).toBe(false);
    expect(without.edit.fields).toEqual(['title', 'description']);
    const withScope = platformActions('YOUTUBE', live(), acct('YOUTUBE', ['https://www.googleapis.com/auth/youtube.force-ssl']), 'VIDEO');
    expect(withScope.edit.ok).toBe(true);
    expect(withScope.delete.ok).toBe(true);
  });

  it('TikTok cannot edit or delete; Pinterest has no comments', () => {
    const t = platformActions('TIKTOK', live(), acct('TIKTOK'), 'REEL');
    expect(t.edit.ok || t.delete.ok || t.comments.ok).toBe(false);
    expect(platformActions('PINTEREST', live(), acct('PINTEREST', ['pins:write']), 'POST').comments.ok).toBe(false);
  });

  it('nothing is possible on a hand-posted, deleted or failed platform', () => {
    expect(platformActions('X', live({ manual: true }), acct('X'), 'TEXT').delete.reason).toMatch(/by hand/);
    expect(platformActions('X', live({ deletedAt: '2026-11-15T01:00:00.000Z' }), acct('X'), 'TEXT').delete.reason).toMatch(/Deleted/);
    expect(platformActions('X', { status: 'FAILED', attempts: 1, at: '' }, acct('X'), 'TEXT').delete.ok).toBe(false);
  });

  it('scopeGap: unknown scopes allow the try; NEEDS_RECONNECT does not', () => {
    expect(scopeGap('THREADS', acct('THREADS'), 'threads_delete')).toBeNull();
    expect(scopeGap('THREADS', { ...acct('THREADS', ['threads_basic']), status: 'NEEDS_RECONNECT' }, 'threads_delete')).toMatch(/Reconnect/);
  });
});

describe('commentActions', () => {
  it('Threads and X hide others, delete only their own', () => {
    expect(commentActions('THREADS', acct('THREADS'), false)).toMatchObject({ reply: true, hide: true, delete: false });
    expect(commentActions('THREADS', acct('THREADS'), true)).toMatchObject({ hide: false, delete: true });
    expect(commentActions('X', acct('X', ['tweet.write']), false).hide).toBe(false);
    expect(commentActions('X', acct('X', ['tweet.write', 'tweet.moderate.write']), false).hide).toBe(true);
  });
});

describe('X polls', () => {
  it('normalizes and checks a poll', () => {
    const p = normalizeXPoll({ options: [' Yes ', 'No', '', 'Maybe', 'Later', 'Extra'], durationMinutes: '1440' });
    expect(p).toEqual({ options: ['Yes', 'No', 'Maybe', 'Later'], durationMinutes: 1440 });
    expect(xPollIssues(p, 0)).toEqual([]);
    expect(xPollIssues({ options: ['Only one'], durationMinutes: 60 }, 0)[0]).toMatch(/2 to 4/);
    expect(xPollIssues({ options: ['a', 'b'], durationMinutes: 2 }, 0)[0]).toMatch(/5 minutes/);
    expect(xPollIssues({ options: ['a', 'b'], durationMinutes: 60 }, 1)[0]).toMatch(/cannot carry/);
  });

  it('is kept in post options and cleared with an empty poll', () => {
    const saved = normalizePostOptions({ x: { poll: { options: ['A', 'B'], durationMinutes: 60 } } });
    expect(saved.x?.poll?.options).toEqual(['A', 'B']);
    expect(mergePostOptions(saved, { x: { poll: null } }).x).toBeUndefined();
    expect(mergePostOptions(saved, { tiktok: undefined }).x?.poll?.durationMinutes).toBe(60);
  });
});

describe('story checks', () => {
  const base = { code: 'abc', caption: 'Hi', captions: {}, hashtags: [], link: null, campaign: null, kind: 'STORY' as const };
  it('a square image fails Instagram and Facebook stories; 9:16 passes', () => {
    const square = validatePost({ ...base, platforms: ['INSTAGRAM', 'FACEBOOK'], media: [{ url: 'u', kind: 'image', width: 1080, height: 1080 }] });
    expect(square.filter((w) => w.code === 'story_ratio' && w.level === 'error').map((w) => w.platform).sort()).toEqual(['FACEBOOK', 'INSTAGRAM']);
    const tall = validatePost({ ...base, platforms: ['INSTAGRAM', 'FACEBOOK'], media: [{ url: 'u', kind: 'image', width: 1080, height: 1920 }] });
    expect(tall.some((w) => w.code === 'story_ratio')).toBe(false);
  });

  it('a story video over 60 seconds is refused, and the reel rules do not apply', () => {
    const w = validatePost({ ...base, platforms: ['INSTAGRAM'], media: [{ url: 'u', kind: 'video', width: 1080, height: 1920, durationSec: 75 }] });
    expect(w.some((x) => x.code === 'story_length')).toBe(true);
    expect(w.some((x) => x.code === 'reel_length')).toBe(false);
  });

  it('a Facebook story needs media', () => {
    expect(validatePost({ ...base, platforms: ['FACEBOOK'], media: [] }).some((x) => x.platform === 'FACEBOOK' && x.code === 'needs_media')).toBe(true);
  });
});

describe('sumMetrics', () => {
  it('adds every metric and ignores missing platforms', () => {
    const t = sumMetrics([{ reach: 10, likes: 2 }, null, { reach: 5, clicks: 1 }]);
    expect(t.reach).toBe(15);
    expect(t.likes).toBe(2);
    expect(t.clicks).toBe(1);
    expect(t.saves).toBe(0);
  });
});
