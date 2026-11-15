/**
 * Market settings: the order-flow switches that apply to the shop's Market
 * section (substitutes, prescription photo, cake orders, booking slots…),
 * the minimum order, and which Market events notify the seller.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, Cake, CalendarClock, Clock, Gift, Layers, Moon, Package, Pill, Repeat, Save, Settings2, Shirt, Store, Truck, Utensils, Volume2,
  type LucideIcon,
} from 'lucide-react';
import { Alert, Button, Checkbox, Input, Kbd, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { msg, t } from '@core/i18n';
import { Field, NumberInput, SectionCard, Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { errorText, marketApi, type FlowKey, type FlowSettings, type NotificationPrefs } from '../api/market.api';
import { effectiveFlow, gateLabel, shopGate, useMarketConfig, useMarketProfile } from '../hooks/useMarket';
import { GuideButton, TONE } from '../components/parts';

type BoolKey = Exclude<FlowKey, 'minOrderAmount'>;

/** Plain words for each switch; only the ones the shop's section uses are shown. */
const SWITCHES: Record<BoolKey, { label: string; desc: string; icon: LucideIcon }> = {
  modifiers: { label: msg('Add-ons aur options'), desc: msg('Customer extra cheese, size ya flavour chun sake (POS ke modifiers se)'), icon: Layers },
  substitutes: { label: msg('Na ho to badal dein'), desc: msg('Koi cheez khatam ho to customer milti julti cheez ki ijazat de sake'), icon: Repeat },
  deliverySlots: { label: msg('Delivery ka waqt chunein'), desc: msg('Customer ek ghante ka waqt chune jab saman chahiye'), icon: Clock },
  prescription: { label: msg('Nuskha zaroori'), desc: msg('Nuskhe wali dawa par customer nuskhe ki photo lagaye, aap dekh kar accept karein'), icon: Pill },
  customCake: { label: msg('Custom cake order'), desc: msg('Wazan, flavour, cake par message aur tareekh ke saath order'), icon: Cake },
  booking: { label: msg('Booking'), desc: msg('Delivery ki jagah customer aane ka waqt book kare'), icon: CalendarClock },
  sizeColour: { label: msg('Size aur rang'), desc: msg('Product ke variants se size aur rang chunna'), icon: Shirt },
  courier: { label: msg('Courier se poore Pakistan'), desc: msg('Door ke shehron me courier se bhejein'), icon: Truck },
  pickup: { label: msg('Dukaan se pickup'), desc: msg('Customer order de kar khud le jaye'), icon: Store },
  dineIn: { label: msg('Dine-in pre-order'), desc: msg('Aane se pehle khana order kar de'), icon: Utensils },
  giftMessage: { label: msg('Gift message'), desc: msg('Delivery ki tareekh aur gift par message (phool, tohfe)'), icon: Gift },
};

const EVENTS: Array<{ key: string; label: string }> = [
  { key: 'NEW_ORDER', label: msg('Naya order') },
  { key: 'ORDER_CANCELLED', label: msg('Order cancel') },
  { key: 'MESSAGE_RECEIVED', label: msg('Naya message') },
  { key: 'REVIEW_RECEIVED', label: msg('Naya review') },
  { key: 'PAYMENT_RECEIVED', label: msg('Payment mili') },
  { key: 'LOW_STOCK', label: msg('Online product ka stock kam') },
];

export default function MarketSettingsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const profileQ = useMarketProfile();
  const configQ = useMarketConfig();
  const prefsQ = useQuery({ queryKey: ['market', 'notification-prefs'], queryFn: marketApi.notifications.prefs });
  const p = profileQ.data;
  const gate = shopGate(p);
  const gateDef = configQ.data?.gates.find((g) => g.id === gate);
  const base = useMemo(() => effectiveFlow(p, configQ.data, gate), [p, configQ.data, gate]);
  const [draft, setDraft] = useState<FlowSettings>({});
  const flow = { ...base, ...draft };
  const changed = Object.keys(draft).length > 0;
  const keys = (Object.keys(gateDef?.defaults ?? {}) as FlowKey[]).filter((k): k is BoolKey => k !== 'minOrderAmount' && k in SWITCHES);
  const minOrder = Number(flow.minOrderAmount ?? 0);

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  useEffect(() => { if (prefsQ.data) setPrefs(prefsQ.data); }, [prefsQ.data]);
  const prefsChanged = !!prefs && !!prefsQ.data && JSON.stringify(prefs) !== JSON.stringify(prefsQ.data);

  const save = useMutation({
    mutationFn: () => marketApi.profile.update({ flowSettings: { ...(p?.flowSettings ?? {}), ...draft } }),
    onSuccess: () => { toast.success(t('Save ho gaya')); setDraft({}); qc.invalidateQueries({ queryKey: ['market'] }); },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const savePrefs = useMutation({
    mutationFn: () => marketApi.notifications.savePrefs(prefs!),
    onSuccess: () => { toast.success(t('Save ho gaya')); qc.invalidateQueries({ queryKey: ['market', 'notification-prefs'] }); },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });

  const trySave = () => {
    if (!canEdit) return;
    if (changed && !save.isPending) save.mutate();
    if (prefsChanged && !savePrefs.isPending) savePrefs.mutate();
    if (!changed && !prefsChanged) toast.info(t('Koi tabdeeli nahi'));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !isDialogOpen()) { e.preventDefault(); trySave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setChannel = (ev: string, ch: 'push' | 'email' | 'sms', v: boolean) => setPrefs((x) => (x ? {
    ...x, channels: { ...x.channels, [ev]: { ...(x.channels[ev] ?? { push: false, email: false, sms: false }), [ch]: v } },
  } : x));
  const onCount = keys.filter((k) => flow[k]).length;
  const notifyOn = prefs ? EVENTS.filter((e) => prefs.channels[e.key]?.push).length : 0;

  if (profileQ.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Market settings')}
        chip={<><Settings2 /> {gate ? gateLabel(gate, configQ.data) : t('Market')}</>}
        actions={<>
          <GuideButton onClick={guide.open} />
          {canEdit && <Button size="sm" onClick={trySave} disabled={!changed && !prefsChanged} loading={save.isPending || savePrefs.isPending} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>}
        </>}
        stats={[
          { label: t('Market section'), value: gate ? gateLabel(gate, configQ.data) : '—' },
          { label: t('Chalu switches'), value: `${onCount}/${keys.length}` },
          { label: t('Kam se kam order'), value: minOrder ? formatPKR(minOrder) : t('Koi had nahi') },
          { label: t('Push notifications'), value: `${notifyOn}/${EVENTS.length}` },
        ]}
      />

      {!canEdit && <Alert tone="info">{t('Aap sirf dekh sakte hain. Badalne ke liye Settings edit ki ijazat chahiye.')}</Alert>}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={t('Order ka tareeqa')} desc={t('Sirf woh switches jo aap ke Market section me kaam aate hain')} icon={Package} color="violet"
          action={<Link to="/market/profile" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Section badlein')}</Link>}>
          {configQ.isLoading || !gateDef ? <Skeleton className="h-40 rounded-xl" /> : (
            <div className="divide-y divide-slate-100">
              {keys.map((k) => (
                <Toggle key={k} checked={!!flow[k]} disabled={!canEdit} icon={SWITCHES[k].icon}
                  onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
                  label={t(SWITCHES[k].label)} desc={t(SWITCHES[k].desc)} />
              ))}
            </div>
          )}
          <div className="mt-3 border-t border-slate-100 pt-3 sm:max-w-xs">
            <Field label={t('Kam se kam order')} hint={t('Is se kam ka order accept karna zaroori nahi. 0 = koi had nahi')}>
              <NumberInput value={minOrder} onChange={(v) => setDraft((d) => ({ ...d, minOrderAmount: v }))} min={0} step={50} prefix="Rs" disabled={!canEdit} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title={t('Notifications')} desc={t('Market ki kaun si baat par aap ko khabar mile')} icon={Bell} color="amber">
          {prefsQ.isLoading || !prefs ? <Skeleton className="h-48 rounded-xl" /> : (
            <>
              <Table>
                <THead><Tr><Th>{t('Kab')}</Th><Th align="center">{t('App')}</Th><Th align="center">{t('Email')}</Th><Th align="center">{t('SMS')}</Th></Tr></THead>
                <TBody>
                  {EVENTS.map((ev) => {
                    const c = prefs.channels[ev.key] ?? { push: false, email: false, sms: false };
                    return (
                      <Tr key={ev.key}>
                        <Td className="text-slate-800">{t(ev.label)}</Td>
                        {(['push', 'email', 'sms'] as const).map((ch) => (
                          <Td key={ch} align="center">
                            <Checkbox aria-label={`${t(ev.label)} · ${ch}`} checked={!!c[ch]} disabled={!canEdit} onChange={(e) => setChannel(ev.key, ch, e.target.checked)} />
                          </Td>
                        ))}
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
              <div className="mt-2 divide-y divide-slate-100">
                <Toggle checked={prefs.soundEnabled} disabled={!canEdit} icon={Volume2} onChange={(v) => setPrefs({ ...prefs, soundEnabled: v })}
                  label={t('Naye order par awaz')} desc={t('POS khula ho to ghanti bajti hai')} />
                <Toggle checked={prefs.quietHoursEnabled} disabled={!canEdit} icon={Moon} onChange={(v) => setPrefs({ ...prefs, quietHoursEnabled: v })}
                  label={t('Khamosh waqt')} desc={t('Is waqt me sirf app ke andar khabar, awaz aur SMS nahi')} />
              </div>
              {prefs.quietHoursEnabled && (
                <div className="mt-2 flex items-center gap-2">
                  <Input type="time" size="sm" aria-label={t('Shuru')} value={prefs.quietHoursStart} disabled={!canEdit} onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })} wrapperClassName="w-32" />
                  <span className="text-slate-400">–</span>
                  <Input type="time" size="sm" aria-label={t('Khatam')} value={prefs.quietHoursEnd} disabled={!canEdit} onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })} wrapperClassName="w-32" />
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {canEdit && (changed || prefsChanged) && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200">
          <p className="text-[0.8125rem] text-slate-600">{t('Tabdeeliyan save nahi huin')}</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft({}); if (prefsQ.data) setPrefs(prefsQ.data); }}>{t('Chhor dein')}</Button>
            <Button size="sm" onClick={trySave} loading={save.isPending || savePrefs.isPending} leftIcon={<Save className="h-4 w-4" />}>{t('Save')} <Kbd className="ms-1 hidden sm:inline-flex">Ctrl S</Kbd></Button>
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Market settings')} onClose={guide.close}
          flow={[
            { label: t('Market section'), hint: t('Profile me'), icon: Store, color: TONE.violet },
            { label: t('Switches'), hint: t('Sirf kaam ke'), icon: Settings2, color: TONE.blue },
            { label: t('Customer ka checkout'), icon: Package, color: TONE.green },
          ]}
          steps={[
            { icon: Settings2, color: TONE.blue, title: t('Order ka tareeqa'), text: t('Yeh switches customer ke checkout ko badalte hain. Har section ke apne switches hain, isi liye sirf aap wale dikhte hain.') },
            { icon: Package, color: TONE.amber, title: t('Kam se kam order'), text: t('Chhote orders par delivery mehngi parti hai to had rakh dein.') },
            { icon: Bell, color: TONE.pink, title: t('Notifications'), text: t('Naye order ki khabar app, email ya SMS par.') },
          ]}
          tips={[t('Section badalna ho to Dukaan profile → Market section.')]}
          shortcuts={[['Ctrl S', t('save')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
