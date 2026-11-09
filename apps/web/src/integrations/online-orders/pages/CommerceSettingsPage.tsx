/**
 * Online store settings (/online-store/settings): the seller's setup answers
 * and everything they set — dashboard "Aaj ka kaam" tiles (toggle and
 * drag), orders-board tiles hidden while empty, sidebar items hidden or
 * pinned — plus links to automation, auto booking and WhatsApp messages.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EyeOff, GraduationCap, LayoutDashboard, MessageCircle, Pin, Settings2, Wand2, Workflow, Zap } from 'lucide-react';
import { Button, Card, Checkbox, PageHero, PageShell, Skeleton, Switch, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { commerceNavGroups, loadFavorites, saveFavorites } from '@/app/shell/navigation/nav-config';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { insightsApi, type SetupProfile } from '../api/insights.api';
import { SETUP_KEY, useCommerceSetup } from '../hooks/useCommerceSetup';
import { HomeTilesEditor, tileEntry } from '../components/setup/HomeTilesEditor';

const HIDEABLE_TILES = ['TODAY', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'PACKED_NOT_SENT', 'OUT_FOR_DELIVERY', 'STUCK', 'ISSUES', 'RETURNING', 'REPLACEMENT', 'CLAIM', 'FOLLOW_UP', 'COD_DUE'];
const HIDEABLE_NAV = [
  '/online-orders/new', '/online-orders/pack', '/online-orders/returns-scan', '/online-orders/abandoned', '/online-orders/tracking',
  '/online-store/couriers/rules', '/online-orders/cod/reconcile', '/online-orders/dispatch', '/online-orders/dispatch-scan', '/online-orders/dispatch-report',
  '/online-orders/couriers-score', '/online-orders/post-office', '/online-store/price-calculator', '/online-store/blocklist', '/online-store/whatsapp-templates',
  '/online-orders/profit', '/online-orders/payment-health', '/online-store/ads', '/online-store/automation',
];
const navLabel = (path: string) => commerceNavGroups.flatMap((g) => g.items).find((i) => i.to === path)?.label ?? path;

const ANSWER_TEXT = {
  codShare: { MOST: t('Zyada tar COD'), HALF: t('Aadhe COD'), FEW: t('Zyada tar prepaid') },
  team: { SOLO: t('Akele'), SMALL: t('2–5 log'), LARGE: t('6+ log') },
  confirmBy: { CALL: t('Call se confirm'), WHATSAPP: t('WhatsApp se confirm'), BOTH: t('Call + WhatsApp'), NONE: t('Confirm nahi') },
};

export default function CommerceSettingsPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const setup = useCommerceSetup();
  const p = setup.data;
  const [draft, setDraft] = useState<Pick<SetupProfile, 'homeTiles' | 'hiddenTiles' | 'hiddenNav' | 'pinnedNav'> | null>(null);
  const [favs, setFavs] = useState<string[]>(() => loadFavorites());
  useEffect(() => { if (p && !draft) setDraft({ homeTiles: p.homeTiles, hiddenTiles: p.hiddenTiles, hiddenNav: p.hiddenNav, pinnedNav: p.pinnedNav }); }, [p, draft]);
  const dirty = !!p && !!draft && JSON.stringify(draft) !== JSON.stringify({ homeTiles: p.homeTiles, hiddenTiles: p.hiddenTiles, hiddenNav: p.hiddenNav, pinnedNav: p.pinnedNav });

  const save = useMutation({
    mutationFn: () => insightsApi.savePrefs(draft!),
    onSuccess: (next) => { qc.setQueryData(SETUP_KEY, next); setDraft(null); toast.success(t('Settings save ho gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const pin = (path: string, on: boolean) => {
    const next = on ? [...favs.filter((x) => x !== path), path] : favs.filter((x) => x !== path);
    saveFavorites(next);
    setFavs(next);
    setDraft((d) => d && { ...d, pinnedNav: on ? [...new Set([...d.pinnedNav, path])] : d.pinnedNav.filter((x) => x !== path) });
  };
  const a = p?.answers;

  return (
    <PageShell>
      <PageHero title={t('Online store settings')} chip={<><Settings2 />{a ? t('Aap ke hisaab se') : t('Setup baqi')}</>}
        meta={t('Dashboard ke dabbe, orders board aur menu — jo aap ke kaam ka ho wohi dikhe')}
        loading={setup.isLoading}
        actions={<>
          {dirty && <button type="button" className={heroButton} disabled={save.isPending} onClick={() => save.mutate()}>{t('Save')}</button>}
          <Link to="/online-store/setup" className={heroButton}><Wand2 className="h-4 w-4" /> <span className="hidden sm:inline">{a ? t('Setup dobara') : t('Setup karein')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Dashboard dabbe'), value: draft ? String(draft.homeTiles.length) : '' },
          { label: t('Board dabbe chhupe'), value: draft ? String(draft.hiddenTiles.length) : '' },
          { label: t('Menu me chhupe'), value: draft ? String(draft.hiddenNav.length) : '' },
          { label: t('Pin'), value: String(favs.filter((f) => f.startsWith('/online-')).length) },
        ]} />

      {!draft ? <Skeleton className="h-72 rounded-3xl" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl" title={t('Aap ka tareeqa')} actions={<Link to="/online-store/setup" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Badlein')}</Link>}>
            {!a ? <p className="text-[0.8125rem] text-slate-500">{t('Setup abhi nahi hua. 6 sawal ke jawab se sab aap ke hisaab se set ho jata hai.')}</p> : (
              <ul className="space-y-1.5 text-[0.8125rem] text-slate-700">
                <li><b>{t('Channels')}:</b> {a.places.join(', ') || '—'}</li>
                <li><b>{t('Couriers')}:</b> {a.couriers.join(', ') || '—'}</li>
                <li><b>COD:</b> {ANSWER_TEXT.codShare[a.codShare]} · <b>{t('Team')}:</b> {ANSWER_TEXT.team[a.team]}</li>
                <li>{ANSWER_TEXT.confirmBy[a.confirmBy]} · {a.packScan ? t('Scan se pack') : t('Haath se pack')}</li>
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/online-store/automation"><Button size="xs" variant="outline" leftIcon={<Workflow className="h-3.5 w-3.5" />}>{t('Automation')}</Button></Link>
              <Link to="/online-store/couriers/rules"><Button size="xs" variant="outline" leftIcon={<Zap className="h-3.5 w-3.5" />}>{t('Auto booking')}</Button></Link>
              <Link to="/online-store/whatsapp-templates"><Button size="xs" variant="outline" leftIcon={<MessageCircle className="h-3.5 w-3.5" />}>{t('WhatsApp messages')}</Button></Link>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />{t('Dashboard — Aaj ka kaam')}</span>}>
            <HomeTilesEditor value={draft.homeTiles} onChange={(homeTiles) => setDraft({ ...draft, homeTiles })} />
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><EyeOff className="h-4 w-4" />{t('Orders board — khali ho to chhupayein')}</span>}
            description={t('Jis dabbe me order ho woh hamesha dikhta hai.')}>
            <div className="grid gap-2 sm:grid-cols-2">
              {HIDEABLE_TILES.map((k) => (
                <Checkbox key={k} label={tileEntry(k)?.label ?? k} checked={draft.hiddenTiles.includes(k)}
                  onChange={(e) => setDraft({ ...draft, hiddenTiles: e.currentTarget.checked ? [...draft.hiddenTiles, k] : draft.hiddenTiles.filter((x) => x !== k) })} />
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Pin className="h-4 w-4" />{t('Menu')}</span>} description={t('Chhupi cheez search (Ctrl K) se phir bhi milti hai. Pin is device par.')}>
            <ul className="divide-y divide-slate-100">
              {HIDEABLE_NAV.map((path) => {
                const shown = !draft.hiddenNav.includes(path);
                return (
                  <li key={path} className="flex items-center gap-3 py-2 text-[0.8125rem]">
                    <span className="flex-1 font-medium text-slate-900">{navLabel(path)}</span>
                    <Switch size="sm" label={t('Dikhe')} checked={shown} onChange={(e) => setDraft({ ...draft, hiddenNav: e.currentTarget.checked ? draft.hiddenNav.filter((x) => x !== path) : [...draft.hiddenNav, path] })} />
                    <Checkbox label={t('Pin')} checked={favs.includes(path)} onChange={(e) => pin(path, e.currentTarget.checked)} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>{t('Save karein')}</Button>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Online store settings')} onClose={guide.close}
          flow={[
            { label: t('Setup ke jawab'), icon: Wand2, color: '#7c3aed' },
            { label: t('Dashboard, board, menu'), icon: LayoutDashboard, color: '#2563eb' },
            { label: 'Save', icon: Settings2, color: '#16a34a' },
          ]}
          steps={[
            { icon: LayoutDashboard, color: '#2563eb', title: t('Aaj ka kaam'), text: t('Tick karein jo dabbe dashboard par chahiye, kheench kar tarteeb badlein.') },
            { icon: EyeOff, color: '#64748b', title: t('Board dabbe'), text: t('Jo dabbe aap ke kaam ke nahi woh khali hon to chhup jate hain.') },
            { icon: Pin, color: '#ea580c', title: t('Menu'), text: t('Na chahiye cheez chhupayein, roz wali pin karein.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
