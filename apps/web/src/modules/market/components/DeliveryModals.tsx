/**
 * Add / edit dialogs for the shop's riders and delivery fee zones.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { Field, NumberInput } from '@modules/organization/settings/components/SettingsBlocks';
import { msg, t } from '@core/i18n';
import { errorText, marketApi, type MarketRider, type MarketZone, type RiderVehicle } from '../api/market.api';
import { num } from '../hooks/useMarket';

export const VEHICLES: Array<{ value: RiderVehicle; label: string }> = [
  { value: 'MOTORBIKE', label: msg('Motorbike') },
  { value: 'BICYCLE', label: msg('Cycle') },
  { value: 'CAR', label: msg('Gaari') },
  { value: 'ON_FOOT', label: msg('Paidal') },
];

export function RiderModal({ rider, open, onClose }: { rider: MarketRider | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ fullName: '', phone: '', password: '', vehicleType: 'MOTORBIKE' as RiderVehicle, vehicleNumber: '', cnic: '' });
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTried(false);
    setF({ fullName: rider?.fullName ?? '', phone: rider?.phone ?? '', password: '', vehicleType: rider?.vehicleType ?? 'MOTORBIKE', vehicleNumber: rider?.vehicleNumber ?? '', cnic: '' });
  }, [open, rider]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const errors = {
    fullName: f.fullName.trim().length < 2 ? t('Naam likhein') : undefined,
    phone: !rider && !/^(\+92|0)?3\d{9}$/.test(f.phone.replace(/[\s-]/g, '')) ? t('Mobile number theek nahi — misaal: 03001234567') : undefined,
    password: !rider && f.password.length < 6 ? t('Kam az kam 6 harf') : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: () => (rider
      ? marketApi.delivery.updateRider(rider.id, { fullName: f.fullName.trim(), vehicleType: f.vehicleType, vehicleNumber: f.vehicleNumber.trim() || undefined, ...(f.cnic.trim() ? { cnic: f.cnic.trim() } : {}) })
      : marketApi.delivery.createRider({ fullName: f.fullName.trim(), phone: f.phone.replace(/[\s-]/g, ''), password: f.password, vehicleType: f.vehicleType, vehicleNumber: f.vehicleNumber.trim() || undefined, cnic: f.cnic.trim() || undefined })),
    onSuccess: () => {
      toast.success(rider ? t('Rider update ho gaya') : t('Rider jor diya'));
      qc.invalidateQueries({ queryKey: ['market', 'delivery'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!invalid) save.mutate(); };

  return (
    <Modal open={open} onClose={onClose} title={rider ? t('Rider badlein') : t('Naya rider')}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t('Wapas')}</Button><Button onClick={submit} loading={save.isPending}>{t('Save')}</Button></div>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label={t('Naam')} value={f.fullName} error={tried ? errors.fullName : undefined} onChange={(e) => set('fullName', e.target.value)} autoFocus />
        <Input label={t('Mobile number')} inputMode="tel" value={f.phone} disabled={!!rider} error={tried ? errors.phone : undefined} onChange={(e) => set('phone', e.target.value)} />
        {!rider && <Input label={t('Password')} type="password" value={f.password} error={tried ? errors.password : undefined} onChange={(e) => set('password', e.target.value)} hint={t('Rider isi se login karega')} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t('Sawari')} value={f.vehicleType} onChange={(e) => set('vehicleType', e.target.value as RiderVehicle)} options={VEHICLES.map((v) => ({ value: v.value, label: t(v.label) }))} />
          <Input label={t('Gaari number')} value={f.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value)} />
        </div>
        <Input label={t('CNIC')} value={f.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder={rider ? t('Badalna ho to likhein') : '35202-1234567-1'} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

/** Radius saved inside the zone's shape field until zones are drawn on a map. */
const zoneRadius = (z: MarketZone | null) => {
  const g = (z as unknown as { polygonGeoJson?: { radiusKm?: number } } | null)?.polygonGeoJson;
  return Number(g?.radiusKm) || 5;
};

export function ZoneModal({ zone, open, onClose, shopId }: { zone: MarketZone | null; open: boolean; onClose: () => void; shopId?: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', description: '', radiusKm: 5, baseFee: 0, perKmFee: 0, freeAbove: 0, minOrder: 0, isActive: true });
  useEffect(() => {
    if (!open) return;
    setF({
      name: zone?.name ?? '', description: zone?.description ?? '', radiusKm: zoneRadius(zone),
      baseFee: num(zone?.baseFee), perKmFee: num(zone?.perKmFee), freeAbove: num(zone?.freeAbove), minOrder: num(zone?.minOrder), isActive: zone?.isActive ?? true,
    });
  }, [open, zone]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name.trim(), description: f.description.trim() || undefined,
        polygonGeoJson: { type: 'radius', radiusKm: f.radiusKm },
        baseFee: f.baseFee, perKmFee: f.perKmFee, freeAbove: f.freeAbove || undefined, minOrder: f.minOrder, isActive: f.isActive,
      };
      return zone ? marketApi.delivery.updateZone(zone.id, body) : marketApi.delivery.createZone({ ...body, shopId });
    },
    onSuccess: () => {
      toast.success(t('Save ho gaya'));
      qc.invalidateQueries({ queryKey: ['market', 'delivery'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });

  return (
    <Modal open={open} onClose={onClose} title={zone ? t('Delivery zone badlein') : t('Naya delivery zone')}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t('Wapas')}</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.name.trim()}>{t('Save')}</Button></div>}>
      <div className="space-y-3">
        <Input label={t('Zone ka naam')} placeholder={t('Masalan: Qareeb ke ilaqe')} value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        <Textarea label={t('Note')} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Dukaan se kitni door tak')}><NumberInput value={f.radiusKm} onChange={(v) => set('radiusKm', v)} min={1} max={100} suffix="km" /></Field>
          <Field label={t('Shuru ki fee')}><NumberInput value={f.baseFee} onChange={(v) => set('baseFee', v)} min={0} step={10} prefix="Rs" /></Field>
          <Field label={t('Har km ki fee')}><NumberInput value={f.perKmFee} onChange={(v) => set('perKmFee', v)} min={0} step={5} prefix="Rs" /></Field>
          <Field label={t('Itne ke order par free')} hint={t('0 = hamesha fee')}><NumberInput value={f.freeAbove} onChange={(v) => set('freeAbove', v)} min={0} step={100} prefix="Rs" /></Field>
          <Field label={t('Kam se kam order')}><NumberInput value={f.minOrder} onChange={(v) => set('minOrder', v)} min={0} step={50} prefix="Rs" /></Field>
        </div>
        <Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} label={t('Chalu')} />
      </div>
    </Modal>
  );
}
