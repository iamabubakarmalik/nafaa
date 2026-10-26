/**
 * New or edit bundle: pick the products and quantities, then the deal
 * price. The separate total, saving, cost and profit are worked out live;
 * the server checks the same rules. Ctrl+S saves, Esc goes back, G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Barcode, CalendarClock, GraduationCap, Layers, Minus, Plus, Tag, Trash2, TrendingUp } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Card, Input, Kbd, PageHero, PageShell, Skeleton, Switch, Textarea, heroIconButton } from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { Product } from '@modules/inventory/products/api/products.api';
import { electronicsBundlesApi, type BundlePayload } from '../api/bundles.api';
import { ProductPick } from '../components/pickers';
import { apiError } from '../components/meta';

interface Line { productId: string; name: string; quantity: number; unitPrice: string; listPrice: number; cost: number; serial?: boolean; stock?: number }

const num = (v: string) => v.replace(/[^\d.]/g, '');
const r2 = (n: number) => Math.round(n * 100) / 100;
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export default function BundleFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { cost: money } = useMasked();
  const guide = usePageGuide();
  const lock = useRef(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [price, setPrice] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [touched, setTouched] = useState(false);

  const existing = useQuery({ queryKey: ['electronics-bundles', 'one', id], queryFn: () => electronicsBundlesApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const b = existing.data;
    if (!b) return;
    setName(b.name);
    setDescription(b.description ?? '');
    setImageUrl(b.imageUrl ?? '');
    setLines(b.items.map((i) => ({
      productId: i.productId, name: i.product?.name ?? 'Product hata diya gaya', quantity: i.quantity, unitPrice: String(i.unitPrice),
      listPrice: Number(i.product?.price) || i.unitPrice, cost: Number(i.product?.costPrice) || 0, serial: i.serial, stock: i.stock,
    })));
    setPrice(String(b.bundlePrice));
    setValidFrom(day(b.validFrom));
    setValidUntil(day(b.validUntil));
    setIsActive(b.isActive);
    setIsFeatured(b.isFeatured);
  }, [existing.data]);

  const original = r2(lines.reduce((s, l) => s + l.quantity * (Number(l.unitPrice) || 0), 0));
  const cost = r2(lines.reduce((s, l) => s + l.quantity * l.cost, 0));
  const deal = Number(price) || 0;
  const saving = r2(original - deal);
  const profit = r2(deal - cost);
  const serial = lines.some((l) => l.serial);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (name.trim().length < 2) p.push('Bundle ka naam likhein');
    if (!lines.length) p.push('Kam az kam ek product jorein');
    else if (lines.length === 1 && lines[0].quantity <= 1) p.push('Do cheezein, ya ek cheez ki ek se zyada quantity');
    if (!(deal > 0)) p.push('Deal ka rate likhein');
    else if (deal > original) p.push('Deal ka rate alag alag rate se zyada hai');
    if (validFrom && validUntil && validUntil < validFrom) p.push('Khatam ki date shuru se pehle hai');
    return p;
  }, [name, lines, deal, original, validFrom, validUntil]);

  const add = (p: Product | null) => {
    if (!p) return;
    if (lines.some((l) => l.productId === p.id)) { setLines((ls) => ls.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))); return; }
    setLines((ls) => [...ls, { productId: p.id, name: p.name, quantity: 1, unitPrice: String(p.price), listPrice: Number(p.price) || 0, cost: Number(p.costPrice) || 0, stock: Number(p.stock) || 0 }]);
  };
  const setLine = (pid: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.productId === pid ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: () => {
      const body: BundlePayload = {
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl || null,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: Number(l.unitPrice) || undefined })),
        bundlePrice: deal,
        isActive,
        isFeatured,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
      };
      return editing ? electronicsBundlesApi.update(id!, body) : electronicsBundlesApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Bundle save ho gaya' : 'Bundle ban gaya');
      ['electronics-bundles', 'electronics-pos-catalog'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate('/electronics/bundles');
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTouched(true);
    if (problems.length) { toast.error(problems[0]); return; }
    if (lock.current || save.isPending) return;
    lock.current = true;
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && existing.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !existing.data) {
    return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye bundle nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/electronics/bundles')}>Bundles par wapas</Button></div></PageShell>;
  }

  return (
    <PageShell>
      <PageHero
        title={editing ? `${existing.data?.name} — badlein` : 'Naya bundle'}
        subtitle="Cheezein chunein, phir deal ka rate — bachat aur profit khud nikal aata hai"
        back={() => navigate(-1)}
        backLabel="Wapas (Esc)"
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>}
        actions={<button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Layers}>Bundle</T>}>
            <div className="flex flex-wrap items-start gap-4">
              <AvatarUpload value={imageUrl || null} onChange={(u) => setImageUrl(u ?? '')} purpose="product-image" size="md" shape="square" fallbackText={name || 'B'} />
              <div className="grid min-w-0 flex-1 gap-3">
                <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="LED 43 + wall bracket" data-autofocus
                  error={touched && name.trim().length < 2 ? 'Naam likhein' : undefined} hint="POS aur bill par yahi naam aata hai" />
                <Textarea label="Tafseel" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="Free fitting ke saath" hint="Marzi hai" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Tag}>Cheezein</T>} description="Har cheez ka alag rate — bachat isi se ginti hai">
            <div className="space-y-3">
              <ProductPick value={null} onChange={add} label="Product jorein" exclude={lines.map((l) => l.productId)} hint="Naam ya barcode likh kar Enter" />
              {lines.length === 0 ? (
                <p className={cn('rounded-xl px-3 py-6 text-center text-[0.8125rem] ring-1', touched ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-slate-50 text-slate-500 ring-slate-200')}>Abhi koi cheez nahi</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                  {lines.map((l) => (
                    <li key={l.productId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-medium text-slate-900">{l.name}{l.serial && <Barcode className="ml-1 inline h-3.5 w-3.5 text-violet-600" />}</span>
                        <span className="text-[0.75rem] text-slate-500">Rate {formatPKR(l.listPrice)}{l.stock != null ? ` · stock ${l.stock}` : ''}</span>
                      </span>
                      <span className="inline-flex items-center rounded-lg ring-1 ring-slate-200">
                        <button type="button" aria-label="Kam" onClick={() => setLine(l.productId, { quantity: Math.max(1, l.quantity - 1) })} className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center text-[0.875rem] font-semibold tabular-nums">{l.quantity}</span>
                        <button type="button" aria-label="Zyada" onClick={() => setLine(l.productId, { quantity: Math.min(1000, l.quantity + 1) })} className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
                      </span>
                      <Input size="sm" aria-label="Alag rate" inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(l.productId, { unitPrice: num(e.target.value) })} wrapperClassName="w-28" className="text-right tabular-nums" />
                      <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {serial && (
                <p className="flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-[0.75rem] text-violet-900 ring-1 ring-violet-200">
                  <Barcode className="mt-0.5 h-4 w-4 shrink-0" />Is bundle mein serial wali cheez hai. POS par bundle dabane par us ka unit chunna hoga, aur warranty usi unit par lagegi.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={TrendingUp}>Rate</T>}>
            <div className="space-y-3">
              <Input label="Deal ka rate (Rs)" required inputMode="decimal" value={price} onChange={(e) => setPrice(num(e.target.value))} placeholder={original ? String(original) : '0'}
                className="text-right text-base font-semibold tabular-nums" error={touched && !(deal > 0) ? 'Rate likhein' : touched && deal > original ? 'Alag rate se zyada hai' : undefined}
                hint="Customer ek hi rate deta hai" />
              {original > 0 && (
                <div className="flex flex-wrap gap-1">
                  {[3, 5, 10].map((pc) => (
                    <button key={pc} type="button" onClick={() => setPrice(String(Math.round(original * (1 - pc / 100))))}
                      className="h-7 rounded-lg bg-white px-2 text-[0.75rem] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{pc}% kam</button>
                  ))}
                </div>
              )}
              <dl className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-[0.8125rem] ring-1 ring-slate-200">
                <Row k="Alag alag rate" v={formatPKR(original)} />
                <Row k="Customer ki bachat" v={deal > 0 ? `${formatPKR(Math.max(saving, 0))}${original > 0 ? ` (${Math.round((Math.max(saving, 0) / original) * 100)}%)` : ''}` : '—'} />
                <Row k="Cost" v={money(cost)} />
                <Row k="Profit" v={deal > 0 ? money(profit) : '—'} strong warn={deal > 0 && profit < 0} />
              </dl>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={CalendarClock}>Kab tak</T>} description="Khali chhorein to hamesha">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Shuru" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} hint="Is din se POS par" />
              <Input label="Khatam" type="date" value={validUntil} min={validFrom || undefined} onChange={(e) => setValidUntil(e.target.value)} hint="Is ke baad POS se hat jayega" />
            </div>
            <div className="mt-4 space-y-3">
              <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} label="Chalu" description="Band ho to POS par nahi aata" />
              <Switch checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} label="Upar dikhayein" description="POS ke Combos mein sab se pehle" />
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {touched && problems.length > 0
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{lines.length} cheezein · deal {deal > 0 ? formatPKR(deal) : '—'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Bundle banayein'}</Button>
      </div>

      {guide.isOpen && (
        <PageGuide title="Bundle banana" onClose={guide.close}
          steps={[
            { icon: Tag, color: '#2563eb', title: 'Cheezein', text: 'Product search karein, Enter dabayein. Quantity +/- se. Alag rate khud product se aata hai — chahein to badlein.' },
            { icon: TrendingUp, color: '#059669', title: 'Deal ka rate', text: 'Alag alag rate se kam rakhein. Bachat aur profit saath saath dikhte hain — profit laal ho to rate barhayein.' },
            { icon: CalendarClock, color: '#7c3aed', title: 'Dates', text: 'Eid ya sale ki deal ho to shuru aur khatam ki date dein. Khatam hone par POS se khud hat jati hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Row({ k, v, strong, warn }: { k: string; v: string; strong?: boolean; warn?: boolean }) {
  return <div className={cn('flex justify-between gap-3', strong && 'border-t border-slate-200 pt-1.5 font-semibold')}><dt className="text-slate-600">{k}</dt><dd className={cn('tabular-nums', warn ? 'text-rose-600' : 'text-slate-900')}>{v}</dd></div>;
}

const T = ({ icon: Icon, children }: { icon: typeof Layers; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
