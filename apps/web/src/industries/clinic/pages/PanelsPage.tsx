/**
 * Panels: companies that pay for their staff's visits. Each panel has a
 * credit limit; its fee bills go on its own khata (made on the first bill),
 * so payments and the statement come from the shared khata. Panels are
 * switched off, never deleted, so old bills keep their name.
 */

import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, Building2, GraduationCap, Pencil, Plus, Power, ShieldPlus, Users } from 'lucide-react';
import {
  Badge, Button, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, Table, TBody, THead, Td, Th, Tr,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { panelsApi, type PanelRow } from '../api/panels.api';
import { ListCard, ListFailed, ListLoading } from '../components/ListBits';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { apiError } from '../lib/meta';

function PanelModal({ panel, onClose, onSaved }: { panel: PanelRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(panel?.name ?? '');
  const [limit, setLimit] = useState(panel ? String(panel.creditLimit) : '');
  const [tried, setTried] = useState(false);
  const errors = {
    name: name.trim().length < 2 ? 'Company ka naam likhein' : undefined,
    limit: limit.trim() !== '' && !(Number(limit) >= 0) ? 'Sahi amount likhein' : undefined,
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), creditLimit: Number(limit) || 0 };
      return panel ? panelsApi.update(panel.id, body) : panelsApi.create(body);
    },
    onSuccess: () => { toast.success(panel ? 'Panel update ho gaya' : 'Panel jur gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setTried(true); if (!Object.values(errors).some(Boolean)) save.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title={panel ? `${panel.name} — badlein` : 'Naya panel'} description="Company jo apne staff ki fees deti hai"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="panel-form" loading={save.isPending}>Save (Ctrl+S)</Button></div>}>
      <form id="panel-form" onSubmit={submit} className="grid gap-3"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <Input label="Company ka naam" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Crescent Textile, State Life…" error={tried ? errors.name : undefined} />
        <Input label="Credit limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0 = koi had nahi"
          hint="Is se zyada udhaar par counter rules lagte hain (PIN ya rok)" error={tried ? errors.limit : undefined} />
      </form>
    </Modal>
  );
}

export default function PanelsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.KHATA_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [editing, setEditing] = useState<PanelRow | 'new' | null>(null);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canManage && setEditing('new') });

  const list = useQuery({ queryKey: ['clinic-panels', 'page', q, status], queryFn: () => panelsApi.list({ search: q || undefined, status }), placeholderData: (p) => p });
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinic-panels'] });
  const toggle = useMutation({
    mutationFn: (p: PanelRow) => panelsApi.update(p.id, { isActive: !p.isActive }),
    onSuccess: (p) => { toast.success(p.isActive ? `${p.name} phir chalu` : `${p.name} band — purane bill aur khata mehfooz hain`); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const data = list.data;

  return (
    <PageShell>
      {editing && <PanelModal panel={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {guide.isOpen && (
        <PageGuide title="Panels — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Building2, color: '#2563eb', title: 'Panel jorein', text: 'Company ka naam aur credit limit. Mareez ke record me panel chunein.' },
            { icon: ShieldPlus, color: '#0891b2', title: 'Fees', text: 'Panel wale mareez ki fees company ke khata me jati hai, mareez ke nahi. Bill par mareez ka naam likha hota hai.' },
            { icon: BookOpen, color: '#16a34a', title: 'Wasooli', text: 'Panel kholein: har bill aur payment ki statement, payment lein aur receipt print karein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya panel'], ['G', 'guide']]} />
      )}

      <PageHero title="Panels" chip={<><Building2 />{data?.summary.panels ?? 0} {status === 'active' ? 'chalu' : 'band'}</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading}
        meta="Company / insurance jo mareez ki fees deti hai"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya panel</button>}
        </>} />

      <KpiRow cols={3}>
        {list.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Building2} color="#2563eb" label="Panels" value={data?.summary.panels ?? 0} />
            <KpiCard icon={BookOpen} color="#d97706" label="Companies par baqi" value={money(data?.summary.due ?? 0)} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Limit se upar" value={data?.summary.overLimit ?? 0} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Company ka naam…" />}>
        <Segmented<'active' | 'inactive'> value={status} onChange={setStatus} label="Kaun" items={[{ value: 'active', label: 'Chalu' }, { value: 'inactive', label: 'Band' }]} />
      </FilterBar>

      <ListCard>
        {list.isLoading ? <ListLoading rows={3} /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : !data?.items.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Building2 className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{status === 'inactive' ? 'Koi band panel nahi' : 'Abhi koi panel nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Jo company apne staff ki fees deti hai, use panel bana kar jorein.</p>
            {canManage && status === 'active' && <Button className="mt-4" onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya panel</Button>}
          </div>
        ) : (
          <Table minWidth="48rem">
            <THead><Tr><Th>Panel</Th><Th align="right">Mareez</Th><Th align="right">Credit limit</Th><Th align="right">Baqi</Th><Th align="right" /></Tr></THead>
            <TBody>
              {data.items.map((p) => {
                const over = p.creditLimit > 0 && p.balance > p.creditLimit;
                return (
                  <Tr key={p.id} interactive onClick={() => navigate(`/clinic/panels/${p.id}`)} className={cn(!p.isActive && 'opacity-60')}>
                    <Td><p className="font-semibold text-slate-900">{p.name}</p>{!p.customerId && <p className="text-[0.75rem] text-slate-500">Pehle bill par khata banega</p>}</Td>
                    <Td align="right"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400" />{p.patients}</span></Td>
                    <Td align="right">{p.creditLimit > 0 ? money(p.creditLimit) : 'Had nahi'}</Td>
                    <Td align="right">
                      <p className={cn('font-semibold', p.balance > 0 ? 'text-amber-700' : 'text-slate-900')}>{money(p.balance)}</p>
                      {over && <Badge size="xs" variant="danger">Limit se upar</Badge>}
                    </Td>
                    <Td align="right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Link to={`/clinic/panels/${p.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50"><BookOpen className="h-3.5 w-3.5" />Statement</Link>
                        {canManage && <button type="button" onClick={() => setEditing(p)} title="Badlein" aria-label="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                        {canManage && <button type="button" onClick={() => toggle.mutate(p)} title={p.isActive ? 'Band karein' : 'Chalu karein'} aria-label={p.isActive ? 'Band karein' : 'Chalu karein'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Power className="h-4 w-4" /></button>}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </ListCard>
    </PageShell>
  );
}
