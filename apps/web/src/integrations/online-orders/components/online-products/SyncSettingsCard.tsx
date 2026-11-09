/**
 * Sync settings for one channel: which side a price, name or picture change
 * comes from (Nafaa, the channel, or whichever changed last), new products in
 * both directions, and stock edited by hand on the channel. One click turns
 * on the full two-way preset ("Sab kuch khud sync").
 *
 * Used in two places: the channel page (SyncSettingsCard, with its own Save)
 * and the Products & stock settings modal (useSyncForm + SyncSettingsFields,
 * saved with the modal). Only changed fields are sent, except on a channel
 * whose settings were never chosen: then every field goes, so the choice is
 * recorded. SyncChoiceBanner asks for that choice on the Products & stock
 * page.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCcw, Sparkles, X } from 'lucide-react';
import { Badge, Button, Switch, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import {
  onlineProductsApi, type AutoPublish, type ChannelSyncSettings, type OnlineChannel, type PriceRule, type SyncFrom,
} from '../../api/online-products.api';
import { channelName, refreshOnlineProducts } from './meta';

export interface SyncForm {
  priceFrom: SyncFrom;
  websitePriceTo: 'PRODUCT' | 'CHANNEL';
  contentFrom: SyncFrom;
  autoImport: boolean;
  autoLink: boolean;
  autoPublish: AutoPublish;
  pushStock: boolean;
  stockFromChannel: boolean;
}

const readForm = (c: OnlineChannel): SyncForm => ({
  priceFrom: c.priceFrom ?? (c.pushPrice ? 'NAFAA' : 'NONE'),
  websitePriceTo: c.websitePriceTo ?? 'PRODUCT',
  contentFrom: c.contentFrom ?? 'NONE',
  autoImport: !!c.autoImport,
  autoLink: !!c.autoLink,
  autoPublish: c.autoPublish ?? 'OFF',
  pushStock: !!c.pushStock,
  stockFromChannel: !!c.stockFromChannel,
});

/** A rule changes the Nafaa price for the channel, so a channel price can only land on the link. */
export const hasPriceRule = (r: PriceRule | null | undefined) =>
  !!r && r.mode !== 'NONE' && !(Number(r.value) === 0 && r.rounding === 'NONE');

/** Drops the fields this channel does not take. */
function fit(c: OnlineChannel, body: Partial<SyncForm>): ChannelSyncSettings {
  const out: ChannelSyncSettings = { ...body };
  if (c.mode === 'daraz') delete out.contentFrom;
  if (!c.canPublish) delete out.autoPublish;
  if (!c.shopId && out.autoImport) delete out.autoImport;
  return out;
}

/** Form state for the sync settings; `body` is what to send (null = nothing to save). */
export function useSyncForm(channel: OnlineChannel) {
  const [form, setForm] = useState<SyncForm>(() => readForm(channel));
  const [base, setBase] = useState<SyncForm>(() => readForm(channel));
  const [chosen, setChosen] = useState(channel.syncChosen !== false);
  const dirtyRef = useRef(false);

  const changes = (Object.keys(form) as Array<keyof SyncForm>)
    .filter((k) => form[k] !== base[k])
    .reduce<Partial<SyncForm>>((o, k) => ({ ...o, [k]: form[k] }), {});
  const dirty = Object.keys(changes).length > 0;
  dirtyRef.current = dirty;

  // Saved values changed elsewhere (another tab, the preset): follow them while nothing is edited.
  const saved = JSON.stringify(readForm(channel));
  useEffect(() => {
    if (dirtyRef.current) return;
    const next = readForm(channel);
    setForm(next);
    setBase(next);
    setChosen(channel.syncChosen !== false);
  }, [saved, channel.syncChosen]); // eslint-disable-line react-hooks/exhaustive-deps

  const raw = chosen ? (dirty ? changes : null) : form;
  const body = raw ? fit(channel, raw) : null;
  const set = <K extends keyof SyncForm>(k: K, v: SyncForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  /** After a save: the returned channel is the new base. */
  const reset = (c: OnlineChannel) => {
    const next = readForm(c);
    dirtyRef.current = false;
    setForm(next);
    setBase(next);
    setChosen(c.syncChosen !== false);
  };
  return { form, set, body, dirty, chosen, reset };
}
export type SyncFormState = ReturnType<typeof useSyncForm>;

/** "Sab kuch khud sync" in one click, after a confirm. */
function usePreset(channel: OnlineChannel, onDone: (c: OnlineChannel) => void) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => onlineProductsApi.settings(channel.id, { preset: 'AUTO' }),
    onSuccess: (c) => {
      refreshOnlineProducts(qc);
      toast.success(t('Sab kuch khud sync chalu ho gaya'));
      if (!channel.shopId) toast.info(t('Naye products khud laane ke liye pehle channel ki branch chunein'));
      onDone(c);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const run = async () => {
    const ok = await confirmDialog({
      title: t('Sab kuch khud sync karein?'),
      text: t('Qeemat, naam aur tasveerein jahan baad me badlein wahi dono jagah lag jayengi. Naye products dono taraf khud aayenge (Nafaa se sirf jin par nishan ho). Website par hath se badla Stock Nafaa me aayega. Kuch delete nahi hota.'),
      yes: t('Chalu karein'),
    });
    if (ok) m.mutate();
  };
  return { run, pending: m.isPending };
}

interface Option<T extends string> { value: T; label: string; hint?: string }

/** Buttons in a row (stacked on phones); the picked one is outlined. */
function ChoiceGroup<T extends string>({ label, value, onChange, options, quiet, disabled }: {
  label: string; value: T; onChange: (v: T) => void; options: Array<Option<T>>;
  /** A low-key extra option shown as a link under the buttons. */
  quiet?: Option<T>;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">{label}</p>
      <div role="radiogroup" aria-label={label} className={cn('grid gap-2', options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(o.value)}
              className={cn('rounded-xl px-3 py-2 text-start ring-1 transition disabled:cursor-not-allowed disabled:opacity-60',
                on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
              <span className={cn('block text-[0.8125rem] font-semibold', on ? 'text-brand-900' : 'text-slate-800')}>{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-[0.71875rem] leading-snug text-slate-500">{o.hint}</span>}
            </button>
          );
        })}
      </div>
      {quiet && (
        <button type="button" role="radio" aria-checked={value === quiet.value} disabled={disabled} onClick={() => onChange(quiet.value)}
          className={cn('mt-1.5 text-[0.75rem] font-semibold underline-offset-2 hover:underline disabled:opacity-60',
            value === quiet.value ? 'text-brand-700' : 'text-slate-500')}>
          {value === quiet.value ? '✓ ' : ''}{quiet.label}
        </button>
      )}
      {quiet && value === quiet.value && quiet.hint && <p className="mt-0.5 text-[0.71875rem] text-slate-500">{quiet.hint}</p>}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-slate-100 pt-3.5">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

/** The fields; the parent decides how they are saved. `rule` is the price rule being edited, if any. */
export function SyncSettingsFields({ channel, sync, canManage, rule, onPreset }: {
  channel: OnlineChannel; sync: SyncFormState; canManage: boolean; rule?: PriceRule;
  /** The preset was applied; the parent may refresh its own copy of the channel. */
  onPreset?: (c: OnlineChannel) => void;
}) {
  const { form, set } = sync;
  const preset = usePreset(channel, (c) => { sync.reset(c); onPreset?.(c); });
  const off = !canManage;
  const fromChannel = form.priceFrom === 'WEBSITE' || form.priceFrom === 'LATEST';
  const ruled = hasPriceRule(rule ?? channel.priceRule);

  const sourceOptions = (what: 'price' | 'content'): Array<Option<SyncFrom>> => [
    { value: 'NAFAA', label: t('Nafaa'), hint: what === 'price' ? t('Nafaa me badlein, website par lag jaye') : t('Nafaa se website par jaye') },
    { value: 'WEBSITE', label: t('Website'), hint: what === 'price' ? t('Website par badlein, Nafaa me aa jaye') : t('Website se Nafaa me aaye') },
    { value: 'LATEST', label: t('Dono — jo baad me badle'), hint: t('Jahan aakhri dafa badla, wohi dono jagah lagay') },
  ];
  const none: Option<SyncFrom> = { value: 'NONE', label: t('Kahin se nahi'), hint: t('Dono jagah alag rahegi — koi khud nahi badlega') };

  return (
    <div className="space-y-3.5">
      <div className={cn('flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1', channel.autoSync ? 'bg-success-50 ring-success-200' : 'bg-brand-50 ring-brand-200')}>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white', channel.autoSync ? 'text-success-700' : 'text-brand-700')}>
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-semibold text-slate-900">
            {t('Sab kuch khud sync (recommended)')}
            {channel.autoSync && <Badge size="xs" variant="success" dot>{t('Chalu hai')}</Badge>}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-slate-600">{t('Qeemat, naam aur tasveerein jahan baad me badlein wahi chalti hain. Naye products aur hath se badla Stock dono taraf khud aate hain.')}</p>
        </div>
        {canManage && !channel.autoSync && (
          <Button size="sm" loading={preset.pending} onClick={() => void preset.run()} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>{t('Chalu karein')}</Button>
        )}
      </div>

      <Block title={t('Qeemat')}>
        <ChoiceGroup label={t('Qeemat kahan se badlegi?')} value={form.priceFrom} onChange={(v) => set('priceFrom', v)} options={sourceOptions('price')} quiet={none} disabled={off} />
        {fromChannel && (ruled ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200/80">
            {t('Is channel par Price rule laga hai, is liye website ki qeemat sirf is channel wali Price banti hai — Nafaa ki apni Price nahi badalti.')}
          </p>
        ) : (
          <ChoiceGroup label={t('Website ki qeemat Nafaa me kahan lagay?')} value={form.websitePriceTo} onChange={(v) => set('websitePriceTo', v)} disabled={off}
            options={[
              { value: 'PRODUCT', label: t('Product ki Price'), hint: t('Nafaa me product ki Price badal jayegi (POS par bhi)') },
              { value: 'CHANNEL', label: t('Sirf is channel ki Price'), hint: t('POS ki Price wohi rahegi, sirf is channel ki alag') },
            ]} />
        ))}
      </Block>

      {channel.mode !== 'daraz' && (
        <Block title={t('Naam, description, tasveerein')}>
          <ChoiceGroup label={t('Naam, description aur tasveerein kahan se badlein?')} value={form.contentFrom} onChange={(v) => set('contentFrom', v)} options={sourceOptions('content')} quiet={none} disabled={off} />
        </Block>
      )}

      <Block title={t('Naye products')}>
        <Switch checked={form.autoImport} disabled={off || (!channel.shopId && !form.autoImport)} onChange={(e) => set('autoImport', e.target.checked)}
          label={t('Naye products website se khud Nafaa me')}
          description={!channel.shopId ? t('Pehle channel ki branch chunein — naye products ka Stock usi branch me aata hai.') : t('Website par naya product bane to Nafaa me ban kar khud jur jata hai.')} />
        <Switch checked={form.autoLink} disabled={off} onChange={(e) => set('autoLink', e.target.checked)}
          label={t('Pakke match khud jorein')}
          description={t('Channel par naya product aaye aur us ka SKU ya barcode Nafaa se bilkul mile to khud jur jata hai. Sirf naam milne wale kabhi khud nahi jurte.')} />
        {channel.canPublish && (
          <ChoiceGroup label={t('Naye products Nafaa se khud website par')} value={form.autoPublish} onChange={(v) => set('autoPublish', v)} disabled={off}
            options={[
              { value: 'OFF', label: t('Band'), hint: t('Website par khud kuch nahi banta') },
              { value: 'MARKED', label: t('Sirf jin par nishan lagaya'), hint: t('Product ke panel me "Website par bhi banayein" dabayein') },
              { value: 'ALL', label: t('Sab naye products'), hint: t('Aaj ke baad bane products — purane nahi') },
            ]} />
        )}
      </Block>

      <Block title={t('Stock')}>
        <p className="text-[0.8125rem] text-slate-700">
          <span className="font-semibold text-slate-900">{t('Stock: Nafaa ginti rakhta hai')}</span>
          {' '}{t('Sale, return aur purchase Nafaa me hote hain aur wahan se website par jate hain.')}
        </p>
        <Switch checked={form.pushStock} disabled={off} onChange={(e) => set('pushStock', e.target.checked)}
          label={t('Stock Nafaa se channel par bhejein')}
          description={form.pushStock ? t('Har sale, return, purchase aur stock badalne par channel ka Stock khud barabar hota hai.') : t('Band hai — channel par Stock bilkul nahi jayega. Wahan haath se rakhein.')} />
        <Switch checked={form.stockFromChannel} disabled={off} onChange={(e) => set('stockFromChannel', e.target.checked)}
          label={t('Website par hath se badla Stock Nafaa me lein')}
          description={t('Kisi ne website ke admin me Stock khud badla to wohi farq Nafaa me bhi lagta hai. Orders aur Nafaa ka apna bheja hua Stock is me nahi gina jata.')} />
      </Block>
    </div>
  );
}

/** Self-contained card with its own Save, for the channel page. */
export function SyncSettingsCard({ channel, canManage, onSaved }: { channel: OnlineChannel; canManage: boolean; onSaved?: () => void }) {
  const qc = useQueryClient();
  const sync = useSyncForm(channel);
  const save = useMutation({
    mutationFn: () => onlineProductsApi.settings(channel.id, sync.body ?? {}),
    onSuccess: (c) => {
      sync.reset(c);
      refreshOnlineProducts(qc);
      onSaved?.();
      toast.success(t('Sync settings save ho gayin'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="space-y-3.5 py-3.5">
      {!sync.chosen && (
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-[0.78125rem] text-sky-900 ring-1 ring-sky-100">
          {t('Ye settings abhi chuni nahi gayin. Dekh kar Save karein, ya "Sab kuch khud sync" chalu karein.')}
        </p>
      )}
      <SyncSettingsFields channel={channel} sync={sync} canManage={canManage} onPreset={() => onSaved?.()} />
      {canManage && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          {sync.dirty && <span className="me-auto text-[0.75rem] text-amber-700">{t('Tabdeeli save nahi hui')}</span>}
          <Button size="sm" loading={save.isPending} disabled={!sync.body} onClick={() => save.mutate()}>
            {sync.chosen ? t('Save karein') : t('Ye settings rakhein')}
          </Button>
        </div>
      )}
    </div>
  );
}

/** One line on Products & stock while a channel's sync settings were never chosen. Closing hides it for the session. */
export function SyncChoiceBanner({ channels, onOpen }: { channels: OnlineChannel[]; onOpen: (c: OnlineChannel) => void }) {
  const open = channels.filter((c) => c.canPush && c.syncChosen === false);
  const key = `nafaa-op-sync-choice-${open.map((c) => c.id).join(',')}`;
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(key) === '1'; } catch { return false; } });
  if (!open.length || hidden) return null;
  const hide = () => { setHidden(true); try { sessionStorage.setItem(key, '1'); } catch { /* private mode */ } };
  return (
    <div role="status" className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200/70">
      <RefreshCcw className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{t('Sync settings chunein')}</span>
        <span className="hidden sm:inline"> · {t('Qeemat, naam aur Stock Nafaa aur website ke beech kaise badlein — ek dafa chun lein.')}</span>
      </p>
      {open.slice(0, 3).map((c) => (
        <button key={c.id} type="button" onClick={() => onOpen(c)}
          className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[0.75rem] font-semibold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100">
          {open.length > 1 ? channelName(c) : t('Chunein')}
        </button>
      ))}
      <button type="button" onClick={hide} aria-label={t('Band karein')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100"><X className="h-4 w-4" /></button>
    </div>
  );
}
