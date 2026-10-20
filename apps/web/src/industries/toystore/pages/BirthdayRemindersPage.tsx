/**
 * Children's birthdays: the shop keeps each child's birth date and the
 * parent's number, and a week before the day sends the parent a WhatsApp
 * with gift ideas. Turning off a reminder keeps the child's record and
 * gift history.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, Cake, GraduationCap, MessageCircle, Pencil, Plus, Power, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, SkeletonTable, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton } from '@core/print';
import { waLink } from '@core/lib/whatsapp/templates';
import { toyBirthdaysApi, type ToyBirthdayReminder } from '../api/birthday-reminders.api';
import { GENDERS, KEYS, apiError, labelOf } from '../lib/meta';
import { ConfirmModal, EmptyBox, usePageKeys, useSaveKey } from '../components/ui';

type Tab = 'soon' | 'all' | 'off';

const whenText = (d: number) => (d === 0 ? 'Aaj' : d === 1 ? 'Kal' : `${d} din baad`);
const dob = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** WhatsApp text for the parent before the birthday. */
export function reminderText(r: ToyBirthdayReminder, shop?: string) {
  const days = r.computed?.daysUntilBirthday ?? 0;
  return `Assalam o Alaikum ${r.customerName}! ${r.childName} ki saalgirah ${days === 0 ? 'aaj' : days === 1 ? 'kal' : `${days} din baad`} hai — ${r.computed?.turningAge ?? ''} saal ke ho rahe hain. 🎂 Un ki umar ke naye khilone aur gift packs${shop ? ` ${shop} par` : ''} aa gaye hain. Gift wrap bhi hota hai.`;
}

export default function BirthdayRemindersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('soon');
  const [form, setForm] = useState<ToyBirthdayReminder | 'new' | null>(null);
  const [off, setOff] = useState<ToyBirthdayReminder | null>(null);

  const listQ = useQuery({ queryKey: [KEYS.birthdays, 'all'], queryFn: () => toyBirthdaysApi.list() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const days = (r: ToyBirthdayReminder) => r.computed?.daysUntilBirthday ?? 999;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => (tab === 'off' ? !r.isActive : r.isActive && (tab === 'all' || days(r) <= 30))
      && (!q || [r.childName, r.customerName, r.customerPhone].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const active = all.filter((r) => r.isActive);
  const week = active.filter((r) => days(r) <= 7);
  const due = active.filter((r) => days(r) <= r.reminderDaysBefore && (!r.lastReminderSent || Date.now() - new Date(r.lastReminderSent).getTime() > 30 * 86_400_000));

  const refresh = () => qc.invalidateQueries({ queryKey: [KEYS.birthdays] });
  const sent = useMutation({ mutationFn: (r: ToyBirthdayReminder) => toyBirthdaysApi.markReminderSent(r.id), onSuccess: refresh });
  const switchOff = useMutation({
    mutationFn: (r: ToyBirthdayReminder) => toyBirthdaysApi.remove(r.id),
    onSuccess: () => { refresh(); setOff(null); toast.success('Yaad dihani band — record mehfooz hai'); },
    onError: (e) => toast.error(apiError(e, 'Band nahi hua')),
  });

  const remind = (r: ToyBirthdayReminder) => {
    const link = waLink(r.customerPhone, reminderText(r));
    if (!link) { toast.error('Phone number sahi nahi'); return; }
    window.open(link, '_blank', 'noopener');
    if (canEdit) sent.mutate(r);
  };

  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  const doc = () => ({
    title: 'Bachon ki saalgirah',
    subtitle: tab === 'soon' ? 'Agle 30 din' : tab === 'off' ? 'Band' : 'Sab',
    sections: [{
      kind: 'table' as const,
      columns: [{ label: 'Bacha' }, { label: 'Walid / walida' }, { label: 'Phone' }, { label: 'Saalgirah' }, { label: 'Umar', align: 'right' as const }],
      rows: rows.map((r) => [r.childName, r.customerName, r.customerPhone, `${dob(r.childBirthDate)} · ${whenText(days(r))}`, String(r.computed?.turningAge ?? '')]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Saalgirah"
        chip={<><Cake /> Bachon ki birthday</>}
        meta="Saalgirah se pehle walidain ko WhatsApp — gift yahin se"
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Naya bacha (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Bacha</button>}
        </>}
        stats={[{ label: 'Bachay', value: active.length }, { label: 'Is hafte', value: week.length }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Cake} color="#db2777" label="Agle 30 din" value={active.filter((r) => days(r) <= 30).length} onClick={() => setTab('soon')} active={tab === 'soon'} />
        <KpiCard icon={Bell} color="#d97706" label="Message bhejna hai" value={due.length} hint="Yaad dihani ka waqt" onClick={() => setTab('soon')} />
        <KpiCard icon={Users} color="#0891b2" label="Sab bachay" value={active.length} onClick={() => setTab('all')} active={tab === 'all'} />
        <KpiCard icon={Power} color="#64748b" label="Band" value={all.length - active.length} onClick={() => setTab('off')} active={tab === 'off'} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'soon', label: 'Qareeb' }, { id: 'all', label: 'Sab' }, { id: 'off', label: 'Band' }]} value={tab} onChange={setTab}
        right={<PrintButton doc={doc} disabled={!rows.length} size="sm" />} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Bachay ya walid ka naam, phone" label="Search" />} />

      {listQ.isLoading ? <SkeletonTable /> : rows.length === 0 ? (
        <EmptyBox icon={Cake} title={search ? 'Koi nahi mila' : tab === 'soon' ? 'Agle 30 din me koi saalgirah nahi' : 'Abhi koi bacha nahi'}
          text="Bill ke waqt walidain se bachay ki paidaish ki tareekh pooch kar likh lein — saalgirah se pehle message bhej kar gift yahin se bikta hai."
          action={canEdit && !search ? <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Bacha jorein</Button> : undefined} />
      ) : (
        <Table minWidth="52rem">
          <THead><Tr><Th>Bacha</Th><Th>Walid / walida</Th><Th>Saalgirah</Th><Th align="right">Gift</Th><Th align="right">{' '}</Th></Tr></THead>
          <TBody>
            {rows.map((r) => {
              const d = days(r);
              return (
                <Tr key={r.id} interactive onClick={() => navigate(`/toystore/birthdays/${r.id}`)}>
                  <Td>
                    <p className="font-medium text-slate-900">{r.childName}</p>
                    <p className="text-[0.75rem] text-slate-500">{[labelOf(GENDERS, r.childGender), `${Math.floor(r.computed?.currentAge ?? 0)} saal`].filter(Boolean).join(' · ')}</p>
                  </Td>
                  <Td><p>{r.customerName}</p><p className="text-[0.75rem] tabular-nums text-slate-500">{r.customerPhone}</p></Td>
                  <Td>
                    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ring-1', d <= 7 ? 'bg-pink-50 text-pink-700 ring-pink-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}>{whenText(d)}</span>
                    <p className="mt-0.5 text-[0.75rem] text-slate-500">{dob(r.childBirthDate)} · {r.computed?.turningAge} saal ka</p>
                  </Td>
                  <Td align="right" className="text-[0.8125rem]">{r.lastGiftGiven ? <span className="text-slate-700">{r.lastGiftGiven}</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {r.isActive && <button type="button" onClick={() => remind(r)} title="WhatsApp" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />Message</button>}
                      {canEdit && <button type="button" onClick={() => setForm(r)} aria-label="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                      {canEdit && r.isActive && <button type="button" onClick={() => setOff(r)} aria-label="Band karein" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Power className="h-4 w-4" /></button>}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> naya bacha · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {form && <BirthdayForm value={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { refresh(); setForm(null); }} />}
      {off && (
        <ConfirmModal title={`${off.childName} ki yaad dihani band karein?`} confirm="Band karein" danger pending={switchOff.isPending}
          text="Message ki list se hat jayega. Bachay ka record aur gift ki history rahegi."
          onConfirm={() => switchOff.mutate(off)} onClose={() => setOff(null)} />
      )}
      {guide.isOpen && (
        <PageGuide title="Saalgirah — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: 'Bacha jorein', text: 'Walid ka naam, phone aur bachay ki paidaish ki tareekh. Kitne din pehle yaad dilana hai wo bhi.' },
            { icon: MessageCircle, color: '#16a34a', title: 'Message', text: '"Message" WhatsApp kholta hai — umar ke hisaab se khilone aur gift pack ka message tayyar hota hai.' },
            { icon: Cake, color: '#d97706', title: 'Gift', text: 'Bachay ko kholein — us ki umar ke khilone aur pack nazar aate hain. Gift bikne ke baad "Gift likhein".' },
          ]}
          shortcuts={[['N', 'naya bacha'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

interface Draft { childName: string; childBirthDate: string; childGender: string; customerName: string; customerPhone: string; parentRelation: string; budgetRange: string; reminderDaysBefore: string; notes: string }

/** Add or change a child; used here and on the child's page. */
export function BirthdayForm({ value, onClose, onSaved }: { value: ToyBirthdayReminder | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => ({
    childName: value?.childName ?? '', childBirthDate: value?.childBirthDate?.slice(0, 10) ?? '', childGender: value?.childGender ?? '',
    customerName: value?.customerName ?? '', customerPhone: value?.customerPhone ?? '', parentRelation: value?.parentRelation ?? '',
    budgetRange: value?.budgetRange ?? '', reminderDaysBefore: String(value?.reminderDaysBefore ?? 7), notes: value?.notes ?? '',
  }));
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const problem = !d.childName.trim() ? 'Bachay ka naam likhein'
    : !d.childBirthDate ? 'Paidaish ki tareekh chunein'
      : d.childBirthDate > today ? 'Paidaish ki tareekh aage ki nahi ho sakti'
        : !d.customerName.trim() ? 'Walid / walida ka naam likhein'
          : d.customerPhone.replace(/\D/g, '').length < 10 ? 'Phone number poora likhein'
            : !(Number(d.reminderDaysBefore) >= 0 && Number(d.reminderDaysBefore) <= 60) ? 'Yaad dihani 0 se 60 din pehle' : null;
  const save = useMutation({
    mutationFn: () => {
      if (problem) throw new Error(problem);
      const body = {
        childName: d.childName.trim(), childBirthDate: d.childBirthDate, childGender: d.childGender || undefined, customerName: d.customerName.trim(),
        customerPhone: d.customerPhone.trim(), parentRelation: d.parentRelation.trim() || undefined, budgetRange: d.budgetRange.trim() || undefined,
        reminderDaysBefore: Math.round(Number(d.reminderDaysBefore) || 7), notes: d.notes.trim() || undefined,
      };
      return value ? toyBirthdaysApi.update(value.id, body) : toyBirthdaysApi.create(body);
    },
    onSuccess: () => { toast.success(value ? 'Save ho gaya' : 'Bacha jur gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e, (e as Error).message || 'Save nahi hua')),
  });
  useSaveKey(() => { if (!save.isPending) save.mutate(); });
  return (
    <Modal open onClose={onClose} size="lg" title={value ? `${value.childName} — badlein` : 'Naya bacha'} description="Saalgirah se pehle walidain ko message jata hai"
      footer={<>
        {problem && (d.childName || d.customerName) ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : <span className="mr-auto hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{value ? 'Save karein' : 'Jorein'}</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Bachay ka naam" required value={d.childName} onChange={(e) => set({ childName: e.target.value })} placeholder="Ayaan" autoFocus />
        <Input label="Paidaish ki tareekh" required type="date" max={today} value={d.childBirthDate} onChange={(e) => set({ childBirthDate: e.target.value })} hint="Isi se umar aur saalgirah ka din" />
        <Select label="Bacha / bachi" value={d.childGender} onChange={(e) => set({ childGender: e.target.value })} options={[{ value: '', label: '—' }, { value: 'BOYS', label: 'Larka' }, { value: 'GIRLS', label: 'Larki' }]} hint="Gift ke mashwaray ke liye" />
        <Input label="Budget" value={d.budgetRange} onChange={(e) => set({ budgetRange: e.target.value })} placeholder="1000-3000" hint="Is se mehnge khilone mashwaray me nahi aate" />
        <Input label="Walid / walida ka naam" required value={d.customerName} onChange={(e) => set({ customerName: e.target.value })} placeholder="Imran Khan" />
        <Input label="WhatsApp number" required inputMode="tel" value={d.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} placeholder="03001234567" />
        <Input label="Rishta" value={d.parentRelation} onChange={(e) => set({ parentRelation: e.target.value })} placeholder="Walid, mamu, phuppo" hint="Marzi hai" />
        <Input label="Kitne din pehle yaad dilayein" inputMode="numeric" value={d.reminderDaysBefore} onChange={(e) => set({ reminderDaysBefore: e.target.value.replace(/\D/g, '') })} hint="Aam tor par 7 din" />
        <Input label="Note" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Cars pasand hain" wrapperClassName="sm:col-span-2" hint="Marzi hai" />
      </div>
    </Modal>
  );
}
