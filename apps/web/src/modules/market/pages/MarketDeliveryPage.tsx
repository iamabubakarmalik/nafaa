/**
 * Delivery and riders: the shop's own riders (add, edit, switch off),
 * deliveries on the road right now and delivery fee zones.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bike, MapPin, Pencil, Phone, Plus, Route, Smartphone, Trash2, Truck, Users } from 'lucide-react';
import {
  Alert, Badge, Button, EmptyState, FilterBar, IconButton, Kbd, PageHero, PageShell, SearchField, SkeletonTable, Switch,
  Table, TBody, Td, Th, THead, Tr, ViewTabs, confirmDialog, heroPrimaryButton, type BadgeVariant,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR, formatRelative } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { msg, t } from '@core/i18n';
import { errorText, marketApi, type MarketRider, type MarketZone, type RiderStatus } from '../api/market.api';
import { num, useMarketProfile } from '../hooks/useMarket';
import { RiderModal, VEHICLES, ZoneModal } from '../components/DeliveryModals';
import { GuideButton, TONE } from '../components/parts';

type Tab = 'riders' | 'active' | 'zones';

const RIDER_STATUS: Record<RiderStatus, { label: string; variant: BadgeVariant }> = {
  AVAILABLE: { label: msg('Farigh'), variant: 'success' },
  ON_DELIVERY: { label: msg('Delivery par'), variant: 'brand' },
  BREAK: { label: msg('Break'), variant: 'warning' },
  OFFLINE: { label: msg('Offline'), variant: 'default' },
  SUSPENDED: { label: msg('Roka hua'), variant: 'danger' },
};
const DELIVERY_STATUS: Record<string, string> = { PENDING: msg('Rider ka intezar'), ACCEPTED: msg('Rider ne maana'), PICKED_UP: msg('Utha liya') };

export default function MarketDeliveryPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('riders');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [riderModal, setRiderModal] = useState<{ open: boolean; rider: MarketRider | null }>({ open: false, rider: null });
  const [zoneModal, setZoneModal] = useState<{ open: boolean; zone: MarketZone | null }>({ open: false, zone: null });
  const profileQ = useMarketProfile();

  useEffect(() => { const h = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(h); }, [search]);

  const statsQ = useQuery({ queryKey: ['market', 'delivery', 'stats'], queryFn: marketApi.delivery.stats, refetchInterval: 60_000 });
  const ridersQ = useQuery({ queryKey: ['market', 'delivery', 'riders', q], queryFn: () => marketApi.delivery.riders({ search: q || undefined, limit: 100 }), placeholderData: (prev) => prev });
  const activeQ = useQuery({ queryKey: ['market', 'delivery', 'active'], queryFn: marketApi.delivery.active, refetchInterval: 30_000 });
  const zonesQ = useQuery({ queryKey: ['market', 'delivery', 'zones'], queryFn: marketApi.delivery.zones });
  const s = statsQ.data;
  const riders = ridersQ.data?.items ?? [];
  const active = activeQ.data ?? [];
  const zones = zonesQ.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['market', 'delivery'] });
  const setActive = useMutation({
    mutationFn: (r: MarketRider) => marketApi.delivery.updateRider(r.id, { isActive: !r.isActive }),
    onSuccess: (_d, r) => { toast.success(r.isActive ? t('Rider band kar diya') : t('Rider chalu ho gaya')); invalidate(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const removeZone = useMutation({
    mutationFn: (z: MarketZone) => marketApi.delivery.deleteZone(z.id),
    onSuccess: () => { toast.success(t('Zone hata diya')); invalidate(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) {
        e.preventDefault();
        if (tab === 'zones') setZoneModal({ open: true, zone: null }); else setRiderModal({ open: true, rider: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, tab]);

  const vehicle = (v: string) => t(VEHICLES.find((x) => x.value === v)?.label ?? v);

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Delivery aur riders')}
        chip={<><Bike /> {t('Apne riders, apni delivery')}</>}
        loading={statsQ.isLoading}
        actions={<>
          <GuideButton onClick={guide.open} />
          {canEdit && (tab === 'zones'
            ? <button type="button" className={heroPrimaryButton} onClick={() => setZoneModal({ open: true, zone: null })}><Plus className="h-4 w-4" /> {t('Naya zone')}</button>
            : <button type="button" className={heroPrimaryButton} onClick={() => setRiderModal({ open: true, rider: null })}><Plus className="h-4 w-4" /> {t('Naya rider')}</button>)}
        </>}
        stats={s ? [
          { label: t('Riders'), value: s.activeRiders, hint: t('{{count}} farigh', { count: s.availableRiders }) },
          { label: t('Raste me'), value: s.activeDeliveries },
          { label: t('Aaj pohanchaye'), value: s.todayDelivered },
          { label: t('7 din ki delivery fee'), value: formatPKR(s.weekDeliveryRevenue) },
        ] : undefined}
      />

      <ViewTabs value={tab} onChange={setTab}
        hint={canEdit ? <><Kbd>N</Kbd> {tab === 'zones' ? t('naya zone') : t('naya rider')}</> : undefined}
        tabs={[
          { id: 'riders', label: t('Riders'), icon: Users, count: ridersQ.data?.total ?? null },
          { id: 'active', label: t('Raste me'), icon: Route, count: active.length },
          { id: 'zones', label: t('Delivery zones'), icon: MapPin, count: zones.length },
        ]} />

      {tab === 'riders' && (<>
        <Alert tone="info" icon={<Smartphone className="h-4 w-4" />}>{t('Rider app jald Nafaa POS mobile app me. Tab tak rider ko order WhatsApp ya call se batayein.')}</Alert>
        <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam, phone ya gaari number…')} label={t('Search')} />} />
        {ridersQ.isLoading ? <SkeletonTable /> : !riders.length ? (
          <EmptyState icon={<Bike className="h-6 w-6" />} title={t('Abhi koi rider nahi')} description={t('Apne delivery wale ko yahan jorein.')}
            action={canEdit ? <Button onClick={() => setRiderModal({ open: true, rider: null })} leftIcon={<Plus className="h-4 w-4" />}>{t('Naya rider')}</Button> : undefined} />
        ) : (
          <Table minWidth="44rem">
            <THead><Tr><Th>{t('Rider')}</Th><Th>{t('Sawari')}</Th><Th>{t('Halat')}</Th><Th align="right">{t('Deliveries')}</Th><Th>{t('Chalu')}</Th><Th /></Tr></THead>
            <TBody>
              {riders.map((r) => (
                <Tr key={r.id} data-nav-row className={r.isActive ? '' : 'opacity-60'}>
                  <Td>
                    <button type="button" data-nav-open disabled={!canEdit} onClick={() => setRiderModal({ open: true, rider: r })} className="text-start">
                      <span className="block font-semibold text-slate-900">{r.fullName}</span>
                      <span className="dir-ltr block text-[0.75rem] text-slate-500">{r.phone}</span>
                    </button>
                  </Td>
                  <Td className="text-slate-700">{vehicle(r.vehicleType)}{r.vehicleNumber ? <span className="dir-ltr ms-1 text-slate-500">· {r.vehicleNumber}</span> : null}</Td>
                  <Td><Badge size="xs" variant={RIDER_STATUS[r.status]?.variant ?? 'default'}>{t(RIDER_STATUS[r.status]?.label ?? r.status)}</Badge></Td>
                  <Td align="right" className="tabular-nums text-slate-700">{r.completedDeliveries}</Td>
                  <Td><Switch size="sm" aria-label={t('Chalu')} checked={r.isActive} disabled={!canEdit || setActive.isPending} onChange={() => setActive.mutate(r)} /></Td>
                  <Td align="right">
                    <span className="inline-flex gap-1">
                      <a href={`tel:${r.phone}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('Call')}><Phone className="h-4 w-4" /></a>
                      {canEdit && <IconButton label={t('Badlein')} variant="ghost" size="sm" onClick={() => setRiderModal({ open: true, rider: r })}><Pencil className="h-4 w-4" /></IconButton>}
                    </span>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </>)}

      {tab === 'active' && (activeQ.isLoading ? <SkeletonTable /> : !active.length ? (
        <EmptyState icon={<Truck className="h-6 w-6" />} title={t('Abhi koi delivery raste me nahi')} description={t('Rider ko order dete hi yahan dikhega.')} />
      ) : (
        <Table minWidth="40rem">
          <THead><Tr><Th>{t('Rider')}</Th><Th>{t('Halat')}</Th><Th align="right">{t('Faasla')}</Th><Th align="right">{t('Fee')}</Th><Th>{t('Kab diya')}</Th></Tr></THead>
          <TBody>
            {active.map((a) => (
              <Tr key={a.id} data-nav-row>
                <Td><span className="font-semibold text-slate-900">{a.rider?.fullName ?? '—'}</span>{a.rider?.phone && <span className="dir-ltr ms-2 text-[0.75rem] text-slate-500">{a.rider.phone}</span>}</Td>
                <Td><Badge size="xs" variant="info">{t(DELIVERY_STATUS[a.status] ?? a.status)}</Badge></Td>
                <Td align="right" className="tabular-nums text-slate-600">{a.distanceKm != null ? `${a.distanceKm.toFixed(1)} km` : '—'}</Td>
                <Td align="right" className="tabular-nums">{formatPKR(num(a.deliveryFee))}</Td>
                <Td className="text-slate-600">{formatRelative(a.assignedAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ))}

      {tab === 'zones' && (zonesQ.isLoading ? <SkeletonTable /> : !zones.length ? (
        <EmptyState icon={<MapPin className="h-6 w-6" />} title={t('Abhi koi delivery zone nahi')}
          description={t('Zone ke baghair profile wali delivery fee lagti hai. Door ke ilaqon ki alag fee ke liye zone banayein.')}
          action={canEdit ? <Button onClick={() => setZoneModal({ open: true, zone: null })} leftIcon={<Plus className="h-4 w-4" />}>{t('Naya zone')}</Button> : undefined} />
      ) : (
        <Table minWidth="44rem">
          <THead><Tr><Th>{t('Zone')}</Th><Th align="right">{t('Shuru ki fee')}</Th><Th align="right">{t('Har km')}</Th><Th align="right">{t('Free is se upar')}</Th><Th align="right">{t('Kam se kam order')}</Th><Th>{t('Halat')}</Th><Th /></Tr></THead>
          <TBody>
            {zones.map((z) => (
              <Tr key={z.id} data-nav-row className={z.isActive ? '' : 'opacity-60'}>
                <Td>
                  <button type="button" data-nav-open disabled={!canEdit} onClick={() => setZoneModal({ open: true, zone: z })} className="text-start">
                    <span className="block font-semibold text-slate-900">{z.name}</span>
                    {z.description && <span className="block text-[0.75rem] text-slate-500">{z.description}</span>}
                  </button>
                </Td>
                <Td align="right" className="tabular-nums">{formatPKR(num(z.baseFee))}</Td>
                <Td align="right" className="tabular-nums">{formatPKR(num(z.perKmFee))}</Td>
                <Td align="right" className="tabular-nums">{num(z.freeAbove) ? formatPKR(num(z.freeAbove)) : '—'}</Td>
                <Td align="right" className="tabular-nums">{num(z.minOrder) ? formatPKR(num(z.minOrder)) : '—'}</Td>
                <Td>{z.isActive ? <Badge size="xs" variant="success">{t('Chalu')}</Badge> : <Badge size="xs">{t('Band')}</Badge>}</Td>
                <Td align="right">
                  {canEdit && (
                    <span className="inline-flex gap-1">
                      <IconButton label={t('Badlein')} variant="ghost" size="sm" onClick={() => setZoneModal({ open: true, zone: z })}><Pencil className="h-4 w-4" /></IconButton>
                      <IconButton label={t('Hatayein')} variant="ghost" size="sm" onClick={async () => {
                        if (await confirmDialog({ title: t('Zone hatayein?'), text: z.name, yes: t('Hatayein'), danger: true })) removeZone.mutate(z);
                      }}><Trash2 className="h-4 w-4" /></IconButton>
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ))}

      <RiderModal open={riderModal.open} rider={riderModal.rider} onClose={() => setRiderModal({ open: false, rider: null })} />
      <ZoneModal open={zoneModal.open} zone={zoneModal.zone} shopId={profileQ.data?.shopId} onClose={() => setZoneModal({ open: false, zone: null })} />

      {guide.isOpen && (
        <PageGuide title={t('Delivery aur riders')} onClose={guide.close}
          flow={[
            { label: t('Order accept'), icon: Truck, color: TONE.blue },
            { label: t('Rider ko diya'), icon: Bike, color: TONE.violet },
            { label: t('Raste me'), icon: Route, color: TONE.amber },
            { label: t('Pohanch gaya'), icon: MapPin, color: TONE.green },
          ]}
          steps={[
            { icon: Users, color: TONE.blue, title: t('Riders jorein'), text: t('Apne delivery walon ka naam, number aur sawari. Chhutti par ho to "Chalu" band kar dein.') },
            { icon: Route, color: TONE.amber, title: t('Raste me'), text: t('Jo orders abhi rider ke paas hain woh "Raste me" tab me.') },
            { icon: MapPin, color: TONE.green, title: t('Delivery zones'), text: t('Door ke ilaqon ki alag fee: shuru ki fee, har km ki fee aur free delivery ki had.') },
          ]}
          tips={[t('Rider app jald Nafaa POS mobile app me aa rahi hai.')]}
          shortcuts={[['N', t('naya rider / zone')], ['/', t('search')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
