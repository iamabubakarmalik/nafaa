/**
 * Auto-post to Facebook / Instagram in the Social studio: the editor toggle,
 * per-platform publish state with "Abhi post karein" / retry in the post
 * sheet, and the studio strip that says whether auto-post is live.
 * Connection lives in Settings → Facebook & Instagram.
 */

import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Rocket, Send } from 'lucide-react';
import { Button, Switch } from '@/design-system/components';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { metaApi, type PlatformPublishState } from '@integrations/meta/meta.api';
import type { SocialPlatform, SocialPost } from './social.api';
import { PLATFORM_META, PlatformMark } from './platforms';

export const META_SOCIAL: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM'];

export function useStudioMeta() {
  return useQuery({ queryKey: ['social', 'meta', 'status'], queryFn: metaApi.studioStatus, staleTime: 60_000, retry: false });
}

/** Whether auto-post can be offered now for these platforms. */
export function canAutoPost(s: ReturnType<typeof useStudioMeta>['data'], platforms: SocialPlatform[]) {
  return !!s?.live && s.connected && platforms.some((p) => (p === 'FACEBOOK' && s.platforms.FACEBOOK) || (p === 'INSTAGRAM' && s.platforms.INSTAGRAM));
}

export function AutoPublishToggle({ value, onChange, platforms }: { value: boolean; onChange: (v: boolean) => void; platforms: SocialPlatform[] }) {
  const s = useStudioMeta().data;
  if (!s?.live) return null;
  if (!s.connected) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
        <Rocket className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="flex-1">{t('Facebook / Instagram par khud post ke liye pehle Facebook joren.')}</span>
        <Link to="/settings/facebook" className="font-semibold text-brand-700 hover:underline">{t('Joren')}</Link>
      </p>
    );
  }
  const names = META_SOCIAL.filter((p) => platforms.includes(p) && s.platforms[p as 'FACEBOOK' | 'INSTAGRAM']).map((p) => PLATFORM_META[p].label).join(' + ');
  return (
    <Switch checked={value && !!names} disabled={!names} onChange={(e) => onChange(e.target.checked)}
      label={t('Khud post karein')}
      description={names ? t('Waqt aane par Nafaa khud {{names}} par post kar dega', { names }) : t('Facebook ya Instagram chunein')} />
  );
}

function StateLine({ p, st }: { p: SocialPlatform; st: PlatformPublishState | undefined }) {
  if (!st) return null;
  if (st.status === 'PUBLISHED') {
    return (
      <p className="flex items-center gap-1.5 text-[0.75rem] text-success-700">
        <CheckCircle2 className="h-3.5 w-3.5" />{t('{{name}} par post ho gayi', { name: PLATFORM_META[p].label })}
        {st.permalink && <a href={st.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold hover:underline">{t('Dekhein')}<ExternalLink className="h-3 w-3" /></a>}
      </p>
    );
  }
  if (st.status === 'FAILED') {
    return (
      <p className="flex items-start gap-1.5 text-[0.75rem] text-rose-700">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{st.error}{st.willRetry && st.nextAt ? ` · ${t('Nafaa {{time}} par dobara koshish karega', { time: new Date(st.nextAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) })}` : ''}</span>
      </p>
    );
  }
  return <p className="flex items-center gap-1.5 text-[0.75rem] text-sky-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />{st.status === 'WAITING' ? t('Video tayyar ho rahi hai — post thori der me') : t('Post ho rahi hai…')}</p>;
}

/** In the post sheet: state per Meta platform, and post now / try again. */
export function MetaPublishRow({ post, p }: { post: SocialPost; p: SocialPlatform }) {
  const qc = useQueryClient();
  const s = useStudioMeta().data;
  const st = post.publishState?.[p as 'FACEBOOK' | 'INSTAGRAM'];
  const go = useMutation({
    mutationFn: () => metaApi.publishNow(post.id, [p]),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['social'] });
      const now = r.publishState[p];
      if (now?.status === 'PUBLISHED') toast.success(t('{{name}} par post ho gayi', { name: PLATFORM_META[p].label }));
      else if (now?.status === 'FAILED') toast.error(now.error ?? t('Post nahi hui'));
      else toast.success(t('Video tayyar ho rahi hai — post thori der me'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  if (!META_SOCIAL.includes(p) || !s?.live || !s.connected || !s.platforms[p as 'FACEBOOK' | 'INSTAGRAM']) return null;
  const shown = go.data?.publishState[p] ?? st;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1"><StateLine p={p} st={shown} /></div>
      {shown?.status !== 'PUBLISHED' && shown?.status !== 'WAITING' && (
        <Button size="xs" loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Send className="h-3.5 w-3.5" />}>
          {shown?.status === 'FAILED' ? t('Dobara koshish') : t('Abhi khud post karein')}
        </Button>
      )}
    </div>
  );
}

/** Note at the bottom of the post sheet. */
export function AutoPostNote() {
  const s = useStudioMeta().data;
  if (s?.live && s.connected) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-success-50 px-3 py-2 text-[0.75rem] text-success-800 ring-1 ring-success-200">
        <Rocket className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t('Facebook aur Instagram par Nafaa khud post kar sakta hai. TikTok, YouTube aur WhatsApp status abhi haath se.')}</span>
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
      <Rocket className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {s?.live ? <>{t('Facebook joren to Nafaa khud post karega.')} <Link to="/settings/facebook" className="font-semibold hover:underline">{t('Joren')}</Link></>
          : t('Khud post (auto-publish) jaldi aa raha hai — is ke liye Meta aur TikTok ki manzoori chahiye. Tab tak Nafaa waqt par yaad dilata hai.')}
      </span>
    </p>
  );
}

/** Studio strip: auto-post live for connected shops, otherwise the old "Soon" cards stay. */
export function useAutoPostLive() {
  const s = useStudioMeta().data;
  return { live: !!s?.live, connected: !!s?.live && !!s?.connected, status: s };
}
