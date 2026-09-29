import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, KeyRound, Lock, PenLine, RefreshCw, Truck, Unplug, Zap } from 'lucide-react';
import { apiErrorMessage, couriersApi, type CourierAccount, type PickupAddress } from '../api/online-orders.api';
import { COURIERS_KEY } from '../components/CourierSection';
import { timeAgo } from '../lib/labels';
import { Badge, Banner, Btn, Card, EmptyState, Field, Page, SettingRow, Toggle, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   COURIERS — website channels jaisa: Automatic (API key paste →
   Nafaa khud check kare → jur gaya) ya Manual (CN khud likho).
   Jurne ke baad: order se ek click booking, label, tracking,
   deliver / RTO khud, PostEx ka COD settlement bhi khud.
   ═════════════════════════════════════════════════════════════ */

export default function CouriersPage() {
  const { data, isLoading, error } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list });
  const [open, setOpen] = useState<string | null>(null);

  const api = (data ?? []).filter((c) => c.mode === 'api');
  const manual = (data ?? []).filter((c) => c.mode === 'manual');

  return (
    <Page back={{ to: '/online-orders', label: 'Online orders' }} title="Couriers"
      subtitle="Courier jorein — phir order se ek click me booking, CN, label aur tracking. Deliver ya wapas hote hi order khud update."
      actions={<Link to="/online-orders/cod"><Btn icon={<Truck className="h-4 w-4" />}>COD hisaab</Btn></Link>}>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : error || !data ? (
        <Card><EmptyState title="Couriers nahi khule">{apiErrorMessage(error)}</EmptyState></Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {api.map((c) => (
              <ApiCourierCard key={c.code} c={c} open={open === c.code} onToggle={() => setOpen(open === c.code ? null : c.code)} />
            ))}
          </div>

          <Card title="Baqi couriers — manual" description="In ka API abhi Nafaa me nahi. Order par &quot;Rider/courier ko de diya&quot; me courier aur CN likhein — Track button, COD hisaab aur RTO sab chalega.">
            <div className="flex flex-wrap gap-2">
              {manual.map((c) => (
                <span key={c.code} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <PenLine className="h-3.5 w-3.5 text-slate-400" /> {c.name}
                  {c.booked30 > 0 && <span className="text-slate-400">· {c.booked30}</span>}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-slate-500">TCS, Trax, M&amp;P ka merchant account hai? Hamein batayein — un ka API bhi isi tarah jor denge.</p>
          </Card>
        </>
      )}
    </Page>
  );
}

function ApiCourierCard({ c, open, onToggle }: { c: CourierAccount; open: boolean; onToggle: () => void }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: COURIERS_KEY });

  const test = useMutation({
    mutationFn: () => couriersApi.test(c.code),
    onSuccess: (r) => { refresh(); toast.success(`${c.name} theek chal raha hai · ${r.cities} shehar`); },
    onError: (e) => { refresh(); toast.error(apiErrorMessage(e)); },
  });
  const disconnect = useMutation({
    mutationFn: () => couriersApi.disconnect(c.code),
    onSuccess: () => { refresh(); toast.success(`${c.name} hata diya`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) => couriersApi.update(c.code, { active }),
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Card
      title={<span className="flex items-center gap-2">{c.name} {c.connected ? <Badge tone={c.active ? 'success' : 'neutral'} dot>{c.active ? 'Jura hua' : 'Band'}</Badge> : <Badge tone="info">Ek click</Badge>}</span>}
      description={c.connected
        ? `Key ${c.maskedKey ?? ''}${c.lastSyncAt ? ` · aakhri sync ${timeAgo(c.lastSyncAt)}` : ''}${c.booked30 ? ` · 30 din me ${c.booked30} booking` : ''}`
        : `${c.connect?.labelKind === 'pdf' ? 'Booking, label PDF' : 'Booking, label link'}, tracking, RTO${c.connect?.autoSettlement ? ', COD settlement' : ''} — sab khud`}
      actions={c.connected
        ? <Toggle checked={c.active} onChange={(v) => setActive.mutate(v)} disabled={setActive.isPending} />
        : <Btn variant="primary" size="sm" icon={<Zap className="h-3.5 w-3.5" />} onClick={onToggle}>{open ? 'Band karein' : 'Jorein'}</Btn>}
    >
      {c.lastError && c.connected && (
        <div className="mb-3">
          <Banner tone="critical" title="Courier se rabta nahi ho raha">{c.lastError}</Banner>
        </div>
      )}
      {c.connected ? (
        <>
          <CourierSettingsForm c={c} />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Btn size="sm" loading={test.isPending} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => test.mutate()}>Check karein</Btn>
            <Btn size="sm" variant="plain" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={onToggle}>{open ? 'Rehne dein' : 'Nayi key'}</Btn>
            <Btn size="sm" variant="plain" className="text-rose-600" loading={disconnect.isPending} icon={<Unplug className="h-3.5 w-3.5" />}
              onClick={() => { if (window.confirm(`${c.name} hatayein? Pehle se book parcels ki tracking ruk jayegi.`)) disconnect.mutate(); }}>
              Hatayein
            </Btn>
          </div>
          {open && <div className="mt-4"><ConnectForm c={c} onDone={onToggle} /></div>}
        </>
      ) : open ? (
        <ConnectForm c={c} onDone={onToggle} />
      ) : (
        <ul className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Order par &quot;{c.name} par book&quot; — CN khud banta hai</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Label ek click me print</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Deliver / wapas (RTO) — order aur stock khud update</li>
          {c.connect?.autoSettlement && <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> COD ka paisa aaya to khud &quot;mil gaya&quot;</li>}
        </ul>
      )}
    </Card>
  );
}

/** Key paste → "Check karke jorein". Ghalat key par courier ka saaf jawab. */
function ConnectForm({ c, onDone }: { c: CourierAccount; onDone: () => void }) {
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<PickupAddress[] | null>(null);
  const fields = c.connect?.fields ?? [];

  const connect = useMutation({
    mutationFn: () => couriersApi.connect(c.code, { apiKey: vals.apiKey ?? '', apiSecret: vals.apiSecret }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      toast.success(`${c.name} jur gaya ✓`, { description: `${r.cities} shehar me delivery` });
      if ((r.pickupAddresses?.length ?? 0) > 1 && !r.settings.pickupAddressCode) setPicked(r.pickupAddresses);
      else onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (picked) {
    return <Banner tone="success" title={`${c.name} jur gaya`}>Neeche settings me pickup address chun lein — parcel wahin se uthega.</Banner>;
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
        {(c.connect?.steps ?? []).map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
        {c.connect?.portalUrl && (
          <li className="pl-7">
            <a href={c.connect.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              {c.name} portal kholein <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </li>
        )}
      </ol>
      <div className={cn('grid gap-3', fields.length > 1 && 'sm:grid-cols-2')}>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              type="password" autoComplete="off" spellCheck={false}
              value={vals[f.key] ?? ''} placeholder={f.placeholder}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              className={cn(inputCls, 'font-mono')}
            />
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500"><Lock className="h-3.5 w-3.5" /> Key encrypted save hoti hai · sirf malik / manager</span>
        <Btn variant="primary" loading={connect.isPending} disabled={fields.some((f) => !(vals[f.key] ?? '').trim())} onClick={() => connect.mutate()} icon={<Zap className="h-4 w-4" />}>
          Check karke jorein
        </Btn>
      </div>
    </div>
  );
}

function CourierSettingsForm({ c }: { c: CourierAccount }) {
  const qc = useQueryClient();
  const s = c.settings ?? {};
  const [weight, setWeight] = useState(String(s.defaultWeightKg ?? 0.5));
  const [note, setNote] = useState(s.bookingNote ?? '');
  const needsPickup = c.code === 'POSTEX';
  const { data: opts } = useQuery({ queryKey: ['courier-options', c.code], queryFn: () => couriersApi.options(c.code), enabled: needsPickup, staleTime: 30 * 60_000 });

  const save = useMutation({
    mutationFn: (settings: Record<string, unknown>) => couriersApi.update(c.code, { settings }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success('Save ho gaya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {needsPickup && (
        <SettingRow
          title="Pickup address"
          help="PostEx rider parcel yahan se uthayega"
          control={
            <select value={s.pickupAddressCode ?? ''} onChange={(e) => save.mutate({ pickupAddressCode: e.target.value || null })} className={cn(inputCls, 'w-56')}>
              <option value="">Default (PostEx wala)</option>
              {(opts?.pickupAddresses ?? []).map((a) => <option key={a.code} value={a.code}>{a.address}{a.city ? ` — ${a.city}` : ''}</option>)}
            </select>
          }
        />
      )}
      <SettingRow
        title="Aam wazan (kg)"
        help="Har booking me pehle se bhara hoga — badal bhi sakte hain"
        control={
          <input type="number" min="0.01" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
            onBlur={() => Number(weight) !== (s.defaultWeightKg ?? 0.5) && save.mutate({ defaultWeightKg: Number(weight) })}
            className={cn(inputCls, 'w-24')} />
        }
      />
      <SettingRow
        title="Har booking ka note"
        help="Jaise: Call karke aayein · Fragile"
        control={
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
            onBlur={() => note !== (s.bookingNote ?? '') && save.mutate({ bookingNote: note || null })}
            className={cn(inputCls, 'w-56')} placeholder="(khali)" />
        }
      />
    </div>
  );
}
