/**
 * TikTok settings for a post that goes straight to TikTok ("Post directly"
 * accounts), laid out as TikTok's Content Sharing Guidelines require: the
 * creator's name and picture, a privacy choice with no default, comment /
 * duet / stitch off until turned on (greyed out when the creator turned them
 * off in TikTok; photo posts have comments only), content disclosure with
 * "Your brand" and "Branded content", the length limit, the consent line
 * and the processing note.
 */

import { RefreshCw } from 'lucide-react';
import { Alert, Card, Checkbox, Select, Skeleton, Switch } from '@/design-system/components';
import type { SocialAccount, TikTokCreatorInfo, TikTokPostOptions, TikTokPrivacyLevel } from '@/api/admin-brand-social.api';
import { fmtDuration } from '../../lib/post';
import { BRANDED_CONTENT_URL, disclosureLabel, EMPTY_TIKTOK, MUSIC_USAGE_URL, TIKTOK_PRIVACY_LABEL } from '../../lib/tiktok';
import { AccountAvatar } from '../SocialUi';

const PRIVATE_BLOCKED = 'Branded content visibility cannot be set to private.';

const Policy = ({ href, children }: { href: string; children: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline underline-offset-2">{children}</a>
);

/** "By posting, you agree to TikTok's ..." with the policies that apply. */
export function TikTokConsent({ branded, className }: { branded: boolean; className?: string }) {
  return (
    <span className={className ?? 'block text-[0.8125rem] text-slate-600'}>
      By posting, you agree to TikTok&apos;s{' '}
      {branded ? <><Policy href={BRANDED_CONTENT_URL}>Branded Content Policy</Policy> and </> : null}
      <Policy href={MUSIC_USAGE_URL}>Music Usage Confirmation</Policy>.
    </span>
  );
}

export function TikTokSettings({ account, creator, loading, refreshing, onRefresh, value, onChange, photo, durationSec, disabled }: {
  account: SocialAccount;
  creator: TikTokCreatorInfo | undefined;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  value: TikTokPostOptions | undefined;
  onChange: (v: TikTokPostOptions) => void;
  photo: boolean;
  durationSec: number | null;
  disabled?: boolean;
}) {
  const t = value ?? EMPTY_TIKTOK;
  const set = (patch: Partial<TikTokPostOptions>) => onChange({ ...t, ...patch });
  const options = creator?.privacyLevelOptions ?? [];
  const max = creator?.maxVideoPostDurationSec ?? null;
  const tooLong = !photo && !!max && !!durationSec && durationSec > max;
  const label = disclosureLabel(t, photo);
  const name = creator?.nickname || account.name;
  const handle = creator?.username || account.handle?.replace(/^@/, '');

  return (
    <Card title="TikTok settings" description="This post goes straight to TikTok. TikTok asks for these choices on every post.">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
          {creator?.avatarUrl
            ? <img src={creator.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
            : <AccountAvatar account={account} platform="TIKTOK" size={36} />}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{name}</span>
            <span className="block truncate text-[0.75rem] text-slate-500">{handle ? `@${handle} · ` : ''}Posting to this TikTok account</span>
          </span>
          <button type="button" onClick={onRefresh} disabled={refreshing} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50" aria-label="Check TikTok again" title="Check TikTok again">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? <Skeleton className="h-40 rounded-xl" /> : (
          <>
            {creator && !creator.canPost && (
              <Alert tone="danger" title="TikTok will not take a post from this account right now">{creator.reason || 'Try again later.'}</Alert>
            )}

            <Select
              label="Who can see this post"
              required
              value={t.privacyLevel ?? ''}
              disabled={disabled || !options.length}
              onChange={(e) => set({ privacyLevel: (e.target.value || null) as TikTokPrivacyLevel | null })}
              hint={t.brandedContent ? PRIVATE_BLOCKED : !options.length && creator?.canPost ? 'TikTok offered no privacy choices for this account.' : undefined}
            >
              <option value="" disabled>Choose who can see it</option>
              {options.map((v) => {
                const blocked = v === 'SELF_ONLY' && t.brandedContent;
                return <option key={v} value={v} disabled={blocked} title={blocked ? PRIVATE_BLOCKED : undefined}>{TIKTOK_PRIVACY_LABEL[v] ?? v}</option>;
              })}
            </Select>

            <div>
              <span className="mb-1.5 block text-[0.75rem] font-medium text-slate-600">Allow users to</span>
              <div className="space-y-2.5 rounded-xl px-3 py-2.5 ring-1 ring-slate-200">
                <Switch size="sm" label="Comment" checked={t.allowComment && !creator?.commentDisabled} disabled={disabled || creator?.commentDisabled}
                  description={creator?.commentDisabled ? 'Turned off in this account\'s TikTok settings.' : undefined} onChange={(e) => set({ allowComment: e.target.checked })} />
                {!photo && (
                  <>
                    <Switch size="sm" label="Duet" checked={t.allowDuet && !creator?.duetDisabled} disabled={disabled || creator?.duetDisabled}
                      description={creator?.duetDisabled ? 'Turned off in this account\'s TikTok settings.' : undefined} onChange={(e) => set({ allowDuet: e.target.checked })} />
                    <Switch size="sm" label="Stitch" checked={t.allowStitch && !creator?.stitchDisabled} disabled={disabled || creator?.stitchDisabled}
                      description={creator?.stitchDisabled ? 'Turned off in this account\'s TikTok settings.' : undefined} onChange={(e) => set({ allowStitch: e.target.checked })} />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl px-3 py-2.5 ring-1 ring-slate-200">
              <Switch size="sm" label="Disclose post content" description="Indicate whether this content promotes yourself, a brand, product or service." checked={t.disclose} disabled={disabled}
                onChange={(e) => set(e.target.checked ? { disclose: true } : { disclose: false, yourBrand: false, brandedContent: false })} />
              {t.disclose && (
                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <Checkbox label="Your brand" description="You are promoting yourself or your own business. This content will be classified as Brand Organic." checked={t.yourBrand} disabled={disabled}
                    onChange={(e) => set({ yourBrand: e.target.checked })} />
                  {/* Branded content cannot be private: picking it clears "Only me", and the person picks again. */}
                  <Checkbox label="Branded content" checked={t.brandedContent} disabled={disabled}
                    description="You are promoting another brand or a third party. This content will be classified as Branded Content."
                    onChange={(e) => set(e.target.checked && t.privacyLevel === 'SELF_ONLY' ? { brandedContent: true, privacyLevel: null } : { brandedContent: e.target.checked })} />
                  {label
                    ? <p className="rounded-lg bg-blue-50 px-3 py-2 text-[0.8125rem] text-blue-900 ring-1 ring-blue-200">{label}</p>
                    : <p className="rounded-lg bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">You need to indicate if your content promotes yourself, a third party, or both.</p>}
                </div>
              )}
            </div>

            {!photo && max != null && (
              <p className={`text-[0.8125rem] ${tooLong ? 'font-medium text-rose-700' : 'text-slate-500'}`}>
                {durationSec ? `Video length ${fmtDuration(durationSec)}; ` : ''}this account can post videos up to {fmtDuration(max)}.
                {tooLong ? ' Use a shorter video.' : ''}
              </p>
            )}

            <TikTokConsent branded={t.disclose && t.brandedContent} />
            <p className="text-[0.75rem] text-slate-500">After it is posted, it may take a few minutes for TikTok to process the post before it shows on the profile.</p>
          </>
        )}
      </div>
    </Card>
  );
}
