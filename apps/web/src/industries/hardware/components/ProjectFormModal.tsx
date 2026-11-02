/** New or edited contractor site (project): customer, site address, contacts, budget and dates. */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { projectsApi, type HardwareProject } from '../api/projects.api';
import { CustomerPick, type PickedCustomer } from './CustomerPick';
import { errorText } from '../lib/meta';
import { t as tr } from '@core/i18n';

const TYPES = ['Ghar', 'Plaza / dukanein', 'Flat', 'Factory / godown', 'Masjid / madrasa', 'Renovation', 'Sarkari kaam'];
const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());

export function ProjectFormModal({ project, onClose, onSaved }: { project?: HardwareProject; onClose: () => void; onSaved?: (p: HardwareProject) => void }) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<PickedCustomer | null>(project?.customerId ? { id: project.customerId, name: project.customerName, phone: project.customerPhone ?? null, address: null, balance: 0, creditLimit: 0 } : null);
  const [f, setF] = useState({
    name: project?.name ?? '', customerName: project?.customerName ?? '', customerPhone: project?.customerPhone ?? '',
    contractorName: project?.contractorName ?? '', contractorPhone: project?.contractorPhone ?? '', siteAddress: project?.siteAddress ?? '',
    city: project?.city ?? '', area: project?.area ?? '', siteContactPhone: project?.siteContactPhone ?? '', projectType: project?.projectType ?? '',
    floors: project?.floors ?? 0, estimatedBudget: project?.estimatedBudget ?? 0, startDate: project?.startDate?.slice(0, 10) ?? '',
    expectedEndDate: project?.expectedEndDate?.slice(0, 10) ?? '', notes: project?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const pick = (c: PickedCustomer | null) => {
    setCustomer(c);
    if (c) set({ customerName: c.name, customerPhone: c.phone ?? '', siteAddress: f.siteAddress || c.address || '' });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...f, customerId: customer?.id ?? '', name: f.name.trim(), customerName: f.customerName.trim(), siteAddress: f.siteAddress.trim(),
        floors: f.floors || undefined, estimatedBudget: f.estimatedBudget || undefined,
        startDate: f.startDate || undefined, expectedEndDate: f.expectedEndDate || undefined,
      };
      return project ? projectsApi.update(project.id, body) : projectsApi.create(body);
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['hardware-projects'] });
      qc.invalidateQueries({ queryKey: ['hardware-project', p.id] });
      toast.success(project ? tr('Site save ho gayi') : tr('Site {{projectNumber}} ban gayi', { projectNumber: p.projectNumber }));
      onSaved?.(p);
      onClose();
    },
    onError: (e) => toast.error(errorText(e, tr('Site save nahi hui'))),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = tr('Site ka naam likhein (jaise: Ahmed sahib ka ghar, DHA)');
    if (!f.customerName.trim()) e.customerName = tr('Malik ka naam likhein');
    if (!f.siteAddress.trim()) e.siteAddress = tr('Site ka pata likhein');
    if (!phoneOk(f.customerPhone)) e.customerPhone = tr('Phone theek likhein');
    if (!phoneOk(f.contractorPhone)) e.contractorPhone = tr('Phone theek likhein');
    if (f.estimatedBudget < 0) e.estimatedBudget = tr('Budget manfi nahi');
    if (f.startDate && f.expectedEndDate && f.expectedEndDate < f.startDate) e.expectedEndDate = tr('Khatam hone ki tareekh shuru se pehle nahi');
    setErrors(e);
    if (Object.keys(e).length) { toast.error(tr('Laal nishan wali jagah theek karein')); return; }
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={project ? tr('{{projectNumber}} badlein', { projectNumber: project.projectNumber }) : tr('Nayi site / project')}
      description={tr('Construction site jahan maal jata hai — quotation, challan aur bill isi se jurte hain')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={save.isPending} onClick={submit}>{tr('Save')}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }} className="space-y-3">
        <Input label={tr('Site ka naam')} required data-autofocus value={f.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} placeholder={tr('Ahmed sahib ka ghar, Phase 6')} />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Malik (customer)')}</span>
          <CustomerPick value={customer} onChange={pick} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Malik ka naam')} required value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} error={errors.customerName} />
          <Input label={tr('Malik ka phone')} inputMode="tel" value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} error={errors.customerPhone} />
          <Input label={tr('Thekedar')} value={f.contractorName} onChange={(e) => set({ contractorName: e.target.value })} />
          <Input label={tr('Thekedar ka phone')} inputMode="tel" value={f.contractorPhone} onChange={(e) => set({ contractorPhone: e.target.value })} error={errors.contractorPhone} />
        </div>
        <Textarea label={tr('Site ka pata')} required rows={2} value={f.siteAddress} onChange={(e) => set({ siteAddress: e.target.value })} error={errors.siteAddress} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Area')} value={f.area} onChange={(e) => set({ area: e.target.value })} />
          <Input label={tr('Shehar')} value={f.city} onChange={(e) => set({ city: e.target.value })} />
          <Input label={tr('Site par rabta')} inputMode="tel" value={f.siteContactPhone} onChange={(e) => set({ siteContactPhone: e.target.value })} hint={tr('Munshi / mistri')} />
          <Select label={tr('Kaam')} value={f.projectType} onChange={(e) => set({ projectType: e.target.value })} options={[{ value: '', label: '—' }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
          <Input label={tr('Manzilein')} inputMode="numeric" value={f.floors || ''} onChange={(e) => set({ floors: Math.max(Math.round(Number(e.target.value) || 0), 0) })} />
          <Input label={tr('Andaza budget (Rs)')} inputMode="decimal" value={f.estimatedBudget || ''} onChange={(e) => set({ estimatedBudget: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} error={errors.estimatedBudget} />
          <Input label={tr('Shuru')} type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          <Input label={tr('Khatam (andaza)')} type="date" value={f.expectedEndDate} onChange={(e) => set({ expectedEndDate: e.target.value })} error={errors.expectedEndDate} />
        </div>
        <Textarea label={tr('Note')} rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </form>
    </Modal>
  );
}
