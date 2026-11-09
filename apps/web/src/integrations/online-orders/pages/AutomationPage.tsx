/**
 * Automation (/online-store/automation): "Agar ye ho → to wo karo" on top of
 * order and stock events. Ready-made recipes switch on with one tap; the
 * rule builder takes an event, conditions (channel, city, amount, COD or
 * prepaid, customer RTO history, product, tag, time) and actions (status,
 * tag, staff, courier, advance request, note, owner alert, hide product,
 * push stock). Every rule can be dry-run; every run is logged here and on
 * the order's timeline.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BellRing, Boxes, CheckCircle2, CircleDollarSign, Clock, CreditCard, FlaskConical, GraduationCap, MapPin, MessageCircle, PackageX, Pencil, Plus,
  ShieldAlert, Tag, Trash2, Truck, UserCheck, Workflow, XCircle, Zap, type LucideIcon,
} from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, Input, Modal, PageHero, PageShell, Select, Skeleton, Switch, confirmDialog, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import {
  AUTOMATION_EVENTS, insightsApi, type ActionType, type AutomationAction, type AutomationEvent, type AutomationRule, type AutomationRun, type Conditions,
  type DryRunResult, type RecipeKey, type RecipeParams, type RuleDraft,
} from '../api/insights.api';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { COURIER_OPTIONS } from '../lib/labels';
import { BOARD } from '../lib/orders';
import { whenShort } from '../lib/tracking';
import { ProductPicker } from '../components/products/ProductPicker';

const EVENT_LABEL: Record<AutomationEvent, string> = {
  ORDER_RECEIVED: t('Naya order aaye'),
  CONFIRMED: t('Order confirm ho'),
  PACKED: t('Order pack ho'),
  DISPATCHED: t('Courier ko diya jaye'),
  DELIVERED: t('Deliver ho jaye'),
  RETURNED: t('Wapas aaye (RTO)'),
  PAYMENT_RECEIVED: t('COD ka paisa aaye'),
  STOCK_LOW: t('Stock kam ho'),
};

const ACTION_LABEL: Record<ActionType, string> = {
  SET_STATUS: t('Status badlo'),
  TAG: t('Tag lagao'),
  ASSIGN: t('Staff ko do'),
  BOOK_COURIER: t('Courier book karo'),
  ASK_ADVANCE: t('Advance maango (WhatsApp)'),
  NOTE: t('Note likho'),
  NOTIFY: t('Malik ko khabar do'),
  HIDE_PRODUCT: t('Channel se product hatao'),
  PUSH_STOCK: t('Stock channel par bhejo'),
};
const ORDER_ACTIONS: ActionType[] = ['SET_STATUS', 'TAG', 'ASSIGN', 'BOOK_COURIER', 'ASK_ADVANCE', 'NOTE', 'NOTIFY'];
const PRODUCT_ACTIONS: ActionType[] = ['HIDE_PRODUCT', 'PUSH_STOCK', 'NOTIFY'];
const SETTABLE = ['NEW', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'CONFIRMED', 'PACKED', 'PACKED_NOT_SENT', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'ISSUE', 'CLAIM'];
const RISKS = ['NEW', 'OK', 'WATCH', 'HIGH', 'BLOCKED'];
const DAYS = [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];
const COURIERS = COURIER_OPTIONS.filter((c) => c.code !== 'RIDER' && c.code !== 'OTHER');

const RECIPES: { key: RecipeKey; title: string; text: string; icon: LucideIcon; color: string }[] = [
  { key: 'auto_confirm_prepaid', title: t('Prepaid order khud confirm'), text: t('Paisa pehle aa gaya to order seedha Confirmed'), icon: CreditCard, color: 'text-success-600' },
  { key: 'hold_big_cod_new', title: t('Bara COD, naya customer → hold'), text: t('Pehli dafa ka bara COD order call se pehle rok lo'), icon: ShieldAlert, color: 'text-amber-600' },
  { key: 'city_courier', title: t('Shehar → courier'), text: t('Is shehar ke orders confirm hote hi is courier par book'), icon: Truck, color: 'text-orange-600' },
  { key: 'rto_advance', title: t('RTO wale se advance'), text: t('Jis ke parcel pehle wapas aaye, us se advance maango'), icon: CircleDollarSign, color: 'text-violet-600' },
  { key: 'low_stock_unlist', title: t('Stock kam → channel se hatao'), text: t('Stock khatam hone se pehle product channel par band'), icon: PackageX, color: 'text-rose-600' },
];

const emptyConditions = (): Conditions => ({
  channelIds: [], cities: [], citiesExclude: false, amountMin: null, amountMax: null, payment: 'ANY', rtoMin: null, newCustomer: null,
  risks: [], productIds: [], tags: [], hourFrom: null, hourTo: null, days: [], stockBelow: null,
});
const blankRule = (): RuleDraft => ({ name: '', event: 'ORDER_RECEIVED', conditions: emptyConditions(), actions: [{ type: 'NOTIFY', text: '' }], enabled: true });
const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const boardLabel = (k: string) => BOARD.find((b) => b.key === k)?.label ?? k;

function conditionText(c: Conditions, channels: { id: string; displayName: string }[]): string[] {
  const out: string[] = [];
  if (c.channelIds.length) out.push(c.channelIds.map((id) => channels.find((x) => x.id === id)?.displayName ?? id).join(' / '));
  if (c.cities.length) out.push(`${c.citiesExclude ? t('Shehar nahi') : t('Shehar')}: ${c.cities.join(', ')}`);
  if (c.amountMin != null) out.push(`Rs ${c.amountMin}+`);
  if (c.amountMax != null) out.push(t('Rs {{n}} tak', { n: c.amountMax }));
  if (c.payment !== 'ANY') out.push(c.payment === 'COD' ? 'COD' : 'Prepaid');
  if (c.rtoMin != null) out.push(t('{{n}}+ RTO', { n: c.rtoMin }));
  if (c.newCustomer === true) out.push(t('Naya customer'));
  if (c.newCustomer === false) out.push(t('Purana customer'));
  if (c.risks.length) out.push(`Risk: ${c.risks.join(', ')}`);
  if (c.productIds.length) out.push(t('{{n}} product', { n: c.productIds.length }));
  if (c.tags.length) out.push(`Tag: ${c.tags.join(', ')}`);
  if (c.hourFrom != null || c.hourTo != null) out.push(`${c.hourFrom ?? 0}:00–${c.hourTo ?? 24}:00`);
  if (c.days.length) out.push(c.days.map((d) => DAYS[d]).join(', '));
  if (c.stockBelow != null) out.push(t('Stock {{n}} se kam', { n: c.stockBelow }));
  return out;
}

function actionText(a: AutomationAction, staff: { id: string; name: string }[]): string {
  switch (a.type) {
    case 'SET_STATUS': return `${ACTION_LABEL.SET_STATUS}: ${boardLabel(a.to)}`;
    case 'TAG': return `${ACTION_LABEL.TAG}: ${a.tag}`;
    case 'ASSIGN': return `${ACTION_LABEL.ASSIGN}: ${staff.find((s) => s.id === a.userId)?.name ?? '—'}`;
    case 'BOOK_COURIER': return `${ACTION_LABEL.BOOK_COURIER}: ${a.courier === 'BEST' ? t('shehar ka best') : a.courier}`;
    case 'ASK_ADVANCE': return `${ACTION_LABEL.ASK_ADVANCE}: ${a.pct}%`;
    default: return ACTION_LABEL[a.type];
  }
}

const RUN_BADGE: Record<AutomationRun['status'], 'success' | 'warning' | 'danger' | 'default'> = { DONE: 'success', PARTIAL: 'warning', FAILED: 'danger', SKIPPED: 'default' };

export default function AutomationPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const { data: channels } = useSalesChannels();
  const chans = (channels ?? []).map((c) => ({ id: c.id, displayName: c.displayName }));
  const q = useQuery({ queryKey: ['automation'], queryFn: insightsApi.automation, refetchInterval: 60_000 });
  const d = q.data;
  const [editing, setEditing] = useState<{ id: string | null; draft: RuleDraft } | null>(null);
  const [dry, setDry] = useState<{ title: string; result: DryRunResult } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['automation'] });

  const recipe = useMutation({
    mutationFn: (v: { key: RecipeKey; enabled: boolean; params?: RecipeParams }) => insightsApi.recipe(v.key, { enabled: v.enabled, params: v.params }),
    onSuccess: (_r, v) => { refresh(); toast.success(v.enabled ? t('Recipe on ho gayi') : t('Recipe band')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const enable = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => insightsApi.setEnabled(v.id, v.enabled),
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({ mutationFn: (id: string) => insightsApi.deleteRule(id), onSuccess: () => { refresh(); toast.success(t('Rule mita diya')); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const dryRun = useMutation({
    mutationFn: (v: { title: string; body: Parameters<typeof insightsApi.dryRun>[0] }) => insightsApi.dryRun(v.body).then((result) => ({ title: v.title, result })),
    onSuccess: setDry,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const custom = (d?.rules ?? []).filter((r) => !r.recipe);
  const on = (d?.rules ?? []).filter((r) => r.enabled).length;
  const runsOk = (d?.runs ?? []).filter((r) => !r.dryRun && r.status === 'DONE').length;
  const runsBad = (d?.runs ?? []).filter((r) => !r.dryRun && (r.status === 'FAILED' || r.status === 'PARTIAL')).length;

  return (
    <PageShell>
      <PageHero title={t('Automation')} chip={<><Workflow />{t('Agar ye → to wo')}</>}
        meta={t('Order aur stock ke waqiat par kaam khud ho — har run order ki timeline par likha jata hai')}
        busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<>
          <button type="button" className={heroButton} onClick={() => setEditing({ id: null, draft: blankRule() })}><Plus className="h-4 w-4" /> {t('Naya rule')}</button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Rules on'), value: d ? String(on) : '' },
          { label: t('Recipes on'), value: d ? String(d.recipes.filter((r) => r.enabled).length) : '', hint: d ? t('{{n}} me se', { n: d.recipes.length }) : undefined },
          { label: t('Kamyab runs'), value: d ? String(runsOk) : '', hint: t('aakhri 40') },
          { label: t('Masle wale runs'), value: d ? String(runsBad) : '' },
        ]} />

      {d?.dryRunOnly && <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-[0.8125rem] text-amber-800"><FlaskConical className="h-4 w-4" />{t('Is server par automation sirf dry run hai — kuch badla nahi jata.')}</p>}

      {q.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : q.error ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(q.error)}</p> : d && (
        <>
          <section aria-labelledby="recipes-title">
            <h2 id="recipes-title" className="mb-2 flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Zap className="h-4 w-4 text-slate-400" />{t('Tayyar recipes — ek tap se on')}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {RECIPES.map((r) => {
                const row = d.recipes.find((x) => x.key === r.key)!;
                return <RecipeCard key={r.key} info={r} enabled={row.enabled} params={row.params} busy={recipe.isPending && recipe.variables?.key === r.key}
                  onChange={(enabled, params) => recipe.mutate({ key: r.key, enabled, params })}
                  onDry={row.ruleId ? () => dryRun.mutate({ title: r.title, body: { ruleId: row.ruleId! } }) : undefined} />;
              })}
            </div>
          </section>

          <Card className="rounded-2xl" title={t('Aap ke rules')} actions={<Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, draft: blankRule() })}>{t('Naya rule')}</Button>}>
            {!custom.length ? (
              <p className="py-8 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi apna rule nahi. "Naya rule" se banayein — jaise: Agar Karachi ka COD order Rs 10,000 se zyada ho → On hold + malik ko khabar.')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {custom.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-3 py-3">
                    <Switch checked={r.enabled} onChange={(e) => enable.mutate({ id: r.id, enabled: e.currentTarget.checked })} aria-label={t('On / off')} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.875rem] font-semibold text-slate-900">{r.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.75rem]">
                        <Badge size="xs" variant="info">{t('Jab')}: {EVENT_LABEL[r.event]}</Badge>
                        {conditionText(r.conditions, chans).map((c) => <Badge key={c} size="xs" variant="outline">{c}</Badge>)}
                        <span className="text-slate-400">→</span>
                        {r.actions.map((a, i) => <Badge key={i} size="xs" variant="brand">{actionText(a, d.staff)}</Badge>)}
                      </div>
                      <div className="mt-1 text-[0.6875rem] text-slate-500">{t('{{n}} dafa chala', { n: r.runCount })}{r.lastRunAt ? ` · ${whenShort(r.lastRunAt)}` : ''}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="xs" variant="outline" leftIcon={<FlaskConical className="h-3.5 w-3.5" />} loading={dryRun.isPending && dryRun.variables?.title === r.name} onClick={() => dryRun.mutate({ title: r.name, body: { ruleId: r.id } })}>{t('Dry run')}</Button>
                      <Button size="xs" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing({ id: r.id, draft: { name: r.name, event: r.event, conditions: r.conditions, actions: r.actions, enabled: r.enabled } })}>{t('Badlein')}</Button>
                      <Button size="xs" variant="ghost" leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={async () => { if (await confirmDialog({ title: t('Rule mitayein?'), text: r.name, danger: true })) remove.mutate(r.id); }} aria-label={t('Mitayein')} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl" title={t('Aakhri runs')}>
            {!d.runs.length ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi rule nahi chala')}</p> : (
              <ul className="divide-y divide-slate-100">
                {d.runs.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-2 py-2 text-[0.8125rem]">
                    <span className="w-28 shrink-0 text-[0.75rem] tabular-nums text-slate-500">{whenShort(r.at)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <b className="text-slate-900">{r.ruleName}</b>
                        <span className="text-slate-500">· {r.subject}</span>
                        <Badge size="xs" variant={RUN_BADGE[r.status]}>{r.status}</Badge>
                        {r.dryRun && <Badge size="xs" variant="outline">{t('Dry run')}</Badge>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[0.75rem] text-slate-600">
                        {(r.results ?? []).map((x, i) => (
                          <span key={i} className={cn('inline-flex items-center gap-1', !x.ok && 'text-rose-700')}>
                            {x.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{x.text}
                            {x.link && <a href={x.link} target="_blank" rel="noreferrer" className="font-semibold text-success-700 hover:underline">WhatsApp</a>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {editing && d && (
        <RuleEditor key={editing.id ?? 'new'} initial={editing.draft} staff={d.staff} channels={chans}
          onClose={() => setEditing(null)}
          onDry={(draft) => dryRun.mutate({ title: draft.name || t('Naya rule'), body: { rule: draft } })}
          dryBusy={dryRun.isPending}
          onSave={async (draft) => {
            try {
              if (editing.id) await insightsApi.updateRule(editing.id, draft); else await insightsApi.createRule(draft);
              toast.success(t('Rule save ho gaya'));
              setEditing(null);
              refresh();
            } catch (e) { toast.error(apiErrorMessage(e)); }
          }} />
      )}

      {dry && <DryRunModal title={dry.title} result={dry.result} onClose={() => setDry(null)} />}

      {guide.isOpen && (
        <PageGuide title={t('Automation')} onClose={guide.close}
          flow={[
            { label: t('Jab'), hint: t('naya order, confirm, deliver…'), icon: Clock, color: '#0284c7' },
            { label: t('Agar'), hint: t('shehar, raqam, COD, RTO…'), icon: MapPin, color: '#7c3aed' },
            { label: t('To'), hint: t('status, courier, advance…'), icon: Zap, color: '#16a34a' },
          ]}
          steps={[
            { icon: Zap, color: '#16a34a', title: t('Recipes'), text: t('Aam kaam ke tayyar rules — switch on karein, number apne hisaab se badlein.') },
            { icon: FlaskConical, color: '#d97706', title: t('Dry run'), text: t('Dry run aakhri 30 orders par dikhata hai rule kis par chalta aur kya karta — kuch badalta nahi.') },
            { icon: MessageCircle, color: '#16a34a', title: t('Advance (WhatsApp)'), text: t('Nafaa WhatsApp khud nahi bhejta: order par tayyar message aur link ban jata hai, aap ek click me bhejte hain.') },
            { icon: AlertTriangle, color: '#e11d48', title: t('Loop guard'), text: t('Ek rule ek order par ek hi dafa chalta hai, aur rules ek doosre ko 3 se zyada dafa nahi chala sakte.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}

function RecipeCard({ info, enabled, params, busy, onChange, onDry }: {
  info: (typeof RECIPES)[number]; enabled: boolean; params: RecipeParams; busy: boolean;
  onChange: (enabled: boolean, params?: RecipeParams) => void; onDry?: () => void;
}) {
  const [p, setP] = useState<RecipeParams>(params);
  const changed = JSON.stringify(p) !== JSON.stringify(params);
  const set = (k: keyof RecipeParams, v: string | number | undefined) => setP((x) => ({ ...x, [k]: v }));
  const Icon = info.icon;
  return (
    <Card className={cn('rounded-2xl', enabled && 'ring-2 ring-brand-500/40')}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', info.color)} />
        <div className="min-w-0 flex-1">
          <div className="text-[0.875rem] font-semibold text-slate-900">{info.title}</div>
          <div className="text-[0.75rem] text-slate-500">{info.text}</div>
        </div>
        <Switch checked={enabled} disabled={busy || (info.key === 'city_courier' && !p.courier)} onChange={(e) => onChange(e.currentTarget.checked, p)} aria-label={info.title} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {info.key === 'hold_big_cod_new' && <Input size="sm" type="number" label={t('Rs se zyada')} value={p.amount ?? ''} onChange={(e) => set('amount', num(e.target.value) ?? undefined)} />}
        {info.key === 'city_courier' && <>
          <Input size="sm" label={t('Shehar')} value={p.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          <Select size="sm" label={t('Courier')} value={p.courier ?? ''} onChange={(e) => set('courier', e.target.value)}
            options={[{ value: '', label: t('Chunein') }, { value: 'BEST', label: t('Shehar ka best (scorecard)') }, ...COURIERS.map((c) => ({ value: c.code, label: c.name }))]} />
        </>}
        {info.key === 'rto_advance' && <>
          <Input size="sm" type="number" label={t('Kitne RTO')} value={p.returns ?? ''} onChange={(e) => set('returns', num(e.target.value) ?? undefined)} />
          <Input size="sm" type="number" label={t('Advance %')} value={p.pct ?? ''} onChange={(e) => set('pct', num(e.target.value) ?? undefined)} />
        </>}
        {info.key === 'low_stock_unlist' && <Input size="sm" type="number" label={t('Stock is se kam')} value={p.stock ?? ''} onChange={(e) => set('stock', num(e.target.value) ?? undefined)} />}
      </div>
      <div className="mt-2 flex gap-1.5">
        {changed && enabled && <Button size="xs" variant="primary" loading={busy} onClick={() => onChange(true, p)}>{t('Save')}</Button>}
        {onDry && <Button size="xs" variant="ghost" leftIcon={<FlaskConical className="h-3.5 w-3.5" />} onClick={onDry}>{t('Dry run')}</Button>}
      </div>
    </Card>
  );
}

function RuleEditor({ initial, staff, channels, onClose, onSave, onDry, dryBusy }: {
  initial: RuleDraft; staff: { id: string; name: string }[]; channels: { id: string; displayName: string }[];
  onClose: () => void; onSave: (d: RuleDraft) => Promise<void>; onDry: (d: RuleDraft) => void; dryBusy: boolean;
}) {
  const [r, setR] = useState<RuleDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [cityText, setCityText] = useState(initial.conditions.cities.join(', '));
  const [products, setProducts] = useState<{ id: string; label: string }[]>(initial.conditions.productIds.map((id) => ({ id, label: id.slice(0, 8) })));
  const c = r.conditions;
  const productEvent = r.event === 'STOCK_LOW';
  const allowed = productEvent ? PRODUCT_ACTIONS : ORDER_ACTIONS;
  const setC = (patch: Partial<Conditions>) => setR((x) => ({ ...x, conditions: { ...x.conditions, ...patch } }));
  const setA = (i: number, a: AutomationAction) => setR((x) => ({ ...x, actions: x.actions.map((y, j) => (j === i ? a : y)) }));
  const draft = useMemo<RuleDraft>(() => ({
    ...r,
    conditions: { ...r.conditions, cities: cityText.split(',').map((s) => s.trim()).filter(Boolean), productIds: products.map((p) => p.id) },
    actions: r.actions.filter((a) => allowed.includes(a.type)),
  }), [r, cityText, products, allowed]);

  const newAction = (type: ActionType): AutomationAction => {
    switch (type) {
      case 'SET_STATUS': return { type, to: 'ON_HOLD' };
      case 'TAG': return { type, tag: '' };
      case 'ASSIGN': return { type, userId: staff[0]?.id ?? '' };
      case 'BOOK_COURIER': return { type, courier: 'BEST' };
      case 'ASK_ADVANCE': return { type, pct: 30 };
      case 'NOTE': return { type, text: '' };
      case 'NOTIFY': return { type, text: '' };
      case 'HIDE_PRODUCT': return { type, channelId: null };
      case 'PUSH_STOCK': return { type, channelId: null };
    }
  };
  const channelOptions = [{ value: '', label: t('Har channel') }, ...channels.map((x) => ({ value: x.id, label: x.displayName }))];

  return (
    <Modal open onClose={onClose} size="lg" title={initial.name ? t('Rule badlein') : t('Naya rule')}
      footer={<>
        <Button variant="outline" leftIcon={<FlaskConical className="h-4 w-4" />} loading={dryBusy} onClick={() => onDry(draft)}>{t('Dry run')}</Button>
        <Button variant="primary" loading={saving} onClick={async () => { setSaving(true); await onSave(draft); setSaving(false); }}>{t('Save')}</Button>
      </>}>
      <div className="space-y-4">
        <Input label={t('Naam')} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder={t('Jaise: Karachi bara COD hold')} />

        <section>
          <h3 className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Jab')}</h3>
          <Select value={r.event} onChange={(e) => {
            const event = e.target.value as AutomationEvent;
            const acts = event === 'STOCK_LOW' ? PRODUCT_ACTIONS : ORDER_ACTIONS;
            setR({ ...r, event, actions: r.actions.filter((a) => acts.includes(a.type)).length ? r.actions.filter((a) => acts.includes(a.type)) : [newAction(acts[0])] });
          }} options={AUTOMATION_EVENTS.map((ev) => ({ value: ev, label: EVENT_LABEL[ev] }))} />
        </section>

        <section className="space-y-2.5">
          <h3 className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Agar (sab sach hon)')}</h3>
          {productEvent ? (
            <Input type="number" label={t('Stock is se kam')} value={c.stockBelow ?? ''} onChange={(e) => setC({ stockBelow: num(e.target.value) })} />
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select label={t('Channel')} value={c.channelIds[0] ?? ''} onChange={(e) => setC({ channelIds: e.target.value ? [e.target.value] : [] })} options={[{ value: '', label: t('Koi bhi') }, ...channels.map((x) => ({ value: x.id, label: x.displayName }))]} />
                <Select label={t('Payment')} value={c.payment} onChange={(e) => setC({ payment: e.target.value as Conditions['payment'] })}
                  options={[{ value: 'ANY', label: t('Koi bhi') }, { value: 'COD', label: 'COD' }, { value: 'PREPAID', label: 'Prepaid' }]} />
                <Input label={t('Shehar (comma se)')} value={cityText} onChange={(e) => setCityText(e.target.value)} placeholder="Lahore, Isb, Khi" hint={t('Lhr, Isb, Khi jaise chhote naam bhi chalte hain')} />
                <Select label={t('Shehar ka matlab')} value={c.citiesExclude ? 'NOT' : 'IN'} onChange={(e) => setC({ citiesExclude: e.target.value === 'NOT' })}
                  options={[{ value: 'IN', label: t('In shehron me') }, { value: 'NOT', label: t('In shehron ke ilawa') }]} />
                <Input type="number" label={t('Raqam kam az kam (Rs)')} value={c.amountMin ?? ''} onChange={(e) => setC({ amountMin: num(e.target.value) })} />
                <Input type="number" label={t('Raqam zyada se zyada (Rs)')} value={c.amountMax ?? ''} onChange={(e) => setC({ amountMax: num(e.target.value) })} />
                <Input type="number" label={t('Customer ke RTO kam az kam')} value={c.rtoMin ?? ''} onChange={(e) => setC({ rtoMin: num(e.target.value) })} />
                <Select label={t('Customer')} value={c.newCustomer === null ? '' : c.newCustomer ? 'NEW' : 'OLD'} onChange={(e) => setC({ newCustomer: e.target.value === '' ? null : e.target.value === 'NEW' })}
                  options={[{ value: '', label: t('Koi bhi') }, { value: 'NEW', label: t('Pehla order') }, { value: 'OLD', label: t('Pehle bhi order kiya') }]} />
                <Input label={t('Tag (comma se)')} value={c.tags.join(', ')} onChange={(e) => setC({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" label={t('Ghanta se')} value={c.hourFrom ?? ''} onChange={(e) => setC({ hourFrom: num(e.target.value) })} placeholder="0" />
                  <Input type="number" label={t('Ghanta tak')} value={c.hourTo ?? ''} onChange={(e) => setC({ hourTo: num(e.target.value) })} placeholder="24" />
                </div>
              </div>
              <div>
                <div className="mb-1 text-[0.75rem] font-medium text-slate-600">Risk</div>
                <div className="flex flex-wrap gap-3">
                  {RISKS.map((k) => <Checkbox key={k} label={k} checked={c.risks.includes(k)} onChange={(e) => setC({ risks: e.currentTarget.checked ? [...c.risks, k] : c.risks.filter((x) => x !== k) })} />)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[0.75rem] font-medium text-slate-600">{t('Products (koi ek ho)')}</div>
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {products.map((p) => (
                    <Badge key={p.id} size="sm" variant="outline">{p.label}<button type="button" className="ms-1" onClick={() => setProducts((x) => x.filter((y) => y.id !== p.id))} aria-label={t('Hatayein')}>×</button></Badge>
                  ))}
                </div>
                <ProductPicker compact placeholder={t('Product jorein')} onPick={(p) => setProducts((x) => (x.some((y) => y.id === p.productId) ? x : [...x, { id: p.productId, label: p.name ?? p.label }]))} />
              </div>
            </>
          )}
          <div>
            <div className="mb-1 text-[0.75rem] font-medium text-slate-600">{t('Din (khali = har din)')}</div>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((label, i) => <Checkbox key={label} label={label} checked={c.days.includes(i)} onChange={(e) => setC({ days: e.currentTarget.checked ? [...c.days, i] : c.days.filter((x) => x !== i) })} />)}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('To ye karo')}</h3>
          {r.actions.map((a, i) => (
            <div key={i} className="grid items-end gap-2 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200/80 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Select size="sm" value={a.type} onChange={(e) => setA(i, newAction(e.target.value as ActionType))} options={allowed.map((x) => ({ value: x, label: ACTION_LABEL[x] }))} />
              <div>
                {a.type === 'SET_STATUS' && <Select size="sm" value={a.to} onChange={(e) => setA(i, { ...a, to: e.target.value })} options={SETTABLE.map((k) => ({ value: k, label: boardLabel(k) }))} />}
                {a.type === 'TAG' && <Input size="sm" value={a.tag} onChange={(e) => setA(i, { ...a, tag: e.target.value })} placeholder="vip" />}
                {a.type === 'ASSIGN' && <Select size="sm" value={a.userId} onChange={(e) => setA(i, { ...a, userId: e.target.value })} options={staff.map((s) => ({ value: s.id, label: s.name }))} />}
                {a.type === 'BOOK_COURIER' && <Select size="sm" value={a.courier} onChange={(e) => setA(i, { ...a, courier: e.target.value })}
                  options={[{ value: 'BEST', label: t('Shehar ka best (scorecard)') }, ...COURIERS.map((x) => ({ value: x.code, label: x.name }))]} />}
                {a.type === 'ASK_ADVANCE' && <Input size="sm" type="number" value={a.pct} onChange={(e) => setA(i, { ...a, pct: Number(e.target.value) || 30 })} rightIcon={<span className="text-xs">%</span>} />}
                {(a.type === 'NOTE' || a.type === 'NOTIFY') && <Input size="sm" value={a.text} onChange={(e) => setA(i, { ...a, text: e.target.value })} placeholder={a.type === 'NOTE' ? t('Note ka text') : t('Khabar ka text (khali = order ki tafseel)')} />}
                {(a.type === 'HIDE_PRODUCT' || a.type === 'PUSH_STOCK') && <Select size="sm" value={a.channelId ?? ''} onChange={(e) => setA(i, { ...a, channelId: e.target.value || null })} options={channelOptions} />}
              </div>
              <Button size="sm" variant="ghost" disabled={r.actions.length <= 1} onClick={() => setR({ ...r, actions: r.actions.filter((_, j) => j !== i) })} aria-label={t('Hatayein')} leftIcon={<Trash2 className="h-4 w-4" />} />
            </div>
          ))}
          {r.actions.length < 8 && <Button size="xs" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setR({ ...r, actions: [...r.actions, newAction(allowed[0])] })}>{t('Aur kaam')}</Button>}
          <p className="flex items-start gap-1.5 text-[0.6875rem] text-slate-500">
            <Boxes className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('Courier booking confirm hue order par hi hoti hai. Advance ka WhatsApp message tayyar ho kar order par aata hai — bhejna aap ke haath me.')}
          </p>
        </section>
        <Switch label={t('Rule on')} checked={r.enabled} onChange={(e) => setR({ ...r, enabled: e.currentTarget.checked })} />
      </div>
    </Modal>
  );
}

function DryRunModal({ title, result: r, onClose }: { title: string; result: DryRunResult; onClose: () => void }) {
  const [all, setAll] = useState(false);
  const list = all ? r.results : r.results.filter((x) => x.matched);
  return (
    <Modal open onClose={onClose} size="lg" title={`${t('Dry run')}: ${title}`}
      description={t('{{checked}} me se {{matched}} par chalta — kuch badla nahi gaya', { checked: r.checked, matched: r.matched })}>
      <Switch size="sm" label={t('Jin par nahi chalta woh bhi dikhayein')} checked={all} onChange={(e) => setAll(e.currentTarget.checked)} />
      {!list.length ? <p className="py-8 text-center text-[0.8125rem] text-slate-500">{t('Kisi par nahi chalta')}</p> : (
        <ul className="mt-2 max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {list.map((x) => (
            <li key={x.id} className="py-2.5 text-[0.8125rem]">
              <div className="flex items-center gap-2">
                {x.matched ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                <b className="text-slate-900">{x.label}</b>
              </div>
              {x.checks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {x.checks.map((ch, i) => <Badge key={i} size="xs" variant={ch.ok ? 'success' : 'danger'}>{ch.key}: {ch.have} ({ch.want})</Badge>)}
                </div>
              )}
              {x.actions.map((a, i) => (
                <div key={i} className={cn('mt-1 flex items-center gap-1.5 text-[0.75rem]', a.ok ? 'text-slate-700' : 'text-rose-700')}>
                  {a.type === 'NOTIFY' ? <BellRing className="h-3.5 w-3.5" /> : a.type === 'TAG' ? <Tag className="h-3.5 w-3.5" /> : a.type === 'ASSIGN' ? <UserCheck className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                  {a.text}{a.link && <a href={a.link} target="_blank" rel="noreferrer" className="font-semibold text-success-700 hover:underline">WhatsApp</a>}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
