/**
 * Authors: writers the shop's books are linked to, so a customer asking
 * for "Mustansar Hussain Tarar ki koi kitab" is found by name on the
 * products page and at the counter. Featured authors come first.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, GraduationCap, Pencil, Plus, Power, Star, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { authorsApi, type Author } from '../api/authors.api';
import { KEYS, LANGUAGES, apiError } from '../lib/meta';
import { ConfirmModal, EmptyBox, cardAction, cardDanger, cardLink, usePageKeys, useSaveKey } from '../components/ui';

type Tab = 'active' | 'off';

export default function AuthorsPage() {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('active');
  const [form, setForm] = useState<Author | 'new' | null>(null);
  const [off, setOff] = useState<Author | null>(null);

  const listQ = useQuery({ queryKey: [KEYS.authors, 'all'], queryFn: () => authorsApi.list() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((a) => (tab === 'active' ? a.isActive : !a.isActive) && (!q || [a.name, a.penName, a.nationality].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const active = all.filter((a) => a.isActive);
  const books = active.reduce((s, a) => s + (a._count?.bookAuthors ?? 0), 0);

  const refresh = () => { void qc.invalidateQueries({ queryKey: [KEYS.authors] }); void qc.invalidateQueries({ queryKey: [KEYS.facts] }); };
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<Author> }) => (id ? authorsApi.update(id, body) : authorsApi.create(body)),
    onSuccess: () => { toast.success('Author save ho gaya'); setForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const feature = useMutation({
    mutationFn: (a: Author) => authorsApi.toggleFeatured(a.id),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const toggle = useMutation({
    mutationFn: (a: Author) => (a.isActive ? authorsApi.remove(a.id) : authorsApi.update(a.id, { name: a.name, isActive: true })),
    onSuccess: (_r, a) => { toast.success(a.isActive ? `${a.name} band` : `${a.name} chalu`); setOff(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  return (
    <PageShell>
      <PageHero
        title="Authors"
        chip={<><Users /> Likhne wale</>}
        meta="Kitab author ke naam se bhi dhoondi jati hai"
        loading={listQ.isLoading}
        actions={<>
          <Link to="/bookstore/books" className={heroButton}><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Kitaben</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Naya author (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Author</button>}
        </>}
        stats={[{ label: 'Author', value: active.length }, { label: 'Kitaben jori', value: books }]}
      />

      <KpiRow cols={3}>
        <KpiCard icon={Users} color="#2563eb" label="Chalu author" value={active.length} hint={`${all.length - active.length} band`} />
        <KpiCard icon={Star} color="#d97706" label="Khaas (featured)" value={active.filter((a) => a.isFeatured).length} hint="List me upar" />
        <KpiCard icon={BookOpen} color="#0891b2" label="Kitaben jori hui" value={books} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'active', label: 'Chalu', count: active.length }, { id: 'off', label: 'Band', count: all.length - active.length }]} value={tab} onChange={setTab} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam ya qalami naam" label="Search" />} />

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <EmptyBox icon={Users} title={search ? 'Koi author nahi mila' : 'Abhi koi author nahi'}
            text="Author yahan banayein ya kitab banate waqt naam likh kar 'Naya' dabayein."
            action={canEdit && !search && tab === 'active' ? <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Author banayein</Button> : undefined} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((a) => (
              <li key={a.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[1rem] font-bold text-violet-700">{a.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{a.name}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[a.penName && `"${a.penName}"`, a.nationality, a.languages.join(', ')].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <button type="button" disabled={!canEdit} onClick={() => feature.mutate(a)} aria-label={a.isFeatured ? 'Khaas se hatayein' : 'Khaas banayein'}
                    className={cn('rounded-lg p-1.5', a.isFeatured ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400')}><Star className={cn('h-5 w-5', a.isFeatured && 'fill-current')} /></button>
                </div>
                <p className="mt-3 text-[0.8125rem] text-slate-600"><BookOpen className="mr-1 inline h-3.5 w-3.5" />{a._count?.bookAuthors ?? 0} kitaben</p>
                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setForm(a)} className={cardAction}><Pencil className="h-3.5 w-3.5" />Badlein</button>
                    {a.isActive
                      ? <button type="button" onClick={() => setOff(a)} className={`ml-auto ${cardDanger}`}><Power className="h-3.5 w-3.5" />Band</button>
                      : <button type="button" onClick={() => toggle.mutate(a)} className={`ml-auto ${cardLink}`}><Power className="h-3.5 w-3.5" />Chalu</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {form && <AuthorModal author={form === 'new' ? null : form} pending={save.isPending} onSave={(body) => save.mutate({ id: form === 'new' ? undefined : form.id, body })} onClose={() => setForm(null)} />}
      {off && <ConfirmModal title={`${off.name} band karein?`} text="Kitab banate waqt ye author nahi dikhega; jin kitabon par laga hai un par rahega." confirm="Band karein" danger pending={toggle.isPending} onConfirm={() => toggle.mutate(off)} onClose={() => setOff(null)} />}

      {guide.isOpen && (
        <PageGuide title="Authors — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Users, color: '#2563eb', title: 'Author', text: 'Naam aur qalami naam likhein. Kitab ke editor me author chunne se POS par us ke naam se kitab milti hai.' },
            { icon: Star, color: '#d97706', title: 'Khaas', text: 'Sitara dabane se author list me upar aata hai — jin ki kitaben zyada bikti hain.' },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function AuthorModal({ author, pending, onSave, onClose }: { author: Author | null; pending: boolean; onSave: (v: Partial<Author>) => void; onClose: () => void }) {
  const [name, setName] = useState(author?.name ?? '');
  const [penName, setPenName] = useState(author?.penName ?? '');
  const [nationality, setNationality] = useState(author?.nationality ?? 'Pakistani');
  const [languages, setLanguages] = useState<string[]>(author?.languages ?? ['Urdu']);
  const [tried, setTried] = useState(false);
  const submit = () => {
    setTried(true);
    if (!name.trim() || pending) return;
    onSave({ name: name.trim(), penName: penName.trim() || undefined, nationality: nationality.trim() || undefined, languages });
  };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="md" title={author ? `${author.name} — badlein` : 'Naya author'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={pending}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Naam" required autoFocus value={name} onChange={(e) => setName(e.target.value)} error={tried && !name.trim() ? 'Naam likhein' : undefined} placeholder="Jaise: Ashfaq Ahmed" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Qalami naam" value={penName} onChange={(e) => setPenName(e.target.value)} placeholder="Marzi hai" />
          <Input label="Mulk" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Pakistani" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Zubaan</span>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button key={l} type="button" aria-pressed={languages.includes(l)} onClick={() => setLanguages(languages.includes(l) ? languages.filter((x) => x !== l) : [...languages, l])}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', languages.includes(l) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>{l}</button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
