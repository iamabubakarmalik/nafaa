/**
 * Create or edit a route: name, code, area, the weekdays it is visited, its
 * booker and delivery man, and the godown whose stock it sells.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Select, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import type { Route, SaveRoute } from '../../api/distribution.api';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../shared';
import { useTeam } from './useTeam';
import { useDeliveryStaff } from '../../hooks/useDistribution';

const BOOK = 'distribution.orders.book';

export function RouteFormModal({ route, saving, onClose, onSave }: {
  route: Route | null; saving: boolean; onClose: () => void; onSave: (body: SaveRoute) => void;
}) {
  const teamQ = useTeam();
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const [name, setName] = useState(route?.name ?? '');
  const [code, setCode] = useState(route?.code ?? '');
  const [area, setArea] = useState(route?.area ?? '');
  const [days, setDays] = useState<number[]>(route?.visitDays ?? []);
  const [bookerId, setBookerId] = useState(route?.bookerId ?? '');
  const [deliveryUserId, setDeliveryUserId] = useState(route?.deliveryUserId ?? '');
  const [shopId, setShopId] = useState(route?.shopId ?? '');
  const [isActive, setActive] = useState(route?.isActive ?? true);

  const team = (teamQ.data ?? []).filter((m) => m.isActive || m.id === bookerId || m.id === deliveryUserId);
  const has = (m: { role: string; permissions?: string[] }, keys: string[]) => m.role === 'OWNER' || keys.some((k) => m.permissions?.includes(k));
  const bookers = team.filter((m) => has(m, [BOOK]));
  const drivers = useDeliveryStaff([{ id: route?.deliveryUserId, name: route?.deliveryUserName }]).list;
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive || s.id === shopId);
  const toggleDay = (d: number) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()));

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), code: code.trim() || undefined, area: area.trim() || undefined, visitDays: days,
      bookerId: bookerId || null, deliveryUserId: deliveryUserId || null, shopId: shopId || null, isActive,
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={route ? `${route.name} — badlein` : 'Naya route'}
      description="Ek route = ek ilaqa, mukarrar din, ek booker aur ek delivery wala."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action loading={saving} disabled={!name.trim()} onClick={submit}>{route ? 'Save karein' : 'Route banayein'}</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Shadman - Ichhra" />
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} placeholder="R1" className="font-mono" />
        </div>
        <Input label="Ilaqe" value={area} onChange={(e) => setArea(e.target.value)} maxLength={120} placeholder="Shadman, Ichhra, Mozang" hint="Comma se likhein" />

        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kin dinon jana hai</p>
          <div role="group" aria-label="Visit days" className="grid grid-cols-7 gap-1">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = days.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} title={WEEKDAYS[i]} onClick={() => toggleDay(i)}
                  className={cn('h-10 rounded-lg text-[0.8125rem] font-semibold ring-1 transition', on ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                  {d}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{days.length ? `Har hafte: ${days.map((d) => WEEKDAYS[d]).join(', ')}` : 'Koi din nahi chuna — route din ke plan me nahi aayega'}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Order booker" value={bookerId} onChange={(e) => setBookerId(e.target.value)}
            options={[{ value: '', label: '— Koi nahi —' }, ...bookers.map((m) => ({ value: m.id, label: m.fullName }))]}
            hint={bookers.length ? 'Jin ke paas "Order book karein" ki permission hai' : 'Team me Order Booker login banayein'} />
          <Select label="Delivery wala" value={deliveryUserId} onChange={(e) => setDeliveryUserId(e.target.value)}
            options={[{ value: '', label: '— Koi nahi —' }, ...drivers.map((m) => ({ value: m.id, label: m.label }))]}
            hint={drivers.length ? 'Load sheet aur delivery isi ke naam' : 'Team me Delivery login banayein'} />
          <Select label="Godown" value={shopId} onChange={(e) => setShopId(e.target.value)} wrapperClassName="sm:col-span-2"
            options={[{ value: '', label: '— Settings wala default —' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
            hint="Is route ka maal kis godown ke stock se nikle" />
        </div>
        <Switch checked={isActive} onChange={(e) => setActive(e.target.checked)} label="Chalu" description="Band route booker app aur din ke plan me nahi aata." />
      </div>
    </Modal>
  );
}
