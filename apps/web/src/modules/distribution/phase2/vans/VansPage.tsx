/**
 * Vans: each van that sells on the route from its own stock, with its
 * salesman, godown and route, whether its day is open, today's spot sales
 * and the stock on it. Add or edit a van here; open one for its day.
 *
 * Keys: N new · ↑↓ move · Enter open.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Plus, RefreshCw, Truck } from 'lucide-react';
import {
  Button, Input, Kbd, Modal, PageHero, PageShell, Select, Skeleton, Switch, Table, TBody, Td, Th, THead, Tr, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen } from '@core/lib/shortcuts';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { DIST_KEY, distError, distributionApi } from '../../api/distribution.api';
import { phase2Api, type SaveVan, type VanRow } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { Empty, Pill } from '../../components/parts';
import { useMoney } from '../../hooks/useDistribution';
import { dayKeyLabel, typingInField } from '../../lib/meta';
import { useTeam } from '../../setup/routes/useTeam';
import { t } from '@core/i18n';

export const VANS_KEY = [DIST_KEY, 'vans'] as const;

export default function VansPage() {
  return <DistributionGate><Vans /></DistributionGate>;
}

function Vans() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const money = useMoney();
  const [editing, setEditing] = useState<VanRow | 'new' | null>(null);
  const [cursor, setCursor] = useState(0);
  const q = useQuery({ queryKey: [...VANS_KEY, 'list'], queryFn: phase2Api.vans });
  const vans = q.data?.vans ?? [];

  const save = useMutation({
    mutationFn: (body: SaveVan) => (editing && editing !== 'new' ? phase2Api.updateVan(editing.id, body) : phase2Api.createVan(body)),
    onSuccess: (v) => {
      toast.success(editing === 'new' ? t('{{name}} ban gayi', { name: v.name }) : t('Save ho gaya'));
      qc.invalidateQueries({ queryKey: VANS_KEY });
      const wasNew = editing === 'new';
      setEditing(null);
      if (wasNew) navigate(`/distribution/vans/${v.id}`);
    },
    onError: (e) => toast.error(distError(e, t('Van save nahi hui'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditing('new'); }
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(c + 1, vans.length - 1)); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === 'Enter' && vans[cursor]) navigate(`/distribution/vans/${vans[cursor].id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vans, cursor, navigate]);

  const out = vans.filter((v) => v.session);
  const stockValue = vans.reduce((s, v) => s + v.stock.value, 0);
  const salesToday = out.reduce((s, v) => s + (v.session?.salesValue ?? 0), 0);

  return (
    <PageShell>
      <PageHero
        back="/distribution" backLabel={t('Distribution')}
        title={t('Vans')}
        chip={<><Truck /> {' '}{t('Van sales')}</>}
        meta={t('Van par maal load karein, route par spot Invoice, shaam ko ginti aur maal wapas godown')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => void q.refetch()} title={t('Refresh')} aria-label={t('Taaza karein')} className={heroIconButton}><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={() => setEditing('new')} title={t('New van (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">{t('New van')}</span></button>
        </>}
        stats={[
          { label: t('Vans'), value: q.data ? String(vans.filter((v) => v.isActive).length) : '—' },
          { label: t('Aaj route par'), value: q.data ? String(out.length) : '—' },
          { label: t('Aaj ki sale'), value: q.data ? money(salesToday) : '—' },
          { label: t('Vans par maal'), value: q.data ? money(stockValue) : '—', hint: t('cost par') },
        ]}
      />

      <div className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 lg:flex"><Kbd>N</Kbd> {' '}{t('nayi van ·')}{' '} <Kbd>↑</Kbd><Kbd>↓</Kbd> {' '}{t('chunein ·')}{' '} <Kbd>Enter</Kbd> {' '}{t('kholein')}</div>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : !vans.length ? <Empty icon={<Truck className="h-5 w-5" />} text={t('Abhi koi van nahi. Van banayein — us ka apna stock (warehouse) ban jata hai, godown se load hota hai.')}
            action={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>{t('New van')}</Button>} />
            : <>
              <div className="hidden overflow-x-auto md:block">
                <Table minWidth="52rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr>
                      <Th className="px-4 py-2 sm:px-5">{t('Van')}</Th>
                      <Th className="px-3 py-2">{t('Salesman · Route')}</Th>
                      <Th className="px-3 py-2">{t('Godown')}</Th>
                      <Th className="px-3 py-2">{t('Aaj')}</Th>
                      <Th className="px-3 py-2 text-end">{t('Aaj ki sale')}</Th>
                      <Th className="px-3 py-2 text-end">{t('Van par maal')}</Th>
                      <Th className="px-4 py-2 sm:px-5" />
                    </Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {vans.map((v, i) => (
                      <Tr key={v.id} onClick={() => navigate(`/distribution/vans/${v.id}`)}
                        className={cn('cursor-pointer hover:bg-slate-50/80', i === cursor && 'bg-brand-50/50 shadow-[inset_3px_0_0] shadow-brand-500', !v.isActive && 'opacity-60')}>
                        <Td className="px-4 py-2.5 sm:px-5">
                          <div className="font-semibold text-slate-900">{v.name}</div>
                          <div className="text-[0.75rem] text-slate-500">{v.vehicleNo ?? '—'}</div>
                        </Td>
                        <Td className="px-3 py-2.5">
                          <div className="text-slate-800">{v.salesmanName ?? <span className="text-slate-400">{t('Salesman nahi')}</span>}</div>
                          <div className="text-[0.75rem] text-slate-500">{v.routeName ?? t('Koi route nahi')}</div>
                        </Td>
                        <Td className="px-3 py-2.5 text-slate-700">{v.homeShopName ?? <span className="text-amber-700">{t('Godown set karein')}</span>}</Td>
                        <Td className="px-3 py-2.5">
                          {!v.isActive ? <Pill tone="slate">{t('Band')}</Pill>
                            : v.session ? <Pill tone="orange">{t('Route par · {{dayKey}}', { dayKey: dayKeyLabel(v.session.dayKey) })}</Pill> : <Pill tone="slate">{t('Khadi hai')}</Pill>}
                        </Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">
                          {v.session ? <><div className="font-semibold text-slate-900">{money(v.session.salesValue)}</div><div className="text-[0.6875rem] text-slate-500">{t('{{sales}} invoices', { sales: v.session.sales })}</div></> : <span className="text-slate-400">—</span>}
                        </Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">
                          <div className="text-slate-900">{money(v.stock.value)}</div>
                          <div className="text-[0.6875rem] text-slate-500">{t('{{lines}} items', { lines: v.stock.lines })}</div>
                        </Td>
                        <Td className="px-4 py-2.5 text-end sm:px-5" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditing(v)}>{t('Edit')}</Button>
                            <ArrowRight className="h-4 w-4 text-slate-300 rtl-flip" />
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {vans.map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={() => navigate(`/distribution/vans/${v.id}`)} className="block w-full px-4 py-3 text-start">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[0.875rem] font-semibold text-slate-900">{v.name} <span className="font-normal text-slate-500">· {v.vehicleNo ?? '—'}</span></span>
                        {v.session ? <Pill tone="orange">{t('Route par')}</Pill> : <Pill tone="slate">{v.isActive ? t('Khadi hai') : t('Band')}</Pill>}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{[v.salesmanName, v.routeName, v.homeShopName].filter(Boolean).join(' · ')}</span>
                      <span className="mt-1 flex items-center justify-between text-[0.8125rem]">
                        <span className="tabular-nums text-slate-900">{t('Maal {{value}}', { value: money(v.stock.value) })}</span>
                        {v.session && <span className="font-semibold tabular-nums text-slate-900">{t('Sale {{salesValue}}', { salesValue: money(v.session.salesValue) })}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>}
      </section>

      {editing && <VanFormModal van={editing === 'new' ? null : editing} saving={save.isPending} onClose={() => setEditing(null)} onSave={(b) => save.mutate(b)} />}
    </PageShell>
  );
}

export function VanFormModal({ van, saving, onClose, onSave }: {
  van: Pick<VanRow, 'name' | 'vehicleNo' | 'homeShopId' | 'salesmanId' | 'routeId' | 'isActive' | 'note' | 'shopId'> | null; saving: boolean; onClose: () => void; onSave: (b: SaveVan) => void;
}) {
  const teamQ = useTeam();
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const [name, setName] = useState(van?.name ?? '');
  const [vehicleNo, setVehicleNo] = useState(van?.vehicleNo ?? '');
  const [homeShopId, setHomeShopId] = useState(van?.homeShopId ?? '');
  const [salesmanId, setSalesmanId] = useState(van?.salesmanId ?? '');
  const [routeId, setRouteId] = useState(van?.routeId ?? '');
  const [isActive, setActive] = useState(van?.isActive ?? true);
  const [note, setNote] = useState(van?.note ?? '');

  // A van's own stock location is a warehouse too; it cannot be its own godown.
  const shops = (shopsQ.data ?? []).filter((s) => (s.isActive || s.id === homeShopId) && s.id !== van?.shopId && !s.name.startsWith('Van: '));
  const team = (teamQ.data ?? []).filter((m) => m.isActive || m.id === salesmanId);
  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), vehicleNo: vehicleNo.trim() || undefined, homeShopId: homeShopId || null, salesmanId: salesmanId || null,
      routeId: routeId || null, note: note.trim() || undefined, ...(van && { isActive }),
    });
  };

  return (
    <Modal open onClose={onClose} size="md" title={van ? t('{{name}} — Edit', { name: van.name }) : t('New van')}
      description={t('Van ka apna stock hota hai. Godown se load hoti hai aur shaam ko bacha maal wapas wahi jata hai.')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
        <Button data-save-action loading={saving} disabled={!name.trim()} onClick={submit}>{van ? t('Save') : t('Create van')}</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <Input label={t('Naam')} required autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t('Van 1 - Shadman')} />
          <Input label={t('Gaari no.')} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} maxLength={30} placeholder={t('LES-1234')} />
        </div>
        <Select label={t('Godown (load / unload)')} value={homeShopId} onChange={(e) => setHomeShopId(e.target.value)}
          options={[{ value: '', label: t('Chunein') }, ...shops.map((s) => ({ value: s.id, label: `${s.name}${s.type !== 'SHOP' ? ' · godown' : ''}` }))]} />
        <Select label={t('Salesman')} value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)}
          hint={t('Is login se phone par van ki sale hoti hai (Van Salesman preset)')}
          options={[{ value: '', label: t('Baad me') }, ...team.map((m) => ({ value: m.id, label: m.fullName }))]} />
        <Select label={t('Route')} value={routeId} onChange={(e) => setRouteId(e.target.value)}
          options={[{ value: '', label: t('Koi nahi') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
        <Input label={t('Note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t('Zaroori nahi')} />
        {van && <Switch label={t('Van chal rahi hai')} description={t('Band van par load ya sale nahi hoti')} checked={isActive} onChange={(e) => setActive(e.target.checked)} />}
      </div>
    </Modal>
  );
}
