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
    onSuccess: () => { toast.success('School save ho gaya'); setForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const toggle = useMutation({
    mutationFn: (s: School) => (s.isActive ? schoolsApi.remove(s.id) : schoolsApi.update(s.id, { isActive: true })),
    onSuccess: (_r, s) => { toast.success(s.isActive ? `${s.name} band — lists aur khata waise hi` : `${s.name} chalu`); setOff(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const khata = useMutation({
    mutationFn: ({ s }: { s: School; go: 'khata' | 'pos' }) => schoolsApi.openKhata(s.id),
    onSuccess: (c, { s, go }) => {
      refresh();
      if (go === 'pos') { toast.success(`POS par customer "${s.name}" chunein aur udhaar me bill karein`); navigate('/pos'); }
      else navigate(`/customers/${c.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Khata nahi khula')),
  });

  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  return (
    <PageShell>
      <PageHero
        title="Schools"
        chip={<><SchoolIcon /> Idare aur un ka khata</>}
        meta="School lists, discount, udhaar aur baqi paise ek jagah"
        loading={listQ.isLoading}
        actions={<>
          <Link to="/bookstore/school-lists" className={heroButton}><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">School lists</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Naya school (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> School</button>}
        </>}
        stats={[
          { label: 'School', value: totals.active },
          { label: 'Book lists', value: totals.lists },
          { label: 'Schools se lena', value: sales(totals.owed) },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={SchoolIcon} color="#2563eb" label="Chalu school" value={totals.active} hint={`${all.length - totals.active} band`} />
        <KpiCard icon={ClipboardList} color="#7c3aed" label="Book lists" value={totals.lists} />
        <KpiCard icon={Wallet} color="#d97706" label="Udhaar wale" value={totals.onCredit} onClick={() => setTab('credit')} active={tab === 'credit'} />
        <KpiCard icon={BookOpen} color="#16a34a" label="Schools se lena" value={sales(totals.owed)} hint="Khata ka baqi" />
      </KpiRow>

      <ViewTabs<Tab> tabs={[
        { id: 'active', label: 'Chalu', count: totals.active },
        { id: 'credit', label: 'Udhaar baqi', count: totals.onCredit },
        { id: 'off', label: 'Band', count: all.length - totals.active },
      ]} value={tab} onChange={setTab} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, code, shehar ya board" label="Search" />} />

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <EmptyBox icon={SchoolIcon} title={search ? 'Koi school nahi mila' : tab === 'credit' ? 'Kisi school par udhaar nahi' : 'Abhi koi school nahi'}
            text="School banayein, phir us ki har class ki book list. School udhaar par le to 'Khata' khol dein."
            action={canEdit && !search && tab === 'active' ? <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>School banayein</Button> : undefined} />
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
                    {s.discountPct > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700 ring-1 ring-emerald-200">{s.discountPct}% off</span>}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                    <div><dt className="text-slate-500">Lists</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{s._count?.bookLists ?? 0}</dd></div>
                    <div><dt className="text-slate-500">Udhaar</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{s.creditDays ? `${s.creditDays} din` : 'Naqd'}</dd></div>
                    <div><dt className="text-slate-500">Baqi</dt><dd className={cn('text-[0.9375rem] font-bold tabular-nums', over ? 'text-rose-600' : bal > 0 ? 'text-amber-700' : 'text-slate-900')}>{s.customer ? sales(bal) : '—'}</dd></div>
                  </dl>
                  <p className="mt-2 truncate text-[0.75rem] text-slate-500">
                    {[s.contactPerson && `${s.contactPerson}${s.contactPhone ? ` (${s.contactPhone})` : ''}`, s.creditLimit > 0 && `Had ${sales(s.creditLimit)}`].filter(Boolean).join(' · ') || 'Rabta nahi likha'}
                    {over && <span className="font-semibold text-rose-600"> · had se upar</span>}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link to={`/bookstore/school-lists?school=${s.id}`} className={cardLink}><ClipboardList className="h-3.5 w-3.5" />Lists</Link>
                    {s.customer && canKhata && <Link to={`/customers/${s.customer.id}`} className={cardAction}><Wallet className="h-3.5 w-3.5" />Khata</Link>}
                    {!s.customer && canEdit && s.isActive && <button type="button" onClick={() => khata.mutate({ s, go: 'khata' })} disabled={khata.isPending} className={cardAction}><Wallet className="h-3.5 w-3.5" />Khata kholein</button>}
                    {canSell && canEdit && s.isActive && <button type="button" onClick={() => khata.mutate({ s, go: 'pos' })} disabled={khata.isPending} className={cardAction}><ShoppingCart className="h-3.5 w-3.5" />Udhaar bill</button>}
                    {canEdit && <>
                      <button type="button" onClick={() => setForm(s)} className={cardAction}><Pencil className="h-3.5 w-3.5" />Badlein</button>
                      {s.isActive
                        ? <button type="button" onClick={() => setOff(s)} className={`ml-auto ${cardDanger}`}><Power className="h-3.5 w-3.5" />Band</button>
                        : <button type="button" onClick={() => toggle.mutate(s)} className={`ml-auto ${cardLink}`}><Power className="h-3.5 w-3.5" />Chalu</button>}
                    </>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {form && <SchoolModal school={form === 'new' ? null : form} pending={save.isPending} onSave={(body) => save.mutate({ id: form === 'new' ? undefined : form.id, body })} onClose={() => setForm(null)} />}
      {off && <ConfirmModal title={`${off.name} band karein?`} text="School list aur khata waise hi rahenge; band school ki lists POS par nahi dikhengi." confirm="Band karein" danger pending={toggle.isPending} onConfirm={() => toggle.mutate(off)} onClose={() => setOff(null)} />}

      {guide.isOpen && (
        <PageGuide title="Schools — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: SchoolIcon, color: '#2563eb', title: 'School', text: 'Naam, board aur rabta likhein. Discount % yaad rakhne ke liye hai — set ki qeemat School list me tay hoti hai.' },
            { icon: ClipboardList, color: '#7c3aed', title: 'Lists', text: 'Har class ki kitabon ki list banayein; "Counter par" karne se POS ke Combos me set ban kar bikti hai.' },
            { icon: Wallet, color: '#d97706', title: 'Khata', text: 'School udhaar par le to "Khata kholein": school ke naam se customer banta hai. POS par wohi customer chun kar udhaar me bill karein, paise khata se lein.' },
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
  const errors = { name: !v.name.trim() ? 'Naam likhein' : undefined, discount: Number(v.discount) > 100 ? '100% se zyada nahi' : undefined };
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
    <Modal open onClose={onClose} size="lg" title={school ? `${school.name} — badlein` : 'Naya school'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={pending}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Naam" required autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} error={tried ? errors.name : undefined} placeholder="Jaise: Beaconhouse Model Town" hint="Khata isi naam se khulta hai" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Type" value={v.type} onChange={(e) => set({ type: e.target.value })} options={SCHOOL_TYPES.map((x) => ({ value: x, label: x }))} />
          <Select label="Board" value={v.board} onChange={(e) => set({ board: e.target.value })} placeholder="Chunein" options={BOARDS.map((x) => ({ value: x, label: x }))} />
          <Select label="Medium" value={v.medium} onChange={(e) => set({ medium: e.target.value })} placeholder="Chunein" options={['English', 'Urdu', 'Dono'].map((x) => ({ value: x, label: x }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Shehar / ilaqa" value={v.city} onChange={(e) => set({ city: e.target.value })} placeholder="Lahore" />
          <Input label="School ka phone" inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
          <Input label="Rabta (banda)" value={v.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} placeholder="Admin ya accountant" />
          <Input label="Us ka phone" inputMode="tel" value={v.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} placeholder="03xx xxxxxxx" hint="Khata me yahi number jata hai" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Discount %" inputMode="decimal" value={v.discount} onChange={(e) => set({ discount: decimal(e.target.value) })} error={errors.discount} placeholder="10" hint="School ke bachon ko kitna kam" />
          <Input label="Udhaar ke din" inputMode="numeric" value={v.days} onChange={(e) => set({ days: digits(e.target.value) })} placeholder="30" hint="0 = naqd" />
          <Input label="Udhaar ki had" inputMode="decimal" value={v.limit} onChange={(e) => set({ limit: decimal(e.target.value) })} placeholder="100000" hint="Khata ki had bhi yahi" />
        </div>
      </form>
    </Modal>
  );
}
