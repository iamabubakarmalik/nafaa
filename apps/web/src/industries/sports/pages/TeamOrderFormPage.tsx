/**
 * New or edited team order: the team, the kit lines (product, size, rate
 * and printing per piece), the players' names / numbers / sizes, discount,
 * delivery and the advance. Ctrl+S saves, Esc goes back, G opens the guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ClipboardPaste, GraduationCap, ListOrdered, Plus, Shirt, Trash2, Users, Wallet } from 'lucide-react';
import { Alert, Button, Card, Input, Kbd, PageShell, Skeleton, Switch, Textarea, heroIconButton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { ProductPick, type PickedProduct } from '@industries/garments/components/ProductPick';
import { sportsProductsApi } from '../api/products.api';
import { teamOrdersApi, type RosterRow, type TeamOrderInput } from '../api/team-orders.api';
import { META_KEY, MONEY_KEYS, TEAM_KEY, apiError, dateInput, opt, r2 } from '../components/meta';
import { Line } from '../components/ui';

interface KitLine { key: string; productId: string; variantId?: string; productName: string; quantity: string; unitPrice: string; printingPrice: string; size: string; color: string; note: string }

const num = (s: string) => Number(s) || 0;
const clean = (s: string) => s.replace(/[^\d.]/g, '');
let seq = 0;
const key = () => `k${++seq}`;

/** "Ali 10 M" or "Ali, 10, M" per line → a roster row. */
function parseRoster(text: string): RosterRow[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.includes(',') || l.includes('\t') ? l.split(/[,\t]/).map((s) => s.trim()) : l.split(/\s+/);
    const numberAt = parts.findIndex((p) => /^\d{1,3}$/.test(p));
    if (numberAt < 0) return { name: parts.join(' '), number: '', size: '' };
    return { name: parts.slice(0, numberAt).join(' '), number: parts[numberAt], size: parts.slice(numberAt + 1).join(' ') };
  });
}

export default function TeamOrderFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [loaded, setLoaded] = useState(!isEdit);
  const [team, setTeam] = useState({ teamName: '', organization: '', contactPerson: '', contactPhone: '', city: '', address: '', poNumber: '' });
  const [lines, setLines] = useState<KitLine[]>([]);
  const [pick, setPick] = useState<PickedProduct | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [paste, setPaste] = useState<string | null>(null);
  const [printing, setPrinting] = useState({ on: false, details: '' });
  const [money, setMoney] = useState({ discountPct: '', shippingCharge: '', advance: '', method: 'CASH' as PaymentMethod });
  const [delivery, setDelivery] = useState('');
  const [notes, setNotes] = useState({ notes: '', internalNotes: '' });
  const [tried, setTried] = useState(false);

  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: sportsProductsApi.meta, staleTime: 5 * 60_000 });
  const orderQ = useQuery({ queryKey: [TEAM_KEY, 'one', id], queryFn: () => teamOrdersApi.getOne(id!), enabled: isEdit });

  useEffect(() => {
    const o = orderQ.data;
    if (!o || loaded) return;
    setTeam({ teamName: o.teamName, organization: o.organization ?? '', contactPerson: o.contactPerson, contactPhone: o.contactPhone, city: o.city ?? '', address: o.address ?? '', poNumber: o.poNumber ?? '' });
    setLines(o.items.map((i) => ({
      key: key(), productId: i.productId, variantId: i.variantId, productName: i.productName, quantity: String(i.quantity), unitPrice: String(i.unitPrice),
      printingPrice: i.printingPrice ? String(i.printingPrice) : '', size: i.size ?? '', color: i.color ?? '', note: i.customizationNotes ?? '',
    })));
    setRoster(o.playerNames ?? []);
    setPrinting({ on: o.hasCustomJerseys, details: o.customizationDetails ?? '' });
    setMoney((m) => ({ ...m, discountPct: o.discountPct ? String(o.discountPct) : '', shippingCharge: o.shippingCharge ? String(o.shippingCharge) : '' }));
    setDelivery(dateInput(o.expectedDeliveryDate));
    setNotes({ notes: o.notes ?? '', internalNotes: o.internalNotes ?? '' });
    setLoaded(true);
  }, [orderQ.data, loaded]);

  // A picked product becomes a line at the team rate, when one is set.
  useEffect(() => {
    if (!pick) return;
    const m = metaQ.data?.items.find((x) => x.productId === pick.productId);
    const rate = m?.teamPrice && m.teamPrice > 0 ? m.teamPrice : pick.price;
    setLines((ls) => [...ls, {
      key: key(), productId: pick.productId, variantId: pick.variantId, productName: pick.name, quantity: String(Math.max(m?.minTeamOrder ?? 1, 1)),
      unitPrice: String(rate), printingPrice: '', size: pick.variantName ?? '', color: '', note: '',
    }]);
    setPick(null);
  }, [pick, metaQ.data]);

  const totals = useMemo(() => {
    const subtotal = r2(lines.reduce((s, l) => s + num(l.quantity) * (num(l.unitPrice) + num(l.printingPrice)), 0));
    const discount = r2((subtotal * num(money.discountPct)) / 100);
    const total = r2(subtotal - discount + num(money.shippingCharge));
    return { subtotal, discount, total, pieces: lines.reduce((s, l) => s + num(l.quantity), 0) };
  }, [lines, money.discountPct, money.shippingCharge]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (team.teamName.trim().length < 2) e.teamName = 'Team ya school ka naam likhein';
    if (team.contactPerson.trim().length < 2) e.contactPerson = 'Rabte wale ka naam likhein';
    if (!/^[0-9+\-\s]{7,16}$/.test(team.contactPhone.trim())) e.contactPhone = 'Phone number sahi likhein (03001234567)';
    if (!lines.length) e.lines = 'Kam az kam ek item daalein';
    if (lines.some((l) => !(num(l.quantity) >= 1) || !Number.isInteger(num(l.quantity)))) e.lines = 'Har item ki ginti 1 ya zyada (poora adad)';
    const d = num(money.discountPct);
    if (d < 0 || d > 100) e.discountPct = 'Discount 0 se 100% tak';
    if (!isEdit && num(money.advance) > totals.total + 0.01) e.advance = `Advance kul (${formatPKR(totals.total)}) se zyada nahi`;
    return e;
  }, [team, lines, money, totals.total, isEdit]);

  const save = useMutation({
    mutationFn: () => {
      const body: TeamOrderInput = {
        teamName: team.teamName.trim(), organization: opt(team.organization), contactPerson: team.contactPerson.trim(), contactPhone: team.contactPhone.trim(),
        city: opt(team.city), address: opt(team.address), poNumber: opt(team.poNumber),
        items: lines.map((l) => ({
          productId: l.productId, ...(l.variantId ? { variantId: l.variantId } : {}), productName: l.productName, quantity: num(l.quantity),
          unitPrice: num(l.unitPrice), printingPrice: num(l.printingPrice), size: opt(l.size), color: opt(l.color), customizationNotes: opt(l.note),
        })),
        discountPct: num(money.discountPct), shippingCharge: num(money.shippingCharge),
        hasCustomJerseys: printing.on || roster.length > 0, customizationDetails: opt(printing.details),
        playerNames: roster.filter((p) => p.name.trim() || p.number.trim()),
        expectedDeliveryDate: delivery || undefined, notes: opt(notes.notes), internalNotes: opt(notes.internalNotes),
      };
      if (isEdit) return teamOrdersApi.update(id!, body);
      return teamOrdersApi.create({ ...body, advancePaid: num(money.advance) || undefined, paymentMethod: money.method });
    },
    onSuccess: (o) => {
      toast.success(isEdit ? `${o.orderNumber} save ho gaya` : `Order ${o.orderNumber} ban gaya`);
      [TEAM_KEY, 'sports-team-orders-summary', 'sports-dashboard-overview', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/sports/team-orders?open=${o.id}`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (!save.isPending) save.mutate();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const err = (k: string) => (tried ? errors[k] : undefined);
  const setLine = (k: string, patch: Partial<KitLine>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const setPlayer = (i: number, patch: Partial<RosterRow>) => setRoster((rs) => rs.map((p, n) => (n === i ? { ...p, ...patch } : p)));
  const closed = orderQ.data && ['DELIVERED', 'CANCELLED'].includes(orderQ.data.status);

  if (isEdit && (orderQ.isLoading || !loaded)) {
    return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  }

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Team order — kaise likhein" onClose={guide.close}
          steps={[
            { icon: Users, color: '#2563eb', title: 'Team', text: 'Team / school ka naam aur rabte wale ka phone. Isi naam se team ka khata banta hai.' },
            { icon: Shirt, color: '#7c3aed', title: 'Kit', text: 'Product chunein (size wala ho to size bhi). Team rate khud aata hai; printing ka rate per piece alag likhein.' },
            { icon: ListOrdered, color: '#ea580c', title: 'Printing list', text: 'Har player ka naam, number aur size. Excel / WhatsApp se list paste bhi kar sakte hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance aaj ke cash me ginta hai aur team ke khate me jama rehta hai. Deliver par bill me lag jata hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}

      <header className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className={heroIconButton}><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{isEdit ? `Order ${orderQ.data?.orderNumber} badlein` : 'Naya team order'}</h1>
          <p className="text-[0.8125rem] text-white/75">School, club ya team ki kit — printing ke saath</p>
        </div>
        <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
      </header>

      {closed && <Alert tone="warning" title="Ye order band ho chuka">Deliver ya cancel shuda order badla nahi ja sakta.</Alert>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <Card className="rounded-2xl" title="Team">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Team / school ka naam" required value={team.teamName} error={err('teamName')} maxLength={80} placeholder="Shaheen XI" onChange={(e) => setTeam({ ...team, teamName: e.target.value })} hint="Bill aur khate par yahi naam" />
              <Input label="Idara (school / club)" value={team.organization} maxLength={80} placeholder="Govt High School No. 1" onChange={(e) => setTeam({ ...team, organization: e.target.value })} hint="Marzi hai" />
              <Input label="Rabte wala" required value={team.contactPerson} error={err('contactPerson')} maxLength={80} placeholder="Coach Imran" onChange={(e) => setTeam({ ...team, contactPerson: e.target.value })} hint="Captain, coach ya PT teacher" />
              <Input label="Phone" required inputMode="tel" value={team.contactPhone} error={err('contactPhone')} placeholder="03001234567" onChange={(e) => setTeam({ ...team, contactPhone: e.target.value })} hint="WhatsApp isi par" />
              <Input label="Shehar" value={team.city} placeholder="Sialkot" onChange={(e) => setTeam({ ...team, city: e.target.value })} hint="Marzi hai" />
              <Input label="PO / letter number" value={team.poNumber} placeholder="PO-114" onChange={(e) => setTeam({ ...team, poNumber: e.target.value })} hint="School ka purchase order ho to" />
              <Input wrapperClassName="sm:col-span-2" label="Pata (delivery)" value={team.address} placeholder="Ground / school ka pata" onChange={(e) => setTeam({ ...team, address: e.target.value })} hint="Marzi hai" />
            </div>
          </Card>

          <Card className="rounded-2xl" title="Kit ka maal" description="Product chunein — size wale product me size bhi">
            <ProductPick value={pick} onChange={setPick} label="Product" hint="Naam likhein ya barcode scan karein — team rate khud aa jata hai" />
            {err('lines') && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{err('lines')}</p>}
            {lines.length > 0 && (
              <ul className="mt-4 space-y-3">
                {lines.map((l) => (
                  <li key={l.key} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{l.productName}</p>
                      <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-700">{formatPKR(num(l.quantity) * (num(l.unitPrice) + num(l.printingPrice)))}</span>
                      <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <Input label="Ginti" inputMode="numeric" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value.replace(/\D/g, '') })} />
                      <Input label="Rate" inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: clean(e.target.value) })} hint="Per piece" />
                      <Input label="Printing" inputMode="decimal" value={l.printingPrice} placeholder="0" onChange={(e) => setLine(l.key, { printingPrice: clean(e.target.value) })} hint="Naam / number per piece" />
                      <Input label="Size" value={l.size} disabled={!!l.variantId} placeholder="M / 32" onChange={(e) => setLine(l.key, { size: e.target.value })} hint={l.variantId ? 'Product ka size' : 'Size wale product me zaroori'} />
                      <Input label="Rang" value={l.color} placeholder="Green" onChange={(e) => setLine(l.key, { color: e.target.value })} />
                      <Input label="Note" value={l.note} placeholder="Logo seene par" onChange={(e) => setLine(l.key, { note: e.target.value })} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl" title="Printing list" description={`${roster.length} players — naam, number aur size`}
            actions={<div className="flex gap-2">
              <Button variant="secondary" size="sm" leftIcon={<ClipboardPaste className="h-4 w-4" />} onClick={() => setPaste('')}>List paste</Button>
              <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setRoster((r) => [...r, { name: '', number: '', size: '' }])}>Player</Button>
            </div>}>
            <Switch checked={printing.on || roster.length > 0} onChange={(e) => setPrinting({ ...printing, on: e.target.checked })} label="Kit par naam / number / logo printing" description="Players ki list ho to khud on" />
            {paste !== null && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <Textarea label="Har line par ek player" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Ali Raza 10 M\nUsman 7 L\nHamza, 18, XL'} hint="Naam, number, size — space ya comma se" />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPaste(null)}>Band</Button>
                  <Button size="sm" onClick={() => { const rows = parseRoster(paste); setRoster((r) => [...r, ...rows]); setPaste(null); toast.success(`${rows.length} players jur gaye`); }}>List me daalein</Button>
                </div>
              </div>
            )}
            {roster.length > 0 && (
              <div className="mt-3 space-y-2">
                {roster.map((p, i) => (
                  <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)_5rem_5rem_2rem] items-center gap-2">
                    <span className="text-center text-[0.75rem] text-slate-500">{i + 1}</span>
                    <Input aria-label="Naam" value={p.name} placeholder="Naam" maxLength={40} onChange={(e) => setPlayer(i, { name: e.target.value })} />
                    <Input aria-label="Number" value={p.number} placeholder="No." maxLength={4} onChange={(e) => setPlayer(i, { number: e.target.value })} />
                    <Input aria-label="Size" value={p.size} placeholder="Size" maxLength={12} onChange={(e) => setPlayer(i, { size: e.target.value })} />
                    <button type="button" aria-label="Hatayein" onClick={() => setRoster((r) => r.filter((_, n) => n !== i))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            {(printing.on || roster.length > 0) && (
              <Textarea wrapperClassName="mt-3" label="Printing / design" rows={2} value={printing.details} onChange={(e) => setPrinting({ ...printing, details: e.target.value })} placeholder="Peeche naam aur number, seene par school ka logo" hint="Printer ko yahi batana hai" />
            )}
          </Card>

          <Card className="rounded-2xl" title="Note">
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea label="Team ke liye" rows={2} value={notes.notes} onChange={(e) => setNotes({ ...notes, notes: e.target.value })} hint="Slip par chhapta hai" />
              <Textarea label="Andar ka note" rows={2} value={notes.internalNotes} onChange={(e) => setNotes({ ...notes, internalNotes: e.target.value })} hint="Sirf dukaan ke liye" />
            </div>
          </Card>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-4">
          <Card className="rounded-2xl" title="Hisaab">
            <Input label="Delivery ki date" type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} hint="Kab tak tayyar dena hai" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input label="Discount %" inputMode="decimal" value={money.discountPct} error={err('discountPct')} placeholder="0" onChange={(e) => setMoney({ ...money, discountPct: clean(e.target.value) })} />
              <Input label="Delivery Rs" inputMode="decimal" value={money.shippingCharge} placeholder="0" onChange={(e) => setMoney({ ...money, shippingCharge: clean(e.target.value) })} />
            </div>
            <div className="mt-3">
              <Line label={`Maal (${totals.pieces} piece)`} value={formatPKR(totals.subtotal)} />
              {totals.discount > 0 && <Line label="Discount" value={`- ${formatPKR(totals.discount)}`} />}
              {num(money.shippingCharge) > 0 && <Line label="Delivery" value={formatPKR(num(money.shippingCharge))} />}
              <Line strong label="Kul" value={formatPKR(totals.total)} />
            </div>
            {!isEdit ? (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                <Input label="Advance (abhi mila)" inputMode="decimal" value={money.advance} error={err('advance')} placeholder="0" onChange={(e) => setMoney({ ...money, advance: clean(e.target.value) })} hint="Team ke khate me jama hoga" />
                {num(money.advance) > 0 && <PaymentMethodPicker value={money.method} onChange={(m) => setMoney({ ...money, method: m })} label="Advance kaise mila" />}
                <Line label="Baqi" value={formatPKR(Math.max(totals.total - num(money.advance), 0))} />
              </div>
            ) : (
              <p className="mt-3 text-[0.75rem] text-slate-500">Advance {formatPKR(orderQ.data?.advancePaid ?? 0)} mil chuka. Nayi payment order kholein aur "Payment lein" dabayein.</p>
            )}
          </Card>
          <Button fullWidth size="lg" loading={save.isPending} disabled={!!closed} onClick={submit}>
            {isEdit ? 'Save karein' : 'Order banayein'} <Kbd className="ml-2 bg-white/20 text-white">Ctrl S</Kbd>
          </Button>
          <Link to="/sports/team-orders" className="block text-center text-[0.8125rem] font-medium text-slate-500 hover:text-slate-700">Sab team orders</Link>
        </aside>
      </div>
    </PageShell>
  );
}
