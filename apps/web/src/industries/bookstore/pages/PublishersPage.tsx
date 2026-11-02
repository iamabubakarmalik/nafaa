/**
 * Publishers: who the shop's books come from, their usual discount and
 * credit days, and what the shop owes them. Each publisher is linked to a
 * supplier (picked here, or one of the same name made on first purchase),
 * so buying, returning books to the publisher and paying them run through
 * the shared purchases and supplier khata, and a purchase from that
 * supplier fills its books at list price less the publisher's discount.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Building2, Download, GraduationCap, Pencil, Percent, Plus, Power, ShoppingCart, Undo2, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { publishersApi, type Publisher } from '../api/publishers.api';
import { KEYS, apiError, decimal, digits } from '../lib/meta';
import { ConfirmModal, EmptyBox, cardAction, cardDanger, cardLink, usePageKeys, useSaveKey } from '../components/ui';
import { t as tr } from '@core/i18n';

type Tab = 'active' | 'off';

export default function PublishersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canPurchase = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canEditSuppliers = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const canSuppliers = usePermission(PERMISSIONS.SUPPLIERS_VIEW);
  const canBuy = canPurchase && canEditSuppliers;
  const { cost } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('active');
  const [form, setForm] = useState<Publisher | 'new' | null>(null);
  const [off, setOff] = useState<Publisher | null>(null);

  const listQ = useQuery({ queryKey: [KEYS.publishers, 'all'], queryFn: () => publishersApi.list() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => (tab === 'active' ? p.isActive : !p.isActive) && (!q || [p.name, p.city, p.contactPerson, p.phone].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const totals = useMemo(() => {
    const active = all.filter((p) => p.isActive);
    return {
      active: active.length,
      books: active.reduce((s, p) => s + (p._count?.books ?? 0), 0),
      owed: active.reduce((s, p) => s + (p.supplier?.outstandingDue ?? 0), 0),
      bought: active.reduce((s, p) => s + (p.supplier?.totalPurchased ?? 0), 0),
    };
  }, [all]);

  const refresh = () => qc.invalidateQueries({ queryKey: [KEYS.publishers] });
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<Publisher> }) => (id ? publishersApi.update(id, body) : publishersApi.create(body)),
    onSuccess: () => { toast.success(tr('Publisher save ho gaya')); setForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  const toggle = useMutation({
    mutationFn: (p: Publisher) => (p.isActive ? publishersApi.remove(p.id) : publishersApi.update(p.id, { name: p.name, isActive: true })),
    onSuccess: (_r, p) => { toast.success(p.isActive ? tr('{{name}} band — kitaben waisi hi', { name: p.name }) : tr('{{name}} wapas chalu', { name: p.name })); setOff(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const seed = useMutation({
    mutationFn: () => publishersApi.seedPakistani(),
    onSuccess: (r) => { toast.success(r.created ? tr('{{created}} publisher jur gaye', { created: r.created }) : tr('Sab pehle se maujood hain')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  /** Opens (or finds) the publisher's supplier, then goes where the user asked. */
  const supplier = useMutation({
    mutationFn: ({ p }: { p: Publisher; to: 'buy' | 'khata' }) => publishersApi.openSupplier(p.id),
    onSuccess: (s, { to }) => {
      refresh();
      navigate(to === 'buy' ? `/purchases/new?supplier=${s.id}` : `/suppliers/${s.id}`);
    },
    onError: (e) => toast.error(apiError(e, tr('Supplier nahi khula'))),
  });

  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  return (
    <PageShell>
      <PageHero
        title={tr('Publishers')}
        chip={<><Building2 /> {' '}{tr('Kitaben kahan se aati hain')}</>}
        meta={tr('Har publisher ka discount, udhaar ke din aur kitna dena hai')}
        loading={listQ.isLoading}
        actions={<>
          {canEdit && <button type="button" onClick={() => seed.mutate()} disabled={seed.isPending} className={heroButton} title={tr('Pakistan ke mash-hoor publisher jorein')}><Download className="h-4 w-4" /><span className="hidden sm:inline">{tr('Mash-hoor publisher')}</span></button>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title={tr('Naya publisher (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Publisher')}</button>}
        </>}
        stats={[
          { label: tr('Publisher'), value: totals.active },
          { label: tr('Kitaben'), value: totals.books },
          { label: tr('Dena hai'), value: cost(totals.owed) },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Building2} color="#2563eb" label={tr('Chalu publisher')} value={totals.active} hint={tr('{{value}} band', { value: all.length - totals.active })} />
        <KpiCard icon={BookOpen} color="#0891b2" label={tr('Kitaben jori hui')} value={totals.books} />
        <KpiCard icon={ShoppingCart} color="#16a34a" label={tr('Ab tak kharida')} value={cost(totals.bought)} hint={tr('Supplier bano to ginti hai')} />
        <KpiCard icon={Wallet} color="#d97706" label={tr('Publishers ko dena')} value={cost(totals.owed)} hint={tr('Supplier khata se')} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'active', label: tr('Chalu'), count: totals.active }, { id: 'off', label: tr('Band'), count: all.length - totals.active }]} value={tab} onChange={setTab} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, shehar, banda ya phone')} label={tr('Search')} />} />

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <EmptyBox icon={Building2} title={search ? tr('Koi publisher nahi mila') : tab === 'off' ? tr('Koi band publisher nahi') : tr('Abhi koi publisher nahi')}
            text={tr('Publisher banayein ya mash-hoor Pakistani publisher ek click me jorein. Kitab banate waqt publisher chuna jata hai.')}
            action={canEdit && !search && tab === 'active' ? <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Publisher banayein')}</Button> : undefined} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => (
              <li key={p.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[p.city, p.contactPerson, p.phone].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  {p.defaultDiscountPct > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700 ring-1 ring-emerald-200"><Percent className="h-3 w-3" />{p.defaultDiscountPct}</span>}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                  <div><dt className="text-slate-500">{tr('Kitaben')}</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{p._count?.books ?? 0}</dd></div>
                  <div><dt className="text-slate-500">{tr('Udhaar')}</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{p.creditDays ? tr('{{creditDays}} din', { creditDays: p.creditDays }) : tr('Naqd')}</dd></div>
                  <div><dt className="text-slate-500">{tr('Dena hai')}</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{p.supplier ? cost(p.supplier.outstandingDue) : '—'}</dd></div>
                </dl>
                <p className="mt-2 truncate text-[0.75rem] text-slate-500">
                  {p.supplier ? <>{tr('Supplier:')}{' '} <span className="font-medium text-slate-700">{p.supplier.name}</span></> : tr('Supplier pehli purchase par banega')}
                  {p.defaultDiscountPct > 0 && tr(' · purchase par MRP se {{defaultDiscountPct}}% kam', { defaultDiscountPct: p.defaultDiscountPct })}{p.paymentTerms ? ` · ${p.paymentTerms}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {canBuy && p.isActive && <button type="button" onClick={() => supplier.mutate({ p, to: 'buy' })} disabled={supplier.isPending} className={cardLink}><ShoppingCart className="h-3.5 w-3.5" />{tr('Purchase')}</button>}
                  {canSuppliers && p.supplier && <button type="button" onClick={() => navigate(`/suppliers/${p.supplier!.id}`)} className={cardAction} title={tr('Khata, purchase bill aur wapsi')}><Wallet className="h-3.5 w-3.5" />{tr('Khata / wapsi')}</button>}
                  {canEdit && <>
                    <button type="button" onClick={() => setForm(p)} className={cardAction}><Pencil className="h-3.5 w-3.5" />{tr('Badlein')}</button>
                    {p.isActive
                      ? <button type="button" onClick={() => setOff(p)} className={`ms-auto ${cardDanger}`}><Power className="h-3.5 w-3.5" />{tr('Band')}</button>
                      : <button type="button" onClick={() => toggle.mutate(p)} className={`ms-auto ${cardLink}`}><Power className="h-3.5 w-3.5" />{tr('Chalu')}</button>}
                  </>}
                </div>
              </li>
            ))}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</p>

      {form && <PublisherModal publisher={form === 'new' ? null : form} pending={save.isPending} canPickSupplier={canEditSuppliers} onSave={(body) => save.mutate({ id: form === 'new' ? undefined : form.id, body })} onClose={() => setForm(null)} />}
      {off && <ConfirmModal title={tr('{{name}} band karein?', { name: off.name })} text={tr('Kitab banate waqt ye publisher nahi dikhega. Is ki kitaben, purchase aur khata waise hi rahenge.')} confirm={tr('Band karein')} danger pending={toggle.isPending} onConfirm={() => toggle.mutate(off)} onClose={() => setOff(null)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Publishers — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Building2, color: '#2563eb', title: tr('Publisher'), text: tr('Oxford, Paramount, Punjab Textbook Board — kitab banate waqt publisher chunein, products page aur POS par us ke naam se dhoondein.') },
            { icon: ShoppingCart, color: '#16a34a', title: tr('Purchase'), text: tr('"Purchase" dabane se publisher ka supplier jur jata hai aur naya purchase bill khulta hai. Is publisher ki kitabon ki cost MRP se discount % kam khud bharti hai.') },
            { icon: Undo2, color: '#ea580c', title: tr('Kitaben wapas'), text: tr('Season ke baad bachi kitaben publisher ko wapas: "Khata / wapsi" → Purchase tab → bill kholein aur Return karein. Stock aur dena dono kam ho jate hain.') },
            { icon: Wallet, color: '#d97706', title: tr('Khata'), text: tr('Kitna dena hai aur kab diya — supplier khata me. Udhaar ke din yahan likhein taake yaad rahe.') },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PublisherModal({ publisher, pending, canPickSupplier, onSave, onClose }: {
  publisher: Publisher | null; pending: boolean; canPickSupplier: boolean; onSave: (v: Partial<Publisher>) => void; onClose: () => void;
}) {
  const suppliersQ = useQuery({
    queryKey: ['suppliers', 'picker'], enabled: canPickSupplier, staleTime: 60_000,
    queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }),
  });
  const [v, setV] = useState({
    name: publisher?.name ?? '', city: publisher?.city ?? '', contactPerson: publisher?.contactPerson ?? '', phone: publisher?.phone ?? '',
    email: publisher?.email ?? '', discount: publisher?.defaultDiscountPct ? String(publisher.defaultDiscountPct) : '',
    days: publisher?.creditDays ? String(publisher.creditDays) : '', terms: publisher?.paymentTerms ?? '',
    supplierId: publisher?.supplierId ?? '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const [tried, setTried] = useState(false);
  const errors = {
    name: !v.name.trim() ? tr('Naam likhein') : undefined,
    discount: Number(v.discount) > 100 ? tr('100% se zyada nahi') : undefined,
  };
  const bad = Object.values(errors).some(Boolean);
  const submit = () => {
    setTried(true);
    if (bad || pending) return;
    const t = (s: string) => s.trim() || undefined;
    onSave({
      name: v.name.trim(), city: t(v.city), contactPerson: t(v.contactPerson), phone: t(v.phone), email: t(v.email),
      defaultDiscountPct: Number(v.discount) || 0, creditDays: Number(v.days) || 0, paymentTerms: t(v.terms),
      ...(canPickSupplier && { supplierId: v.supplierId || null }),
    });
  };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="lg" title={publisher ? tr('{{name}} — badlein', { name: publisher.name }) : tr('Naya publisher')} description={tr('Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} loading={pending}>{tr('Save')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label={tr('Naam')} required autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} error={tried ? errors.name : undefined} placeholder={tr('Jaise: Oxford University Press')} hint={tr('Purchase aur supplier khata isi naam se banta hai')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Shehar')} value={v.city} onChange={(e) => set({ city: e.target.value })} placeholder={tr('Lahore')} />
          <Input label={tr('Banda (rabta)')} value={v.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} placeholder={tr('Sales officer ka naam')} />
          <Input label={tr('Phone')} inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} placeholder={tr('03xx xxxxxxx')} />
          <Input label={tr('Email')} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} placeholder={tr('Marzi hai')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Discount %')} inputMode="decimal" value={v.discount} onChange={(e) => set({ discount: decimal(e.target.value) })} error={errors.discount} placeholder="25" hint={tr('Publisher dukaan ko kitna kam deta hai')} />
          <Input label={tr('Udhaar ke din')} inputMode="numeric" value={v.days} onChange={(e) => set({ days: digits(e.target.value) })} placeholder="30" hint={tr('0 = naqd')} />
          <Input label={tr('Shart')} value={v.terms} onChange={(e) => set({ terms: e.target.value })} placeholder={tr('Season ke baad wapsi')} />
        </div>
        {canPickSupplier && (
          <Select label={tr('Supplier')} value={v.supplierId} onChange={(e) => set({ supplierId: e.target.value })}
            hint={tr('Is supplier se purchase par is publisher ki kitabon ki cost MRP se discount % kam khud bharti hai. Khali chhorein to pehli purchase par isi naam ka supplier banega.')}
            options={[
              { value: '', label: tr('Khud banayein (publisher ke naam se)') },
              ...(suppliersQ.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
              ...(v.supplierId && !suppliersQ.data?.items.some((s) => s.id === v.supplierId) ? [{ value: v.supplierId, label: publisher?.supplier?.name ?? tr('Jura hua supplier') }] : []),
            ]} />
        )}
      </form>
    </Modal>
  );
}
