/**
 * Facebook & Instagram (/settings/facebook): connect with Facebook, pick the
 * page (its Instagram account comes with it), ad account and catalog, turn
 * auto-post / inbox / catalog sync on or off, see the catalog sync log,
 * reconnect or disconnect. While Meta's review is pending only beta shops
 * see the live connect; others see an honest "Coming soon".
 *
 * Returning from Facebook adds ?connected=1 or ?error=<text>.
 * Keys: G guide.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, GraduationCap, Inbox, Link2, Megaphone, PackageCheck, Plug, RefreshCw, Rocket, Send, Share2, ShoppingBag, ThumbsUp,
  type LucideIcon,
} from 'lucide-react';
import { Alert, Badge, Button, PageHero, PageShell, Select, Skeleton, Switch, confirmDialog, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { PlatformMark } from '@modules/growth/social/platforms';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { t } from '@core/i18n';
import { translateServerText } from '@core/i18n/serverMessage';
import { metaApi, type CatalogRun, type MetaConnectionView, type MetaStatus } from './meta.api';

const KEY = ['meta-status'];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

export default function MetaSettingsPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: KEY, queryFn: metaApi.status });
  const conn = q.data?.connection && q.data.connection.status !== 'DISCONNECTED' ? q.data.connection : null;
  const catalog = useQuery({ queryKey: ['meta-catalog'], queryFn: metaApi.catalog, enabled: !!conn });

  // Message from the Facebook return.
  useEffect(() => {
    const ok = params.get('connected');
    const err = params.get('error');
    if (!ok && !err) return;
    if (ok) toast.success(t('Facebook jur gaya'));
    if (err) toast.error(translateServerText(err));
    params.delete('connected');
    params.delete('error');
    setParams(params, { replace: true });
    qc.invalidateQueries({ queryKey: KEY });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useMutation({
    mutationFn: metaApi.connect,
    onSuccess: (r) => { window.location.href = r.authUrl; },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const access = q.data?.access;
  const live = !!access?.live;

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2.5"><BrandLogo name="meta" size={30} />{t('Facebook & Instagram')}</span>}
        chip={q.data ? (conn ? (conn.needsReconnect ? <><AlertTriangle />{t('Dobara jorna hai')}</> : <><CheckCircle2 />{t('Jura hua')}</>) : live ? <><Plug />{t('Jura nahi')}</> : <>{t('Jaldi aa raha hai')}</>) : undefined}
        meta={t('Khud post, sab messages aur comments ek jagah, aur products Facebook / Instagram shop par')}
        loading={q.isLoading}
        busy={q.isFetching && !q.isLoading}
        actions={<>
          {live && (
            <button type="button" className={heroPrimaryButton} disabled={connect.isPending} onClick={() => connect.mutate()}>
              <PlatformMark p="FACEBOOK" size={16} /> <span>{conn ? t('Dobara joren') : t('Facebook se joren')}</span>
            </button>
          )}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Pages'), value: conn ? String(conn.pages.length) : '0', hint: conn?.selected.pageName ?? undefined },
          { label: t('Instagram'), value: conn ? String(conn.pages.filter((p) => p.igId).length) : '0', hint: conn?.selected.igUsername ? `@${conn.selected.igUsername}` : undefined },
          { label: t('Catalog me products'), value: String(catalog.data?.items ?? 0) },
          { label: t('Ad accounts'), value: conn ? String(conn.adAccounts.length) : '0' },
        ]}
      />

      {q.isLoading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
      ) : q.error || !q.data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{t('Safha nahi khula')}</p>
          <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(q.error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>
        </div>
      ) : !live && !conn ? (
        <ComingSoonCard reason={access?.reason ?? 'soon'} />
      ) : !conn ? (
        <ConnectCard onConnect={() => connect.mutate()} busy={connect.isPending} />
      ) : (
        <Connected data={q.data} conn={conn} onReconnect={() => connect.mutate()} reconnecting={connect.isPending} runs={catalog.data?.runs ?? []} />
      )}

      {guide.isOpen && (
        <PageGuide
          title={t('Facebook & Instagram — aasaan tareeqa')}
          description={t('Ek dafa joren, phir post, messages aur products khud chalte hain.')}
          onClose={guide.close}
          flow={[
            { label: t('Joren'), hint: t('Facebook se login'), icon: Plug, color: '#1877F2' },
            { label: t('Page chunein'), hint: t('Instagram saath'), icon: ThumbsUp, color: '#2563eb' },
            { label: t('Post'), hint: t('Waqt par khud'), icon: Send, color: '#16a34a' },
            { label: t('Inbox'), hint: t('Messages, comments'), icon: Inbox, color: '#ea580c' },
            { label: t('Shop'), hint: t('Products sync'), icon: ShoppingBag, color: '#7c3aed' },
          ]}
          steps={[
            { icon: Plug, color: '#1877F2', title: t('Facebook se joren'), text: t('Button dabayein, Facebook par login karein aur apna page, Instagram aur catalog chunein. Har sawal par "Allow" karein.') },
            { icon: ThumbsUp, color: '#2563eb', title: t('Page chunein'), text: t('Jis page par post karni hai woh chunein. Page se jura Instagram business account khud aa jata hai.') },
            { icon: Send, color: '#16a34a', title: t('Khud post'), text: t('Social media calendar me post par "Khud post karein" chalu karein — waqt aane par Nafaa khud Facebook aur Instagram par daal deta hai.') },
            { icon: Inbox, color: '#ea580c', title: t('Inbox'), text: t('Messenger, Instagram ke messages aur comments Online store → Inbox me aate hain. Jawab wahin se dein.') },
            { icon: ShoppingBag, color: '#7c3aed', title: t('Catalog'), text: t('Products, price aur stock Facebook / Instagram shop me khud update hote hain.') },
            { icon: AlertTriangle, color: '#dc2626', title: t('Jor toot jaye'), text: t('Upar laal patti aaye to "Dobara joren" dabayein. Purani post aur messages mehfooz rehte hain.') },
          ]}
          shortcuts={[['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function ComingSoonCard({ reason }: { reason: string }) {
  const items: Array<{ icon: LucideIcon; title: string; text: string }> = [
    { icon: Rocket, title: t('Khud post'), text: t('Calendar ki post waqt par Facebook aur Instagram par khud') },
    { icon: Inbox, title: t('Ek inbox'), text: t('Messenger, Instagram DMs aur comments ek jagah') },
    { icon: ShoppingBag, title: t('Facebook / Instagram shop'), text: t('Products, price aur stock khud update') },
    { icon: Megaphone, title: t('Ads'), text: t('Ads ka kharcha aur nateeje Nafaa me') },
  ];
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-start gap-3">
        <BrandLogo name="meta" size={36} />
        <div>
          <h2 className="flex items-center gap-2 text-[1rem] font-semibold text-slate-900">{t('Facebook & Instagram jaldi aa raha hai')}
            <span className="rounded-full bg-amber-100 px-1.5 py-px text-[0.625rem] font-semibold uppercase text-amber-800">{t('Soon')}</span>
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">
            {reason === 'paused' ? t('Nafaa ne ye kaam thori der ke liye rok rakha hai — baad me khud chal jayega.') : t('Meta (Facebook) ki manzoori milte hi ye sab ke liye khul jayega. Tab tak Social media calendar yaad dilata rahega.')}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((x) => (
          <div key={x.title} className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200/80">
            <x.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div><p className="text-[0.8125rem] font-semibold text-slate-800">{x.title}</p><p className="text-[0.75rem] text-slate-500">{x.text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConnectCard({ onConnect, busy }: { onConnect: () => void; busy: boolean }) {
  return (
    <section className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/80">
      <div className="mx-auto flex w-fit items-center gap-2"><BrandLogo name="meta" size={40} /></div>
      <h2 className="mt-3 text-[1.0625rem] font-bold text-slate-900">{t('Apna Facebook page aur Instagram joren')}</h2>
      <p className="mx-auto mt-1 max-w-lg text-[0.8125rem] text-slate-500">{t('Facebook par login karein, page aur Instagram chunein aur "Allow" dabayein. Nafaa aap ka password kabhi nahi dekhta.')}</p>
      <Button className="mt-4" onClick={onConnect} loading={busy} leftIcon={<PlatformMark p="FACEBOOK" size={16} />}>{t('Facebook se joren')}</Button>
    </section>
  );
}

function Section({ icon: Icon, color, title, badge, description, actions, children }: {
  icon: LucideIcon; color: string; title: string; badge?: ReactNode; description: ReactNode; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <header className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">{title}{badge}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function useSave() {
  const qc = useQueryClient();
  return (conn: MetaConnectionView) => {
    qc.setQueryData<MetaStatus>(KEY, (old) => (old ? { ...old, connection: conn } : old));
    qc.invalidateQueries({ queryKey: ['meta-catalog'] });
    qc.invalidateQueries({ queryKey: ['social', 'meta'] });
  };
}

function Connected({ data, conn, onReconnect, reconnecting, runs }: { data: MetaStatus; conn: MetaConnectionView; onReconnect: () => void; reconnecting: boolean; runs: CatalogRun[] }) {
  const qc = useQueryClient();
  const apply = useSave();
  const onErr = (e: unknown) => toast.error(apiErrorMessage(e));
  const assets = useMutation({ mutationFn: metaApi.assets, onSuccess: (r) => { apply(r); toast.success(t('Save ho gaya')); }, onError: onErr });
  const settings = useMutation({ mutationFn: metaApi.settings, onSuccess: (r) => { apply(r); toast.success(t('Save ho gaya')); }, onError: onErr });
  const refresh = useMutation({ mutationFn: metaApi.refresh, onSuccess: (r) => { apply(r); toast.success(t('List taaza ho gayi')); }, onError: onErr });
  const newCatalog = useMutation({ mutationFn: () => metaApi.createCatalog(), onSuccess: (r) => { apply(r); toast.success(t('Naya catalog ban gaya')); }, onError: onErr });
  const sync = useMutation({
    mutationFn: metaApi.syncCatalog,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['meta-catalog'] }); toast.success(t('{{count}} products bheje', { count: r.sent ?? 0 })); },
    onError: (e) => { qc.invalidateQueries({ queryKey: ['meta-catalog'] }); onErr(e); },
  });
  const disconnect = useMutation({
    mutationFn: metaApi.disconnect,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success(t('Facebook hata diya')); },
    onError: onErr,
  });
  const [pageId, setPageId] = useState(conn.selected.pageId ?? '');
  useEffect(() => setPageId(conn.selected.pageId ?? ''), [conn.selected.pageId]);

  const s = conn.selected;
  const catalogs = conn.catalogs.filter((c) => !s.businessId || !c.businessId || c.businessId === s.businessId);

  return (
    <div className="space-y-4">
      {conn.needsReconnect ? (
        <Alert tone="danger" title={t('Facebook ka jor toot gaya')} action={<Button size="sm" onClick={onReconnect} loading={reconnecting}>{t('Dobara joren')}</Button>}>
          {conn.lastError ?? t('Auto-post, inbox aur catalog ruk gaye hain. Dobara joren — purani post aur messages mehfooz hain.')}
        </Alert>
      ) : conn.health === 'expiring' ? (
        <Alert tone="warning" title={t('Jor jaldi khatam hoga')} action={<Button size="sm" variant="secondary" onClick={onReconnect} loading={reconnecting}>{t('Dobara joren')}</Button>}>
          {t('{{date}} ko Facebook ka jor khatam ho jayega. Abhi dobara jor lein taake kaam na ruke.', { date: when(conn.tokenExpiresAt) })}
        </Alert>
      ) : null}
      {data.access.beta && (
        <Alert tone="info">{t('Ye abhi aazmaish (beta) me hai — sirf chuni hui dukaanon ke liye. Kuch ghalat lage to Nafaa support ko batayein.')}</Alert>
      )}
      {!!conn.missingScopes.length && !conn.needsReconnect && (
        <Alert tone="warning" action={<Button size="sm" variant="secondary" onClick={onReconnect}>{t('Dobara joren')}</Button>}>
          {t('Facebook par kuch ijazatein nahi di gayin, is liye kuch kaam nahi chalenge. Dobara joren aur har sawal par "Allow" karein.')}
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Section icon={ThumbsUp} color="#1877F2" title={t('Facebook page aur Instagram')}
          description={t('Jis page par post aur messages chahiye. Page se jura Instagram khud aata hai.')}
          actions={<Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={refresh.isPending} onClick={() => refresh.mutate()}>{t('Taaza karein')}</Button>}>
          {!conn.pages.length ? (
            <p className="rounded-2xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{t('Koi page nahi mila. Dobara joren aur Facebook par apna page chunein.')}</p>
          ) : (
            <ul className="space-y-2">
              {conn.pages.map((p) => (
                <li key={p.id}>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ${pageId === p.id ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="page" className="h-4 w-4" checked={pageId === p.id} onChange={() => { setPageId(p.id); assets.mutate({ pageId: p.id }); }} />
                    {p.picture ? <img src={p.picture} alt="" className="h-8 w-8 rounded-full" /> : <PlatformMark p="FACEBOOK" size={32} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{p.name}</span>
                      <span className="flex items-center gap-1 text-[0.75rem] text-slate-500">
                        <PlatformMark p="INSTAGRAM" size={14} />{p.igUsername ? `@${p.igUsername}` : t('Instagram jura nahi')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {s.pageId && !s.igUserId && (
            <p className="mt-2 text-[0.75rem] text-slate-500">{t('Instagram par post ke liye Instagram ko "Business" ya "Creator" account bana kar is Facebook page se joren, phir "Taaza karein".')}</p>
          )}
        </Section>

        <Section icon={Share2} color="#16a34a" title={t('Kya kaam chale')} description={t('Jo band karein woh ruk jata hai; baqi chalta rahega.')}>
          <div className="space-y-3">
            <Switch checked={conn.settings.autoPublish} onChange={(e) => settings.mutate({ autoPublish: e.target.checked })}
              label={t('Khud post')} description={t('Social media calendar ki "Khud post" wali posts waqt par Facebook / Instagram par jayengi')} />
            <Switch checked={conn.settings.inboxEnabled} onChange={(e) => settings.mutate({ inboxEnabled: e.target.checked })}
              label={t('Inbox')} description={<>{t('Messages aur comments Nafaa me aayein')} · <Link to="/online-store/inbox" className="font-semibold text-brand-700 hover:underline">{t('Inbox kholein')}</Link></>} />
            <Switch checked={conn.settings.catalogSync} disabled={!s.catalogId} onChange={(e) => settings.mutate({ catalogSync: e.target.checked })}
              label={t('Catalog sync')} description={s.catalogId ? t('Products, price aur stock khud Facebook / Instagram shop me') : t('Pehle neeche catalog chunein')} />
          </div>
        </Section>

        <Section icon={PackageCheck} color="#7c3aed" title={t('Catalog (Facebook / Instagram shop)')}
          badge={conn.settings.catalogSync ? <Badge variant="success" size="xs">{t('Chalu')}</Badge> : undefined}
          description={t('Products, price, sale price aur stock — har tabdeeli ke baad aur roz raat ko.')}
          actions={s.catalogId ? <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={sync.isPending} onClick={() => sync.mutate()}>{t('Abhi sync karein')}</Button> : undefined}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label={t('Business')} value={s.businessId ?? ''} onChange={(e) => assets.mutate({ businessId: e.target.value || null })}
              options={[{ value: '', label: t('Chunein') }, ...conn.businesses.map((b) => ({ value: b.id, label: b.name }))]} />
            <Select label={t('Catalog')} value={s.catalogId ?? ''} onChange={(e) => assets.mutate({ catalogId: e.target.value || null })}
              options={[{ value: '', label: t('Chunein') }, ...catalogs.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
          {!catalogs.length && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
              <span className="flex-1">{s.businessId ? t('Is business me koi catalog nahi.') : t('Catalog ke liye pehle business chunein.')}</span>
              <Button size="sm" disabled={!s.businessId} loading={newCatalog.isPending} onClick={() => newCatalog.mutate()}>{t('Naya catalog banayein')}</Button>
            </div>
          )}
          {!!runs.length && <SyncLog runs={runs} />}
        </Section>

        <Section icon={Megaphone} color="#ea580c" title={t('Ad account')} description={t('Ads ka kharcha aur nateeje Marketing me dikhane ke liye')}>
          {conn.adAccounts.length ? (
            <Select value={s.adAccountId ?? ''} onChange={(e) => assets.mutate({ adAccountId: e.target.value || null })}
              options={[{ value: '', label: t('Chunein') }, ...conn.adAccounts.map((a) => ({ value: a.id, label: `${a.name}${a.currency ? ` (${a.currency})` : ''}` }))]} />
          ) : <p className="text-[0.8125rem] text-slate-500">{t('Koi ad account nahi mila.')}</p>}
        </Section>
      </div>

      <section className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <Link2 className="h-5 w-5 text-slate-400" />
        <p className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">
          {t('{{name}} ne {{date}} ko joda', { name: conn.metaUserName ?? t('Aap'), date: when(conn.connectedAt) })}
          {conn.tokenExpiresAt && <> · {t('Jor {{date}} tak', { date: when(conn.tokenExpiresAt) })}</>}
        </p>
        <Button size="sm" variant="secondary" onClick={onReconnect} loading={reconnecting}>{t('Dobara joren')}</Button>
        <Button size="sm" variant="ghost" className="text-rose-700" loading={disconnect.isPending}
          onClick={async () => { if (await confirmDialog({ title: t('Facebook hatayein?'), text: t('Khud post, inbox aur catalog ruk jayenge. Purani post aur messages Nafaa me rahenge.'), yes: t('Hatayein'), danger: true })) disconnect.mutate(); }}>
          {t('Hatayein')}
        </Button>
      </section>
    </div>
  );
}

const RUN_TONE: Record<CatalogRun['status'], string> = {
  RUNNING: 'bg-sky-50 text-sky-800', SUCCESS: 'bg-success-50 text-success-700', PARTIAL: 'bg-amber-50 text-amber-800', FAILED: 'bg-rose-50 text-rose-700', SKIPPED: 'bg-slate-100 text-slate-600',
};
const RUN_LABEL: Record<CatalogRun['trigger'], string> = { CHANGE: t('Tabdeeli'), DAILY: t('Roz'), MANUAL: t('Haath se') };

function SyncLog({ runs }: { runs: CatalogRun[] }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Sync log')}</p>
      <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
        {runs.slice(0, 8).map((r) => (
          <li key={r.id} className="px-3 py-2 text-[0.8125rem]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-px text-[0.6875rem] font-semibold ${RUN_TONE[r.status]}`}>{r.status}</span>
              <span className="text-slate-500">{RUN_LABEL[r.trigger]} · {when(r.startedAt)}</span>
              <span className="ms-auto text-slate-700">{t('{{sent}} bheje · {{removed}} hataye · {{failed}} ruke', { sent: r.sent, removed: r.removed, failed: r.failed })}</span>
            </div>
            {r.message && <p className="mt-1 text-[0.75rem] text-rose-700">{r.message}</p>}
            {!!r.errors.length && <p className="mt-1 truncate text-[0.75rem] text-amber-800" title={r.errors.map((e) => `${e.id}: ${e.message}`).join('\n')}>{r.errors[0].id}: {r.errors[0].message}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
