/** Warranty (web WarrantyPage): claims on finished jobs still under warranty; register a claim, approve with what we will do, or reject. */

import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Row, Select, Sheet, Text, toast } from '@/design';
import { errorText, useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet } from '../../_shared/serviceKit';
import { servicesApi, type WarrantyClaim, type WarrantyJob } from '../api';
import { CLAIM_STATUS, RESOLUTIONS, SB_KEYS, dateOf, opts, refreshServices } from '../meta';

export function WarrantyScreen() {
  const manage = usePermission()(P.SERVICE_JOBS_MANAGE);
  const { guard } = useDeskOnline('servicesDesk');
  const [open, setOpen] = useState<WarrantyClaim | null>(null);
  const [res, setRes] = useState('REPAIR');
  const [form, setForm] = useState(false);
  const [reject, setReject] = useState(false);
  const act = async (fn: () => Promise<unknown>, msgText: string) => { try { await fn(); refreshServices(true); setOpen(null); toast.success(msgText); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  return (
    <DeskList<{ claims: WarrantyClaim[]; jobs: WarrantyJob[] }> title={t('Warranty')} queryKey={[SB_KEYS.warranty]} fetch={async () => ({ claims: await servicesApi.warranty.claims(), jobs: await servicesApi.warranty.register().catch(() => []) })} feature="servicesDesk" emptyIcon={ShieldCheck} empty={t('Abhi koi claim nahi')} searchPlaceholder={t('Customer ya claim number')}
      rows={(d) => d.claims.map((c) => ({
        id: c.id, icon: ShieldCheck, tone: CLAIM_STATUS[c.status]?.tone ?? 'neutral', search: `${c.customerName} ${c.claimNumber}`, title: c.customerName, subtitle: `${c.claimNumber}${c.originalJob ? ` · ${c.originalJob.serviceName}` : ''} · ${dateOf(c.claimDate)}`,
        trailing: <Badge tone={CLAIM_STATUS[c.status]?.tone ?? 'neutral'}>{t(CLAIM_STATUS[c.status]?.label ?? c.status)}</Badge>, onPress: () => setOpen(c),
      }))}
      summary={(d) => d && d.jobs.length > 0 ? <Text size="sm" tone="muted">{t('{{n}} job abhi warranty me hain', { n: d.jobs.length })}</Text> : null}
      fab={manage ? { label: t('New claim'), onPress: () => guard(() => setForm(true)) } : undefined}>
      <Sheet open={!!open && !reject} onClose={() => setOpen(null)} title={open?.customerName} description={open?.claimNumber}
        footer={open && manage && open.status === 'SUBMITTED' ? <Row gap={2}><Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => servicesApi.warranty.approve(open.id, res), t('Claim manzoor')))}>{t('Manzoor karein')}</Button><Button variant="ghost" onPress={() => setReject(true)}>{t('Na-manzoor')}</Button></Row> : undefined}>
        {open && <View style={{ gap: 8 }}>
          <DetailRow label={t('Shikayat')} value={open.issueDescription} />{open.originalJob ? <DetailRow label={t('Job')} value={`${open.originalJob.jobNumber} · ${open.originalJob.serviceName}`} /> : null}
          {open.status === 'SUBMITTED' && manage && <Select label={t('Hum kya karenge')} value={res} onChange={setRes} options={opts(RESOLUTIONS)} />}
        </View>}
      </Sheet>
      <FormSheet open={reject} title={t('Na-manzoor')} onClose={() => setReject(false)} fields={[{ key: 'reason', label: t('Wajah'), required: true }]} onSubmit={async (v) => { await servicesApi.warranty.reject(open!.id, v.reason.trim()); refreshServices(); setOpen(null); toast.success(t('Na-manzoor likh diya')); }} />
      <FormSheet open={form} title={t('New claim')} onClose={() => setForm(false)} fields={[{ key: 'customerName', label: t('Customer'), required: true }, { key: 'customerPhone', label: t('Phone'), kind: 'phone' }, { key: 'issueDescription', label: t('Shikayat'), kind: 'multiline', required: true }]}
        onSubmit={async (v) => { await servicesApi.warranty.create({ customerName: v.customerName.trim(), customerPhone: v.customerPhone?.trim() || undefined, issueDescription: v.issueDescription.trim() }); refreshServices(); toast.success(t('Claim jama ho gaya')); }} />
    </DeskList>
  );
}
