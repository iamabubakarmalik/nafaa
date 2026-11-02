/**
 * Schools and institutions the shop supplies: their book lists, discount,
 * credit terms and khata. A school that buys on credit gets a customer
 * khata of the same name; its bills go there from the counter (pick the
 * school as the customer, pay by udhaar) and its payments are taken on the
 * khata page, so the day book and reports count them once.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, ClipboardList, GraduationCap, Pencil, Plus, Power, School as SchoolIcon, ShoppingCart, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { schoolsApi, type School } from '../api/schools.api';
import { BOARDS, KEYS, SCHOOL_TYPES, apiError, decimal, digits } from '../lib/meta';
import { ConfirmModal, EmptyBox, cardAction, cardDanger, cardLink, usePageKeys, useSaveKey } from '../components/ui';
import { t as tr } from '@core/i18n';

type Tab = 'active' | 'credit' | 'off';

export default function SchoolsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canKhata = usePermission(PERMISSIONS.KHATA_VIEW);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('active');
  const [form, setForm] = useState<School | 'new' | null>(null);
  const [off, setOff] = useState<School | null>(null);

  const listQ = useQuery({ queryKey: [KEYS.schools, 'all'], queryFn: () => schoolsApi.list() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => (tab === 'off' ? !s.isActive : s.isActive && (tab !== 'credit' || (s.customer?.balance ?? 0) > 0))
      && (!q || [s.name, s.code, s.city, s.contactPerson, s.board].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const totals = useMemo(() => {
    const active = all.filter((s) => s.isActive);
    return {
      active: active.length,
      lists: active.reduce((t, s) => t + (s._count?.bookLists ?? 0), 0),
      owed: active.reduce((t, s) => t + Math.max(s.customer?.balance ?? 0, 0), 0),
      onCredit: active.filter((s) => (s.customer?.balance ?? 0) > 0).length,
    };
  }, [all]);

  const refresh = () => qc.invalidateQueries({ queryKey: [KEYS.schools] });
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<School> }) => (id ? schoolsApi.update(id, body) : schoolsApi.create(body)),
    onSuccess: () => { toast.success(tr('School save ho gaya')); setForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  const toggle = useMutation({
    mutationFn: (s: School) => (s.isActive ? schoolsApi.remove(s.id) : schoolsApi.update(s.id, { isActive: true })),
    onSuccess: (_r, s) => { toast.success(s.isActive ? tr('{{name}} band — lists aur khata waise hi', { name: s.name }) : `${s.name} chalu`); setOff(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const khata = useMutation({
    mutationFn: ({ s }: { s: School; go: 'khata' | 'pos' }) => schoolsApi.openKhata(s.id),
    onSuccess: (c, { s, go }) => {
      refresh();
      if (go === 'pos') { toast.success(tr('POS par customer "{{name}}" chunein aur udhaar me bill karein', { name: s.name })); navigate('/pos'); }
      else navigate(`/customers/${c.id}`);
    },
    onError: (e) => toast.error(apiError(e, tr('Khata nahi khula'))),
  });

  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  return (
    <PageShell>
      <PageHero
        title={tr('Schools')}
        chip={<><SchoolIcon /> {' '}{tr('Idare aur un ka khata')}</>}
        meta={tr('School lists, discount, udhaar aur baqi paise ek jagah')}
        loading={listQ.isLoading}
        actions={<>
          <Link to="/bookstore/school-lists" className={heroButton}><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">{tr('School lists')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title={tr('Naya school (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('School')}</button>}
        </>}
        stats={[
          { label: tr('School'), value: totals.active },
          { label: tr('Book lists'), value: totals.lists },
          { label: tr('Schools se lena'), value: sales(totals.owed) },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={SchoolIcon} color="#2563eb" label={tr('Chalu school')} value={totals.active} hint={tr('{{value}} band', { value: all.length - totals.active })} />
        <KpiCard icon={ClipboardList} color="#7c3aed" label={tr('Book lists')} value={totals.lists} />
        <KpiCard icon={Wallet} color="#d97706" label={tr('Udhaar wale')} value={totals.onCredit} onClick={() => setTab('credit')} active={tab === 'credit'} />
        <KpiCard icon={BookOpen} color="#16a34a" label={tr('Schools se lena')} value={sales(totals.owed)} hint={tr('Khata ka baqi')} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[
        { id: 'active', label: tr('Chalu'), count: totals.active },
        { id: 'credit', label: tr('Udhaar baqi'), count: totals.onCredit },
        { id: 'off', label: tr('Band'), count: all.length - totals.active },
      ]} value={tab} onChange={setTab} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, code, shehar ya board')} label={tr('Search')} />} />

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <EmptyBox icon={SchoolIcon} title={search ? tr('Koi school nahi mila') : tab === 'credit' ? tr('Kisi school par udhaar nahi') : tr('Abhi koi school nahi')}
            text={tr('School banayein, phir us ki har class ki book list. School udhaar par le to \'Khata\' khol dein.')}
            action={canEdit && !search && tab === 'active' ? <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('School banayein')}</Button> : undefined} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => {
              const bal = s.customer?.balance ?? 0;
              const over = s.creditLimit > 0 && bal > s.creditLimit;
              return (
                <li key={s.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><SchoolIcon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{s.name}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[s.type, s.board, s.city].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    {s.discountPct > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700 ring-1 ring-emerald-200">{tr('{{discountPct}}% off', { discountPct: s.discountPct })}</span>}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                    <div><dt className="text-slate-500">{tr('Lists')}</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{s._count?.bookLists ?? 0}</dd></div>
                    <div><dt className="text-slate-500">{tr('Udhaar')}</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{s.creditDays ? tr('{{creditDays}} din', { creditDays: s.creditDays }) : tr('Naqd')}</dd></div>
                    <div><dt className="text-slate-500">{tr('Baqi')}</dt><dd className={cn('text-[0.9375rem] font-bold tabular-nums', over ? 'text-rose-600' : bal > 0 ? 'text-amber-700' : 'text-slate-900')}>{s.customer ? sales(bal) : '—'}</dd></div>
                  </dl>
                  <p className="mt-2 truncate text-[0.75rem] text-slate-500">
                    {[s.contactPerson && `${s.contactPerson}${s.contactPhone ? ` (${s.contactPhone})` : ''}`, s.creditLimit > 0 && `Had ${sales(s.creditLimit)}`].filter(Boolean).join(' · ') || tr('Rabta nahi likha')}
                    {over && <span className="font-semibold text-rose-600"> {' '}{tr('· had se upar')}</span>}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link to={`/bookstore/school-lists?school=${s.id}`} className={cardLink}><ClipboardList className="h-3.5 w-3.5" />{tr('Lists')}</Link>
                    {s.customer && canKhata && <Link to={`/customers/${s.customer.id}`} className={cardAction}><Wallet className="h-3.5 w-3.5" />{tr('Khata')}</Link>}
                    {!s.customer && canEdit && s.isActive && <button type="button" onClick={() => khata.mutate({ s, go: 'khata' })} disabled={khata.isPending} className={cardAction}><Wallet className="h-3.5 w-3.5" />{tr('Khata kholein')}</button>}
                    {canSell && canEdit && s.isActive && <button type="button" onClick={() => khata.mutate({ s, go: 'pos' })} disabled={khata.isPending} className={cardAction}><ShoppingCart className="h-3.5 w-3.5" />{tr('Udhaar bill')}</button>}
                    {canEdit && <>
                      <button type="button" onClick={() => setForm(s)} className={cardAction}><Pencil className="h-3.5 w-3.5" />{tr('Badlein')}</button>
                      {s.isActive
                        ? <button type="button" onClick={() => setOff(s)} className={`ms-auto ${cardDanger}`}><Power className="h-3.5 w-3.5" />{tr('Band')}</button>
                        : <button type="button" onClick={() => toggle.mutate(s)} className={`ms-auto ${cardLink}`}><Power className="h-3.5 w-3.5" />{tr('Chalu')}</button>}
                    </>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</p>

      {form && <SchoolModal school={form === 'new' ? null : form} pending={save.isPending} onSave={(body) => save.mutate({ id: form === 'new' ? undefined : form.id, body })} onClose={() => setForm(null)} />}
      {off && <ConfirmModal title={tr('{{name}} band karein?', { name: off.name })} text={tr('School list aur khata waise hi rahenge; band school ki lists POS par nahi dikhengi.')} confirm={tr('Band karein')} danger pending={toggle.isPending} onConfirm={() => toggle.mutate(off)} onClose={() => setOff(null)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Schools — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: SchoolIcon, color: '#2563eb', title: tr('School'), text: tr('Naam, board aur rabta likhein. Discount % yaad rakhne ke liye hai — set ki qeemat School list me tay hoti hai.') },
            { icon: ClipboardList, color: '#7c3aed', title: tr('Lists'), text: tr('Har class ki kitabon ki list banayein; "Counter par" karne se POS ke Combos me set ban kar bikti hai.') },
            { icon: Wallet, color: '#d97706', title: tr('Khata'), text: tr('School udhaar par le to "Khata kholein": school ke naam se customer banta hai. POS par wohi customer chun kar udhaar me bill karein, paise khata se lein.') },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function SchoolModal({ school, pending, onSave, onClose }: { school: School | null; pending: boolean; onSave: (v: Partial<School>) => void; onClose: () => void }) {
  const [v, setV] = useState({
    name: school?.name ?? '', type: school?.type ?? 'School', board: school?.board ?? '', medium: school?.medium ?? '', city: school?.city ?? '',
    address: school?.address ?? '', phone: school?.phone ?? '', principalName: school?.principalName ?? '', contactPerson: school?.contactPerson ?? '',
    contactPhone: school?.contactPhone ?? '', discount: school?.discountPct ? String(school.discountPct) : '',
    days: school?.creditDays ? String(school.creditDays) : '', limit: school?.creditLimit ? String(school.creditLimit) : '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const [tried, setTried] = useState(false);
  const errors = { name: !v.name.trim() ? tr('Naam likhein') : undefined, discount: Number(v.discount) > 100 ? tr('100% se zyada nahi') : undefined };
  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean) || pending) return;
    const t = (s: string) => s.trim() || null;
    onSave({
      name: v.name.trim(), type: t(v.type) ?? undefined, board: t(v.board) ?? undefined, medium: t(v.medium) ?? undefined, city: t(v.city) ?? undefined,
      address: t(v.address) ?? undefined, phone: t(v.phone) ?? undefined, principalName: t(v.principalName) ?? undefined,
      contactPerson: t(v.contactPerson) ?? undefined, contactPhone: t(v.contactPhone) ?? undefined,
      discountPct: Number(v.discount) || 0, creditDays: Number(v.days) || 0, creditLimit: Number(v.limit) || 0,
    });
  };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="lg" title={school ? tr('{{name}} — badlein', { name: school.name }) : tr('Naya school')} description={tr('Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} loading={pending}>{tr('Save')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label={tr('Naam')} required autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} error={tried ? errors.name : undefined} placeholder={tr('Jaise: Beaconhouse Model Town')} hint={tr('Khata isi naam se khulta hai')} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label={tr('Type')} value={v.type} onChange={(e) => set({ type: e.target.value })} options={SCHOOL_TYPES.map((x) => ({ value: x, label: x }))} />
          <Select label={tr('Board')} value={v.board} onChange={(e) => set({ board: e.target.value })} placeholder={tr('Chunein')} options={BOARDS.map((x) => ({ value: x, label: x }))} />
          <Select label={tr('Medium')} value={v.medium} onChange={(e) => set({ medium: e.target.value })} placeholder={tr('Chunein')} options={['English', 'Urdu', 'Dono'].map((x) => ({ value: x, label: x }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Shehar / ilaqa')} value={v.city} onChange={(e) => set({ city: e.target.value })} placeholder={tr('Lahore')} />
          <Input label={tr('School ka phone')} inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
          <Input label={tr('Rabta (banda)')} value={v.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} placeholder={tr('Admin ya accountant')} />
          <Input label={tr('Us ka phone')} inputMode="tel" value={v.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} placeholder={tr('03xx xxxxxxx')} hint={tr('Khata me yahi number jata hai')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Discount %')} inputMode="decimal" value={v.discount} onChange={(e) => set({ discount: decimal(e.target.value) })} error={errors.discount} placeholder="10" hint={tr('School ke bachon ko kitna kam')} />
          <Input label={tr('Udhaar ke din')} inputMode="numeric" value={v.days} onChange={(e) => set({ days: digits(e.target.value) })} placeholder="30" hint={tr('0 = naqd')} />
          <Input label={tr('Udhaar ki had')} inputMode="decimal" value={v.limit} onChange={(e) => set({ limit: decimal(e.target.value) })} placeholder="100000" hint={tr('Khata ki had bhi yahi')} />
        </div>
      </form>
    </Modal>
  );
}
