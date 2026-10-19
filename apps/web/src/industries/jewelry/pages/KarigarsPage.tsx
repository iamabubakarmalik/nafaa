/**
 * Karigars (artisans), the gold they hold and the labour owed to them. Gold
 * given goes out of metal stock onto the karigar; what comes back (the
 * finished piece, wastage allowed and leftover gold) is taken off, so each
 * karigar's balance and the safe always agree. Labour is earned as order
 * pieces come back (or written by hand for other work) and paid from the
 * drawer as an expense. Each karigar's full record opens from the row.
 *
 * Keys: N new karigar · / search · G guide.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Banknote, Filter, GraduationCap, Hammer, History, NotebookPen, Pencil, Plus, Scale, UserRound, Users } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Switch,
  Table, TBody, THead, Td, Th, Tr, Textarea, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { karigarsApi, type Karigar } from '../api/karigars.api';
import type { Purity } from '../api/metal-rates.api';
import { ChipPicker, EmptyList, KaratPill, LoadFailed, StatusPill } from '../components/ui';
import { COMMON_PURITIES, KEYS, apiError, day, dayTime, entryLabel, grams, purityLabel, r2, r3 } from '../lib/meta';

const labourDue = (k: Karigar) => r2(Math.max(k.totalEarnings - k.paidLabour, 0));

type Status = 'active' | 'inactive' | 'all';
type Where = '' | 'in' | 'out';

export default function KarigarsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const canMetal = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const canPay = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('active');
  const [where, setWhere] = useState<Where>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<Karigar | 'new' | null>(null);
  const [metal, setMetal] = useState<{ k: Karigar; mode: 'issue' | 'receive' } | null>(null);
  const [ledger, setLedger] = useState<Karigar | null>(null);
  const [labour, setLabour] = useState<{ k: Karigar; mode: 'pay' | 'earn' } | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const params = { search: query || undefined, ...(status !== 'all' && { isActive: String(status === 'active') }), ...(where && { isInHouse: String(where === 'in') }) };
  const listQ = useQuery({ queryKey: [KEYS.karigars, 'list', params], queryFn: () => karigarsApi.list(params), placeholderData: (p) => p });
  const sumQ = useQuery({ queryKey: [KEYS.karigars, 'summary'], queryFn: karigarsApi.summary });
  const rows = listQ.data ?? [];
  const holding = r3(Number(sumQ.data?.totalOutstanding?.outstandingGrams ?? 0));
  const wastage = r3(rows.reduce((s, k) => s + k.wastageGrams, 0));
  const owed = r2(rows.reduce((s, k) => s + labourDue(k), 0));
  const filtered = !!query || status !== 'active' || !!where;
  const refresh = () => [KEYS.karigars, KEYS.metal, KEYS.orders, 'jewelry-dashboard', 'cash-register', 'expenses'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const printDoc = (): PrintDoc => ({
    title: 'Karigar — sone ka hisaab',
    meta: [['Karigar', String(rows.length)], ['Un ke paas', grams(holding)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Karigar' }, { label: 'Phone', wideOnly: true }, { label: 'Diya', align: 'right' }, { label: 'Wapas', align: 'right' }, { label: 'Wastage', align: 'right', wideOnly: true }, { label: 'Baqi', align: 'right' }, { label: 'Mazdoori baqi', align: 'right' }],
      rows: rows.map((k) => [k.fullName, k.phone, String(r3(k.metalIssuedGrams)), String(r3(k.metalReturnedGrams)), String(r3(k.wastageGrams)), String(r3(k.outstandingGrams)), formatPKR(labourDue(k))]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Karigar"
        chip={<><Hammer /> Sone ka lena dena</>}
        meta="Kis karigar ko kitna sona diya, kitna wapas aaya aur kitna baqi hai"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Naya karigar (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Karigar</button>}
        </>}
        stats={[
          { label: 'Chalu karigar', value: sumQ.data?.total ?? '—' },
          { label: 'Un ke paas sona', value: grams(holding) },
          { label: 'Mazdoori baqi', value: formatPKR(owed) },
        ]}
      />

      <KpiRow cols={5}>
        <KpiCard icon={Users} color="#7c3aed" label="Dukaan ke andar" value={sumQ.data?.inHouse ?? '—'} onClick={() => setWhere(where === 'in' ? '' : 'in')} active={where === 'in'} />
        <KpiCard icon={UserRound} color="#0891b2" label="Bahar wale" value={sumQ.data?.external ?? '—'} onClick={() => setWhere(where === 'out' ? '' : 'out')} active={where === 'out'} />
        <KpiCard icon={Scale} color={holding > 0 ? '#d97706' : '#64748b'} label="Karigaron ke paas" value={grams(holding)} hint="Abhi wapas aana hai" />
        <KpiCard icon={Hammer} color="#e11d48" label="Wastage di" value={grams(wastage)} hint="In karigaron ko ab tak" />
        <KpiCard icon={Banknote} color={owed > 0 ? '#0891b2' : '#64748b'} label="Mazdoori baqi" value={formatPKR(owed)} hint="Kaam ho gaya, paise dene hain" />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, CNIC, karigar #…" label="Search" />}
        chips={filtered ? <>
          {status !== 'active' && <FilterChip onRemove={() => setStatus('active')}>{status === 'inactive' ? 'Band' : 'Sab'}</FilterChip>}
          {where && <FilterChip onRemove={() => setWhere('')}>{where === 'in' ? 'Dukaan ke andar' : 'Bahar wale'}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setStatus('active'); setWhere(''); }}>
        <FilterMenu icon={Filter} label={status === 'active' ? 'Chalu' : status === 'inactive' ? 'Band' : 'Sab'} value={status} active={status !== 'active'} onChange={setStatus}
          options={[{ value: 'active', label: 'Chalu' }, { value: 'inactive', label: 'Band' }, { value: 'all', label: 'Sab' }]} />
      </FilterBar>

      {listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" />
        : listQ.isError && !listQ.data ? <LoadFailed what="Karigar" retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={Hammer} title={filtered ? 'Is filter me koi karigar nahi' : 'Abhi koi karigar nahi'} text="Karigar ka naam aur phone likhein — phir sona dein aur zewar wapas lein, hisaab khud banta hai.">
              {canEdit && <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Pehla karigar</Button>}
            </EmptyList>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Table minWidth="64rem">
                <THead><Tr><Th>Karigar</Th><Th>Rate</Th><Th align="right">Diya</Th><Th align="right">Wapas</Th><Th align="right">Wastage</Th><Th align="right">Baqi</Th><Th align="right">Mazdoori</Th><Th align="right">Kaam</Th></Tr></THead>
                <TBody>
                  {rows.map((k) => (
                    <Tr key={k.id} className={k.isActive ? undefined : 'opacity-60'}>
                      <Td>
                        <button type="button" onClick={() => setLedger(k)} className="text-left">
                          <span className="block font-semibold text-slate-900 hover:underline">{k.fullName}</span>
                          <span className="block text-[0.75rem] text-slate-500">{k.karigarNumber} · {k.phone}{k.isInHouse ? '' : ' · bahar'}{k.isActive ? '' : ' · band'}</span>
                        </button>
                      </Td>
                      <Td className="text-[0.8125rem]">{[k.perGramRate ? `${formatPKR(k.perGramRate)}/g` : '', k.fixedRatePerPiece ? `${formatPKR(k.fixedRatePerPiece)}/piece` : ''].filter(Boolean).join(' · ') || '—'}</Td>
                      <Td align="right">{r3(k.metalIssuedGrams)}</Td>
                      <Td align="right">{r3(k.metalReturnedGrams)}</Td>
                      <Td align="right">{r3(k.wastageGrams)}{k.metalIssuedGrams > 0 && <span className="block text-[0.6875rem] text-slate-500">{Math.round((k.wastageGrams / k.metalIssuedGrams) * 1000) / 10}%</span>}</Td>
                      <Td align="right" className={k.outstandingGrams > 0 ? 'font-bold text-amber-700' : 'text-slate-500'}>{r3(k.outstandingGrams)}</Td>
                      <Td align="right">
                        <span className={labourDue(k) > 0 ? 'font-bold text-sky-700' : 'text-slate-500'}>{formatPKR(labourDue(k))}</span>
                        {k.paidLabour > 0 && <span className="block text-[0.6875rem] text-slate-500">diya {formatPKR(k.paidLabour)}</span>}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          {canMetal && k.isActive && <Button size="sm" variant="secondary" onClick={() => setMetal({ k, mode: 'issue' })} leftIcon={<ArrowUpRight className="h-4 w-4" />}>Sona dein</Button>}
                          {canMetal && k.outstandingGrams > 0 && <Button size="sm" onClick={() => setMetal({ k, mode: 'receive' })} leftIcon={<ArrowDownLeft className="h-4 w-4" />}>Wapas lein</Button>}
                          {canPay && labourDue(k) > 0 && <Button size="sm" variant="secondary" onClick={() => setLabour({ k, mode: 'pay' })} leftIcon={<Banknote className="h-4 w-4" />}>Mazdoori dein</Button>}
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => setLabour({ k, mode: 'earn' })} aria-label="Mazdoori likhein" title="Mazdoori likhein"><NotebookPen className="h-4 w-4" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => setLedger(k)} aria-label="Hisaab"><History className="h-4 w-4" /></Button>
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm(k)} aria-label="Badlein"><Pencil className="h-4 w-4" /></Button>}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}

      {form && <KarigarForm karigar={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
      {metal && <MetalModal k={metal.k} mode={metal.mode} onClose={() => setMetal(null)} onSaved={() => { setMetal(null); refresh(); }} />}
      {ledger && <LedgerModal k={ledger} onClose={() => setLedger(null)} />}
      {labour && <LabourModal k={labour.k} mode={labour.mode} onClose={() => setLabour(null)} onSaved={() => { setLabour(null); refresh(); }} />}

      {guide.isOpen && (
        <PageGuide title="Karigar — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#7c3aed', title: 'Karigar banayein', text: 'Naam, phone aur rate (fi gram ya fi piece) likhein.' },
            { icon: ArrowUpRight, color: '#d97706', title: 'Sona dein', text: 'Kitna aur kis karat ka sona diya — tijori (metal stock) se nikal kar karigar ke khate me.' },
            { icon: ArrowDownLeft, color: '#16a34a', title: 'Wapas lein', text: 'Bana hua zewar tol kar likhein, tay wastage aur bacha hua sona. Baqi khud kam hota hai.' },
            { icon: Banknote, color: '#0891b2', title: 'Mazdoori', text: 'Order ka zewar wapas aane par mazdoori rate ke hisaab se khud judti hai. Doosre kaam ki mazdoori haath se likhein; "Mazdoori dein" se paisa drawer se expense ban kar nikalta hai.' },
            { icon: History, color: '#64748b', title: 'Hisaab', text: 'Naam par click — sona, orders, repair aur mazdoori ek jagah.' },
          ]}
          tips={['Wastage % har karigar ke liye dekhein — zyada ho to baat karein.', 'Jis karigar ke paas sona baqi ho use band nahi kar sakte.']}
          shortcuts={[['N', 'naya karigar'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function KarigarForm({ karigar, onClose, onSaved }: { karigar: Karigar | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    fullName: karigar?.fullName ?? '', phone: karigar?.phone ?? '', cnic: karigar?.cnic ?? '', address: karigar?.address ?? '',
    skillLevel: karigar?.skillLevel ?? '', perGramRate: karigar?.perGramRate ? String(karigar.perGramRate) : '', fixedRatePerPiece: karigar?.fixedRatePerPiece ? String(karigar.fixedRatePerPiece) : '',
    yearsExperience: karigar?.yearsExperience ? String(karigar.yearsExperience) : '', isInHouse: karigar?.isInHouse ?? true, isActive: karigar?.isActive ?? true, notes: karigar?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        fullName: f.fullName.trim(), phone: f.phone.trim(), cnic: f.cnic.trim() || undefined, address: f.address.trim() || undefined,
        skillLevel: f.skillLevel.trim() || undefined, perGramRate: f.perGramRate ? Number(f.perGramRate) : undefined,
        fixedRatePerPiece: f.fixedRatePerPiece ? Number(f.fixedRatePerPiece) : undefined, yearsExperience: f.yearsExperience ? Number(f.yearsExperience) : undefined,
        isInHouse: f.isInHouse, isActive: f.isActive, notes: f.notes.trim() || undefined,
      };
      return karigar ? karigarsApi.update(karigar.id, body) : karigarsApi.create(body);
    },
    onSuccess: () => { toast.success(karigar ? 'Karigar update ho gaya' : 'Karigar ban gaya'); onSaved(); },
    onError: (e) => setErrors({ form: apiError(e, 'Save nahi hua') }),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.fullName.trim()) e.fullName = 'Naam likhein';
    if (!/^[\d+\-\s]{7,20}$/.test(f.phone.trim())) e.phone = 'Sahi phone number likhein';
    setErrors(e);
    if (!Object.keys(e).length) save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="lg" title={karigar ? `${karigar.fullName} — badlein` : 'Naya karigar'}
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending}>Save karein</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Naam" required autoFocus value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} error={errors.fullName} maxLength={80} />
          <Input label="Phone" required inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} placeholder="03xx xxxxxxx" />
          <Input label="CNIC" value={f.cnic} onChange={(e) => set({ cnic: e.target.value })} placeholder="35202-xxxxxxx-x" hint="Sona dene se pehle zaroor" />
          <Input label="Kaam / mahaarat" value={f.skillLevel} onChange={(e) => set({ skillLevel: e.target.value })} placeholder="Kundan, choori, polish…" />
          <Input label="Mazdoori fi gram (Rs)" inputMode="decimal" value={f.perGramRate} onChange={(e) => set({ perGramRate: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label="Mazdoori fi piece (Rs)" inputMode="decimal" value={f.fixedRatePerPiece} onChange={(e) => set({ fixedRatePerPiece: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label="Tajurba (saal)" inputMode="numeric" value={f.yearsExperience} onChange={(e) => set({ yearsExperience: e.target.value.replace(/\D/g, '') })} />
          <Input label="Pata" value={f.address} onChange={(e) => set({ address: e.target.value })} maxLength={200} />
        </div>
        <div className="flex flex-wrap gap-6">
          <Switch label="Dukaan ke andar kaam karta hai" checked={f.isInHouse} onChange={(e) => set({ isInHouse: e.target.checked })} />
          {karigar && <Switch label="Chalu" description="Band karne se history rehti hai" checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} />}
        </div>
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={300} />
        {errors.form && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{errors.form}</p>}
        <p className="text-[0.75rem] text-slate-500">Save: <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></p>
      </form>
    </Modal>
  );
}

function MetalModal({ k, mode, onClose, onSaved }: { k: Karigar; mode: 'issue' | 'receive'; onClose: () => void; onSaved: () => void }) {
  const issue = mode === 'issue';
  const [purity, setPurity] = useState<Purity>('KARAT_22');
  const [g, setG] = useState({ grams: '', piece: '', wastage: '', back: '' });
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const settled = r3((Number(g.piece) || 0) + (Number(g.wastage) || 0) + (Number(g.back) || 0));
  const save = useMutation({
    mutationFn: () => issue
      ? karigarsApi.issueMetal(k.id, { grams: Number(g.grams), purity, reference: reference.trim() || undefined, notes: notes.trim() || undefined })
      : karigarsApi.receiveMetal(k.id, { receivedGrams: Number(g.piece) || 0, wastageGrams: Number(g.wastage) || 0, returnedGrams: Number(g.back) || 0, purity, reference: reference.trim() || undefined, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success(issue ? 'Sona de diya — metal stock se nikla' : 'Wapas le liya'); onSaved(); },
    onError: (e) => setError(apiError(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (issue && !(Number(g.grams) > 0)) return setError('Kitna sona diya — grams likhein');
    if (!issue && !(settled > 0)) return setError('Wapas aane wala wazan likhein');
    if (!issue && settled > k.outstandingGrams + 0.001) return setError(`${k.fullName} ke paas sirf ${grams(k.outstandingGrams)} hai`);
    setError('');
    save.mutate();
  };
  const num = (key: keyof typeof g) => (e: ChangeEvent<HTMLInputElement>) => setG({ ...g, [key]: e.target.value.replace(/[^\d.]/g, '') });
  return (
    <Modal open onClose={onClose} title={issue ? `${k.fullName} ko sona dein` : `${k.fullName} se wapas lein`}
      description={`Abhi ${k.fullName} ke paas ${grams(k.outstandingGrams)}`}
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending}>{issue ? 'Sona dein' : 'Wapas lein'}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <ChipPicker label="Karat" value={purity} onChange={setPurity} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        {issue ? (
          <Input label="Grams" required autoFocus inputMode="decimal" value={g.grams} onChange={num('grams')} hint="Tijori se nikal kar diya" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Bana zewar (g)" autoFocus inputMode="decimal" value={g.piece} onChange={num('piece')} hint="Tol kar" />
            <Input label="Wastage (g)" inputMode="decimal" value={g.wastage} onChange={num('wastage')} hint="Jo tay hua" />
            <Input label="Bacha sona (g)" inputMode="decimal" value={g.back} onChange={num('back')} hint="Tijori me wapas" />
          </div>
        )}
        {!issue && settled > 0 && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">
            Kul {grams(settled)} — baad me {k.fullName} ke paas {grams(Math.max(k.outstandingGrams - settled, 0))}
            {Number(g.wastage) > 0 && settled > 0 ? ` · wastage ${Math.round((Number(g.wastage) / settled) * 1000) / 10}%` : ''}
          </p>
        )}
        <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Order # ya parchi" maxLength={60} />
        <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
      </form>
    </Modal>
  );
}

function LedgerModal({ k, onClose }: { k: Karigar; onClose: () => void }) {
  const q = useQuery({ queryKey: [KEYS.karigars, 'ledger', k.id], queryFn: () => karigarsApi.ledger(k.id) });
  const lab = q.data?.labour;
  return (
    <Modal open onClose={onClose} size="xl" title={`${k.fullName} — hisaab`} description={`Diya ${grams(k.metalIssuedGrams)} · wapas ${grams(k.metalReturnedGrams)} · wastage ${grams(k.wastageGrams)} · baqi ${grams(k.outstandingGrams)}`}>
      {q.isLoading ? <Skeleton className="h-48 rounded-2xl" /> : q.isError ? <LoadFailed what="Hisaab" retry={() => q.refetch()} /> : (
        <div className="space-y-4">
          {lab && (
            <section className="grid grid-cols-3 gap-2">
              {[['Mazdoori bani', lab.earned, 'text-slate-900'], ['Di gayi', lab.paid, 'text-emerald-700'], ['Baqi', lab.due, lab.due > 0 ? 'text-sky-700' : 'text-slate-500']].map(([label, v, tone]) => (
                <div key={label as string} className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70">
                  <span className="block text-[0.75rem] text-slate-500">{label}</span>
                  <span className={`block text-[1rem] font-bold tabular-nums ${tone}`}>{formatPKR(v as number)}</span>
                </div>
              ))}
            </section>
          )}
          <section>
            <h3 className="mb-2 text-[0.875rem] font-bold text-slate-900">Sone ka lena dena</h3>
            {!q.data?.metal.length ? <p className="text-[0.8125rem] text-slate-500">Abhi koi entry nahi</p> : (
              <Table minWidth="36rem">
                <THead><Tr><Th>Kab</Th><Th>Kya</Th><Th>Karat</Th><Th align="right">Grams</Th><Th>Ref</Th></Tr></THead>
                <TBody>
                  {q.data.metal.map((e) => (
                    <Tr key={e.id}><Td>{dayTime(e.entryDate)}</Td><Td>{entryLabel(e.entryType).label}</Td><Td><KaratPill purity={e.purity} /></Td>
                      <Td align="right" className={entryLabel(e.entryType).in ? 'text-emerald-700' : 'text-rose-700'}>{entryLabel(e.entryType).in ? '+' : '−'}{r3(e.grams)}</Td>
                      <Td>{[e.reference, e.notes].filter(Boolean).join(' · ') || '—'}</Td></Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-[0.875rem] font-bold text-slate-900">Orders</h3>
            {!q.data?.orders.length ? <p className="text-[0.8125rem] text-slate-500">Is karigar ko koi order nahi diya</p> : (
              <Table minWidth="36rem">
                <THead><Tr><Th>Order</Th><Th>Customer</Th><Th>Halat</Th><Th align="right">Diya</Th><Th align="right">Bana</Th><Th>Dena</Th></Tr></THead>
                <TBody>
                  {q.data.orders.map((o) => (
                    <Tr key={o.id}><Td className="font-medium">{o.orderNumber}</Td><Td>{o.customerName}</Td><Td><StatusPill status={o.status} /></Td>
                      <Td align="right">{o.metalIssuedGrams ? r3(o.metalIssuedGrams) : '—'}</Td><Td align="right">{o.metalReceivedGrams ? r3(o.metalReceivedGrams) : '—'}</Td><Td>{day(o.promisedDate)}</Td></Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
          {!!q.data?.repairs.length && (
            <section>
              <h3 className="mb-2 text-[0.875rem] font-bold text-slate-900">Repair</h3>
              <Table minWidth="36rem">
                <THead><Tr><Th>Repair</Th><Th>Customer</Th><Th>Kaam</Th><Th>Wapas</Th><Th align="right">Charges</Th></Tr></THead>
                <TBody>
                  {q.data.repairs.map((r) => (
                    <Tr key={r.id}><Td className="font-medium">{r.repairNumber}</Td><Td>{r.customerName ?? '—'}</Td><Td className="max-w-[14rem] truncate">{r.itemDescription}</Td><Td>{day(r.promisedDate)}</Td><Td align="right">{formatPKR(r.charge)}</Td></Tr>
                  ))}
                </TBody>
              </Table>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-[0.875rem] font-bold text-slate-900">Mazdoori di</h3>
            {!q.data?.payments.length ? <p className="text-[0.8125rem] text-slate-500">Abhi koi mazdoori nahi di</p> : (
              <Table minWidth="32rem">
                <THead><Tr><Th>Kab</Th><Th>Expense #</Th><Th>Note</Th><Th align="right">Amount</Th></Tr></THead>
                <TBody>
                  {q.data.payments.map((p) => (
                    <Tr key={p.id}><Td>{dayTime(p.expenseDate)}</Td><Td>{p.expenseNumber}</Td><Td>{p.description || '—'}</Td><Td align="right" className="font-semibold">{formatPKR(p.amount)}</Td></Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

/** Labour: pay what is owed (an expense from the drawer) or write labour earned on other work. */
function LabourModal({ k, mode, onClose, onSaved }: { k: Karigar; mode: 'pay' | 'earn'; onClose: () => void; onSaved: () => void }) {
  const due = labourDue(k);
  const pay = mode === 'pay';
  const [amount, setAmount] = useState(pay ? String(due) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const n = Number(amount) || 0;
  const save = useMutation({
    // Resolves to the expense number when labour is paid, null when it is only written.
    mutationFn: async (): Promise<string | null> => {
      if (!pay) { await karigarsApi.recordLabour(k.id, n); return null; }
      const res = await karigarsApi.payLabour(k.id, { amount: n, paymentMethod: method, note: note.trim() || undefined });
      return res.expense.expenseNumber;
    },
    onSuccess: (expenseNumber) => {
      toast.success(expenseNumber ? `Mazdoori di — expense ${expenseNumber}` : 'Mazdoori likh di');
      onSaved();
    },
    onError: (e) => setError(apiError(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (!(n > 0)) return setError('Amount likhein');
    if (pay && n > due + 0.01) return setError(`Baqi sirf ${formatPKR(due)} hai`);
    setError('');
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} title={pay ? `${k.fullName} ko mazdoori` : `${k.fullName} ki mazdoori likhein`}
      description={pay ? `Bani ${formatPKR(k.totalEarnings)} · di ${formatPKR(k.paidLabour)} · baqi ${formatPKR(due)}` : 'Order ke ilawa kaam (repair, polish) ki mazdoori — baqi me judti hai'}
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending}>{pay ? `Dein · ${formatPKR(n)}` : 'Likh dein'}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <Input label="Amount (Rs)" required autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
        {pay && <PaymentMethodPicker value={method} onChange={setMethod} label="Kaise di" />}
        {pay && <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Jaise: order JCO-0007 ki mazdoori" />}
        {pay && <p className="text-[0.75rem] text-slate-500">Yeh Expense me "Karigar mazdoori" ke taur par jata hai — cash ho to drawer se nikalta hai.</p>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
      </form>
    </Modal>
  );
}
