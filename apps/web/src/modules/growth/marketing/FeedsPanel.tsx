/**
 * Product feeds for ads: the Google Merchant Center and Meta catalog links
 * Nafaa already serves (Settings → Google), with the steps to add each one.
 * Turning the feed on and its options stay on the Google settings page.
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, ExternalLink, Rss } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/design-system/components';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { t as tr } from '@core/i18n';
import { googleApi } from '@integrations/google/google.api';

export function FeedsPanel() {
  const navigate = useNavigate();
  const canSettings = usePermission(PERMISSIONS.SETTINGS_VIEW);
  const q = useQuery({ queryKey: ['google', 'overview'], queryFn: googleApi.overview, retry: false });
  if (q.isLoading) return <Skeleton className="h-72 rounded-3xl" />;
  if (q.isError) return <Alert tone="info" title={tr('Feeds sirf malik ya manager dekh sakte hain')}>{tr('Malik se kahein ke Settings → Google se feed on karein.')}</Alert>;
  const g = q.data!;

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success(tr('Link copy ho gaya')); } catch { toast.error(tr('Copy nahi hua')); }
  };

  return (
    <div className="space-y-4">
      {!g.enabled && (
        <Alert tone="info" title={tr('Feed abhi band hai')}
          action={canSettings ? <Button size="sm" onClick={() => navigate('/settings/google')}>{tr('Feed on karein')}</Button> : undefined}>
          {tr('Settings → Google me feed on karein. Phir dono links yahan aa jayenge.')}
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Feed brand="google" title={tr('Google Merchant Center')} url={g.productFeedUrl} onCopy={copy}
          steps={[
            tr('merchants.google.com kholein → Products → Data sources (Feeds).'),
            tr('"Add product source" → "Add products from a file" → "Enter a link to your file".'),
            tr('Ye link paste karein, roz ek dafa fetch rakhein.'),
            tr('Google Ads me Performance Max / Shopping campaign is catalog se banayein.'),
          ]} />
        <Feed brand="meta" title={tr('Meta catalog (Facebook / Instagram)')} url={g.metaCatalogUrl ?? null} onCopy={copy}
          steps={[
            tr('business.facebook.com → Commerce Manager → apna catalog (ya naya banayein).'),
            tr('Catalog → Data sources → Add items → Data feed.'),
            tr('"Scheduled feed" chunein, ye link paste karein, roz update rakhein.'),
            tr('Ads Manager me Advantage+ catalog ads isi catalog se chalayein.'),
          ]} />
      </div>
      {g.stats && (
        <p className="px-1 text-[0.8125rem] text-slate-600">
          {tr('Feed me {{count}} products hain.', { count: g.stats.items })}
          {g.stats.warnings.length > 0 && <> {' '}{tr('{{count}} masle — Settings → Google me dekhein.', { count: g.stats.warnings.reduce((s, w) => s + w.count, 0) })}</>}
        </p>
      )}
    </div>
  );
}

function Feed({ brand, title, url, steps, onCopy }: { brand: BrandName; title: string; url: string | null; steps: string[]; onCopy: (u: string) => void }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center gap-3">
        <BrandLogo name={brand} size={32} />
        <p className="font-semibold text-slate-900">{title}</p>
      </div>
      {url ? (
        <div className="mt-3 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2 font-mono text-[0.75rem] text-slate-700 ring-1 ring-slate-200">{url}</p>
          <Button size="sm" variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={() => onCopy(url)}>{tr('Copy')}</Button>
          <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={tr('Kholein')}><ExternalLink className="h-4 w-4" /></a>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-slate-500"><Rss className="h-4 w-4" /> {tr('Feed on hone par link yahan aayega')}</p>
      )}
      <ol className="mt-3 list-decimal space-y-1.5 ps-5 text-[0.8125rem] text-slate-700">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </div>
  );
}
