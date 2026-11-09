/**
 * WhatsApp Business (Online store → WhatsApp Business): Nafaa sends the
 * order messages from the shop's own WhatsApp number. New COD order →
 * confirmation with "Haan confirm" / "Cancel" buttons, and the customer's
 * tap sets the order's confirmation on the board by itself. Dispatched and
 * delivered messages too. Templates go to Meta for approval; Meta charges
 * each message to the shop's own WhatsApp account (estimate shown).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, GraduationCap, Heart, MessageCircle, Phone, RefreshCw, Send, ShoppingCart, Truck, Unplug, Wallet } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, PageHero, PageShell, Segmented, Skeleton, Switch, confirmDialog, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { apiError } from '@modules/growth/api/growth.api';
import { WA_KEY, whatsappApi, type TemplateStatus, type WaKey, type WaStatus } from './whatsapp.api';

const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const KEY_INFO: Record<WaKey, { label: () => string; icon: typeof MessageCircle; color: string }> = {
  confirm: { label: () => t('Order confirm (buttons ke saath)'), icon: CheckCircle2, color: '#16a34a' },
  dispatched: { label: () => t('Dispatched — tracking'), icon: Truck, color: '#ea580c' },
  delivered: { label: () => t('Delivered — shukriya'), icon: Heart, color: '#db2777' },
  cart: { label: () => t('Cart wapas'), icon: ShoppingCart, color: '#2563eb' },
};
const TPL_VARIANT: Record<TemplateStatus, 'success' | 'warning' | 'danger' | 'default'> = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', PAUSED: 'danger', DISABLED: 'danger', DRAFT: 'default', NOT_SUBMITTED: 'default' };
const tplLabel = (s: TemplateStatus) => ({ APPROVED: t('Approve'), PENDING: t('Meta check kar raha'), REJECTED: t('Mana hua'), PAUSED: t('Ruka hua'), DISABLED: t('Band'), DRAFT: t('Nahi bheja'), NOT_SUBMITTED: t('Nahi bheja') }[s]);

export default function WhatsAppBusinessPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = MANAGERS.includes(String(role));
  const q = useQuery({ queryKey: [WA_KEY, 'status'], queryFn: whatsappApi.status });
  const d = q.data;
  const ready = !!d?.access.live && !!d.facebookConnected;
  const msgsQ = useQuery({ queryKey: [WA_KEY, 'messages'], queryFn: () => whatsappApi.messages(), enabled: !!d?.connected });
  const set = (s: WaStatus) => qc.setQueryData([WA_KEY, 'status'], s);
  const err = (fallback: string) => (e: unknown) => toast.error(apiError(e, fallback));

  const settings = useMutation({ mutationFn: whatsappApi.saveSettings, onSuccess: (s) => { set(s); toast.success(t('Save ho gaya')); }, onError: err(t('Save nahi hua')) });
  const submit = useMutation({
    mutationFn: () => whatsappApi.submitTemplates(),
    onSuccess: (r) => { set(r.status); const bad = r.results.filter((x) => !x.ok); bad.length ? toast.error(bad.map((b) => b.error).join(' · ')) : toast.success(t('Messages Meta ko bhej diye — approve hone me kuch minute se 1 din')); },
    onError: err(t('Meta ko nahi gaye')),
  });
  const sync = useMutation({ mutationFn: whatsappApi.syncTemplates, onSuccess: set, onError: err(t('Status nahi aaya')) });
  const disconnect = useMutation({ mutationFn: whatsappApi.disconnect, onSuccess: () => { toast.success(t('Number hata diya')); qc.invalidateQueries({ queryKey: [WA_KEY] }); }, onError: err(t('Nahi hua')) });

  const approved = d?.templates.filter((x) => x.status === 'APPROVED').length ?? 0;
  const sent30 = d ? Object.values(d.last30.sent).reduce((s: number, n) => s + (n ?? 0), 0) : 0;

  return (
    <PageShell>
      <PageHero back="/online-store" backLabel={t('Online store')} title={t('WhatsApp Business')}
        chip={<><MessageCircle /> {' '}{t('Apne number se khud message')}</>}
        meta={t('Naye order par confirm ka message buttons ke saath; customer "Haan confirm" dabaye to order khud confirm ho jata hai')}
        loading={q.isLoading} busy={q.isFetching && !q.isLoading}
        actions={<>
          {d?.connected && canManage && <button type="button" onClick={() => sync.mutate()} className={heroButton}><RefreshCw className="h-4 w-4" /> {' '}{t('Status check')}</button>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Messages (30 din)'), value: String(sent30) },
          { label: t('WhatsApp se confirm'), value: String(d?.last30.confirmedYes ?? 0), hint: d ? t('{{no}} ne cancel kaha', { no: d.last30.confirmedNo }) : undefined },
          { label: t('Jawab aaye'), value: String(d?.last30.replies ?? 0) },
          { label: t('Approve messages'), value: `${approved} / ${d?.templates.length ?? 4}` },
        ]} />

      {!d ? <Skeleton className="h-64 rounded-3xl" /> : !d.access.live ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-[0.8125rem] ring-1 ring-slate-200 sm:flex-row sm:items-center">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200"><Clock className="h-3.5 w-3.5" /> {d.access.reason === 'paused' ? t('Ruka hua') : t('Jald')}</span>
          <p className="text-slate-600">{d.access.reason === 'paused' ? t('WhatsApp ka kaam Nafaa ne thori der ke liye rok rakha hai. Tab tak board ka WhatsApp button istemal karein.') : t('Apne number se khud message aur buttons wala confirm — is ke liye Meta ki manzoori chahiye. Manzoori milte hi yahan aa jayega; tab tak board ka WhatsApp button istemal karein.')}</p>
        </div>
      ) : !d.facebookConnected ? (
        <Alert tone="info" title={t('Pehle Facebook se joren')} action={<Link to="/settings/facebook"><Button size="sm">{t('Facebook se joren')}</Button></Link>}>
          {t('WhatsApp Business number Facebook ke business account se aata hai. Jorte waqt WhatsApp ki ijazat bhi dein.')}
        </Alert>
      ) : (
        <>
          {d.lastError && <Alert tone="warning" title={t('Aakhri message nahi gaya')}>{d.lastError}</Alert>}
          {d.connected ? <NumberCard d={d} canManage={canManage} onDisconnect={async () => { if (await confirmDialog({ title: t('WhatsApp number hatayein?'), text: t('Nafaa is number se message bhejna band kar dega.'), danger: true })) disconnect.mutate(); }} />
            : <ConnectCard canManage={canManage} onDone={set} />}

          {d.connected && d.settings && (
            <div className="grid gap-3 lg:grid-cols-2">
              <Card title={t('Kab message jaye')}>
                <div className="space-y-3">
                  <Switch checked={d.settings.sendConfirm} disabled={!canManage || settings.isPending} onChange={(e) => settings.mutate({ sendConfirm: e.target.checked })}
                    label={t('Naya order → confirm ka message')} description={t('"Haan confirm" / "Cancel" buttons; jawab order par khud lagta hai')} />
                  {d.settings.sendConfirm && <Switch checked={d.settings.confirmCodOnly} disabled={!canManage || settings.isPending} onChange={(e) => settings.mutate({ confirmCodOnly: e.target.checked })} label={t('Sirf COD orders')} />}
                  <Switch checked={d.settings.sendDispatched} disabled={!canManage || settings.isPending} onChange={(e) => settings.mutate({ sendDispatched: e.target.checked })} label={t('Parcel nikla → tracking ka message')} />
                  <Switch checked={d.settings.sendDelivered} disabled={!canManage || settings.isPending} onChange={(e) => settings.mutate({ sendDelivered: e.target.checked })} label={t('Deliver hua → shukriya aur rai')} />
                  <Segmented value={d.settings.language} onChange={(v) => settings.mutate({ language: v })} label={t('Message ki zabaan')}
                    items={[{ value: 'en', label: t('Roman / English') }, { value: 'ur', label: t('Urdu') }]} />
                </div>
              </Card>
              <CostCard d={d} />
            </div>
          )}

          {d.connected && (
            <Card title={t('Meta se approve messages')} actions={canManage ? <Button size="sm" loading={submit.isPending} onClick={() => submit.mutate()} leftIcon={<Send className="h-4 w-4" />}>{t('Meta ko bhejein')}</Button> : undefined}>
              <p className="mb-3 text-[0.8125rem] text-slate-600">{t('WhatsApp par pehla message sirf Meta ke approve kiye hue text se jata hai. Aap ke "WhatsApp messages" wale text bheje jate hain (confirm ka text Nafaa ka hai kyun ke us me buttons hain).')} <Link to="/online-store/whatsapp-templates" className="font-semibold text-brand-700 hover:underline">{t('Text badlein')}</Link></p>
              <ul className="divide-y divide-slate-100">
                {d.templates.map((x) => {
                  const info = KEY_INFO[x.key];
                  return (
                    <li key={x.key} className="flex items-start gap-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${info.color}17`, color: info.color }}><info.icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">{info.label()} <Badge variant={TPL_VARIANT[x.status]} size="sm">{tplLabel(x.status)}</Badge>{x.category === 'MARKETING' && <Badge variant="outline" size="sm">{t('Marketing')}</Badge>}</p>
                        {x.body && <p className="mt-0.5 line-clamp-2 text-[0.75rem] text-slate-500">{x.body}</p>}
                        {x.rejectedReason && <p className="mt-0.5 text-[0.75rem] text-rose-600">{t('Wajah: {{reason}}', { reason: x.rejectedReason })}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {d.connected && (
            <Card title={t('Customers ke jawab')}>
              {msgsQ.isLoading ? <Skeleton className="h-32 rounded-xl" /> : !(msgsQ.data?.items.length) ? (
                <p className="text-sm text-slate-500">{t('Abhi koi message nahi.')}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {msgsQ.data.items.slice(0, 40).map((m) => (
                    <li key={m.id} className="flex items-start gap-3 py-2">
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${m.direction === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{m.direction === 'IN' ? t('Aaya') : t('Gaya')}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] text-slate-900"><b>{m.customerName ?? m.toPhone}</b>{m.orderNo ? <span className="text-slate-500"> · #{m.orderNo}</span> : null}</p>
                        <p className="truncate text-[0.75rem] text-slate-600">{m.body}</p>
                        {m.errorMessage && <p className="text-[0.75rem] text-rose-600">{m.errorMessage}</p>}
                      </div>
                      <span className="shrink-0 text-[0.6875rem] text-slate-400">{new Date(m.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[0.75rem] text-slate-500">{t('Customer ka likha hua jawab')} <Link to="/online-store/inbox" className="font-semibold text-brand-700 hover:underline">{t('Inbox')}</Link> {t('me bhi aata hai, wahan se jawab dein (24 ghante ke andar).')}</p>
            </Card>
          )}
        </>
      )}

      {guide.isOpen && (
        <PageGuide title={t('WhatsApp Business')} onClose={guide.close}
          flow={[
            { label: t('Order aaya'), hint: t('COD'), icon: ShoppingCart, color: '#2563eb' },
            { label: t('Message gaya'), hint: t('Buttons ke saath'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Customer ne dabaya'), hint: t('Haan / Cancel'), icon: Phone, color: '#0d9488' },
            { label: t('Board par'), hint: t('Confirm khud laga'), icon: CheckCircle2, color: '#16a34a' },
            { label: t('Parcel nikla'), hint: t('Tracking message'), icon: Truck, color: '#ea580c' },
          ]}
          steps={[
            { icon: Phone, color: '#16a34a', title: t('Number joren'), text: t('Facebook se jor kar apna WhatsApp Business number chunein.') },
            { icon: Send, color: '#2563eb', title: t('Messages approve karwayein'), text: t('"Meta ko bhejein" dabayein. Approve hote hi messages khud jane lagte hain.') },
            { icon: CheckCircle2, color: '#0d9488', title: t('Jawab khud lagta hai'), text: t('Customer "Haan confirm" dabaye to order par Confirmed, "Cancel" dabaye to Mana lag jata hai.') },
            { icon: Wallet, color: '#7c3aed', title: t('Kharcha'), text: t('Har message ka paisa Meta aap ke apne WhatsApp account se leta hai. Andaza neeche likha hai.') },
          ]} />
      )}
    </PageShell>
  );
}

function NumberCard({ d, canManage, onDisconnect }: { d: WaStatus; canManage: boolean; onDisconnect: () => void }) {
  const [phone, setPhone] = useState('');
  const test = useMutation({ mutationFn: () => whatsappApi.test(phone), onSuccess: () => toast.success(t('Test message chala gaya')), onError: (e) => toast.error(apiError(e, t('Test message nahi gaya'))) });
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Phone className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 text-[0.8125rem]">
        <p className="font-semibold text-slate-900">{d.number?.displayPhone} {d.number?.name ? <span className="font-normal text-slate-500">· {d.number.name}</span> : null}</p>
        <p className="text-slate-600">{t('Jura hua')}{d.number?.quality ? ` · ${t('Quality: {{q}}', { q: d.number.quality })}` : ''}</p>
      </div>
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" aria-label={t('Test number')} className="w-36" />
          <Button size="sm" variant="secondary" loading={test.isPending} disabled={phone.replace(/\D/g, '').length < 10} onClick={() => test.mutate()}>{t('Test bhejein')}</Button>
          <Button size="sm" variant="ghost" onClick={onDisconnect} leftIcon={<Unplug className="h-4 w-4" />}>{t('Hatayein')}</Button>
        </div>
      )}
    </div>
  );
}

function ConnectCard({ canManage, onDone }: { canManage: boolean; onDone: (s: WaStatus) => void }) {
  const numbersQ = useQuery({ queryKey: [WA_KEY, 'numbers'], queryFn: whatsappApi.numbers, enabled: canManage });
  const [pick, setPick] = useState<{ wabaId: string; phoneId: string } | null>(null);
  const connect = useMutation({ mutationFn: () => whatsappApi.connect(pick!.wabaId, pick!.phoneId), onSuccess: (s) => { onDone(s); toast.success(t('WhatsApp number jur gaya')); }, onError: (e) => toast.error(apiError(e, t('Number nahi jura'))) });
  if (!canManage) return <Alert tone="info">{t('WhatsApp number malik ya manager jorta hai.')}</Alert>;
  const accounts = numbersQ.data?.accounts ?? [];
  return (
    <Card title={t('WhatsApp number chunein')} actions={<Button size="sm" loading={connect.isPending} disabled={!pick} onClick={() => connect.mutate()}>{t('Joren')}</Button>}>
      {numbersQ.isLoading ? <Skeleton className="h-24 rounded-xl" /> : numbersQ.isError ? <p className="text-sm text-rose-600">{apiError(numbersQ.error, t('Numbers nahi aaye'))}</p> : !accounts.some((a) => a.phones.length) ? (
        <p className="text-sm text-slate-600">{t('Facebook business me koi WhatsApp number nahi mila. Facebook se dobara jorte waqt WhatsApp account bhi chunein.')}</p>
      ) : (
        <ul className="space-y-2">
          {accounts.flatMap((a) => a.phones.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-slate-200 hover:bg-slate-50">
                <input type="radio" name="wa-number" checked={pick?.phoneId === p.id} onChange={() => setPick({ wabaId: a.id, phoneId: p.id })} />
                <span className="min-w-0 flex-1 text-sm"><b>{p.displayPhone}</b> · {p.name} <span className="text-slate-500">({a.name})</span></span>
              </label>
            </li>
          )))}
        </ul>
      )}
    </Card>
  );
}

function CostCard({ d }: { d: WaStatus }) {
  const e = d.estimate;
  return (
    <Card title={t('Kharche ka andaza (mahina)')}>
      <div className="space-y-2 text-[0.8125rem]">
        <p className="text-2xl font-bold text-slate-900">Rs {e.pkr.toLocaleString('en-PK')}</p>
        <p className="text-slate-600">{t('Pichle 30 din ke orders ke hisaab se: {{confirm}} confirm, {{dispatched}} tracking, {{delivered}} shukriya.', { confirm: e.perMonth.confirm ?? 0, dispatched: e.perMonth.dispatched ?? 0, delivered: e.perMonth.delivered ?? 0 })}</p>
        <p className="text-slate-500">{t('Order wale message takreeban Rs {{u}} har ek, marketing message Rs {{m}}. Paisa Meta aap ke apne WhatsApp account se leta hai, Nafaa nahi. Customer 24 ghante me jawab de to us dauran order wale message muft hain.', { u: e.perMessagePkr.UTILITY, m: e.perMessagePkr.MARKETING })}</p>
      </div>
    </Card>
  );
}
