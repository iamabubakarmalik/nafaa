/**
 * Settings → Distribution. The on/off switch (refused while the plan lacks
 * the feature, which shows an upgrade prompt instead), the credit rule used
 * at invoicing, visit check-in, recovery verification, document number
 * prefixes and the default price list and godown. Changes save by themselves
 * a moment after the last edit.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, BadgePercent, CreditCard, FileText, Hash, LayoutDashboard, MapPin, Power, ShieldCheck, Sparkles, Tag, Truck, UserCog, Warehouse,
} from 'lucide-react';
import { Alert, Badge, Button, Input, Select, Skeleton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { ChoiceGroup, Field, NumberInput, PageLink, SectionCard, Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { SaveStatusBar } from '@modules/organization/settings/sections/_SaveStatus';
import { DIST_KEY, distError, distSetupApi, type CreditMode, type DistributionMode, type DistributionSettings, type SettingsResponse, type UpdateSettings } from '../../api/distribution.api';
import { useDistributionSettings } from '../../hooks/useDistribution';
import { PRICE_LISTS_KEY } from '../shared';

const SETTINGS_KEY = [DIST_KEY, 'settings'];

const MODES: Array<{ value: DistributionMode; label: string; desc: string; icon: typeof Truck }> = [
  { value: 'WHOLESALE', label: 'Sirf wholesale', desc: 'Price list, order, udhaar aur recovery', icon: Warehouse },
  { value: 'FULL', label: 'Poori distribution', desc: 'Upar sab, saath me routes, booker, load sheet aur delivery', icon: Truck },
];

const CREDIT_MODES: Array<{ value: CreditMode; label: string; desc: string }> = [
  { value: 'WARN_THEN_PIN', label: 'Warning, phir PIN', desc: 'Limit se zyada ya purana udhaar ho to Invoice par manager ka PIN' },
  { value: 'BLOCK', label: 'Rok dein', desc: 'Limit se zyada udhaar par Invoice nahi banega' },
  { value: 'OFF', label: 'Check na karein', desc: 'Udhaar ki limit aur din nahi dekhe jayenge' },
];

export function DistributionSettingsSection() {
  const qc = useQueryClient();
  const q = useDistributionSettings();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const data = q.data;
  const [draft, setDraft] = useState<DistributionSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const pending = useRef<UpdateSettings>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (data) setDraft({ ...data.settings, ...pending.current }); }, [data]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const on = !!data?.access.enabled && !!data.access.planAllows;
  const listsQ = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists, enabled: on });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });

  const save = useMutation({
    mutationFn: (body: UpdateSettings) => distSetupApi.updateSettings(body),
    onSuccess: (r: SettingsResponse, body) => {
      qc.setQueryData(SETTINGS_KEY, r);
      if (!Object.keys(pending.current).length) setDirty(false);
      if (body.enabled !== undefined) {
        qc.invalidateQueries({ queryKey: [DIST_KEY] });
        toast.success(body.enabled ? 'Distribution chalu ho gaya' : 'Distribution band ho gaya');
      }
    },
    onError: (e, body) => {
      pending.current = { ...body, ...pending.current };
      toast.error(distError(e, 'Save nahi hua'));
      if (data) setDraft({ ...data.settings });
    },
  });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const body = pending.current;
    if (!Object.keys(body).length) return;
    pending.current = {};
    save.mutate(body);
  };
  const set = <K extends keyof UpdateSettings>(k: K, v: UpdateSettings[K], now = false) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    pending.current = { ...pending.current, [k]: v };
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    if (now) flush(); else timer.current = setTimeout(flush, 700);
  };

  if (q.isLoading || (!draft && !q.error)) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
  if (!data || !draft) return <Alert tone="danger">{distError(q.error, 'Distribution settings nahi khulin')}</Alert>;

  const { access } = data;
  const lists = (listsQ.data ?? []).filter((l) => l.isActive);
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={save.isPending} dirty={dirty} />

      {!access.planAllows && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-5 ring-1 ring-teal-200">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 ring-1 ring-teal-200"><Sparkles className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Aap ke plan{access.planName ? ` (${access.planName})` : ''} me Distribution shamil nahi</p>
            <p className="text-[0.8125rem] text-slate-600">Order booker app, routes, price lists, schemes, load sheet, settlement aur recovery — plan upgrade karke chalu karein.</p>
          </div>
          <Link to="/plans"><Button rightIcon={<ArrowRight className="h-4 w-4" />}>Plans dekhein</Button></Link>
        </div>
      )}

      <SectionCard title="Distribution" icon={Truck} color="teal"
        desc="Field me booker order leta hai, office Invoice aur load sheet banata hai, delivery wala maal aur cash laata hai"
        badge={<Badge size="xs" variant={on ? 'success' : 'default'}>{on ? 'Chalu' : 'Band'}</Badge>}>
        <Toggle checked={draft.enabled} disabled={!canEdit || !access.planAllows || save.isPending} icon={Power}
          onChange={(v) => set('enabled', v, true)}
          label="Distribution chalu karein"
          desc={access.planAllows ? 'Band karne se purana data nahi mitta — sirf menu aur booker app band hote hain.' : 'Pehle plan upgrade karein.'} />
        {on && (
          <div className="mt-3">
            <p className="mb-2 text-[0.8125rem] font-medium text-slate-700">Kitna kaam chahiye?</p>
            <ChoiceGroup value={draft.mode ?? 'FULL'} onChange={(v: DistributionMode) => set('mode', v, true)} options={MODES} />
          </div>
        )}
        {on && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <PageLink to="/distribution" icon={LayoutDashboard} title="Distribution dashboard" desc="Aaj ka kaam ek nazar me" />
            <PageLink to="/distribution/price-lists" icon={Tag} title="Price lists" desc="Har customer group ka rate" />
            {draft.mode !== 'WHOLESALE' && <PageLink to="/distribution/routes" icon={MapPin} title="Routes" desc="Din, booker, dukaanein" />}
            <PageLink to="/distribution/schemes" icon={BadgePercent} title="Schemes" desc="10+1, % off, slab" />
            <PageLink to="/staff" icon={UserCog} title="Team" desc="Booker aur Delivery login" />
          </div>
        )}
      </SectionCard>

      {on && (<>
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Udhaar ka usool" desc="Invoice banate waqt customer ki limit aur purana udhaar" icon={CreditCard} color="rose">
            <ChoiceGroup columns={1} value={draft.creditMode} onChange={(v: CreditMode) => set('creditMode', v)} options={CREDIT_MODES} />
            <p className="mt-2 text-xs text-slate-500">Order book karte waqt sirf warning aati hai. "Purana" = customer ke udhaar ke din (customer form me) guzar gaye.</p>
          </SectionCard>

          <SectionCard title="Visit aur recovery" desc="Booker app me dukaan par haazri aur field ka cash" icon={ShieldCheck} color="blue">
            <Toggle checked={draft.requireCheckIn} onChange={(v) => set('requireCheckIn', v)} icon={MapPin}
              label="Dukaan par check-in zaroori"
              desc="Door se visit likhi jaye to warning aati hai (rokti nahi) aur report me nishan lagta hai" />
            <Field label="Dukaan se kitni door tak theek" hint="Customer ki GPS location se itne meter tak visit theek maani jati hai">
              <NumberInput value={draft.checkInRadiusM} onChange={(v) => set('checkInRadiusM', v)} min={10} max={5000} step={10} suffix="meter" />
            </Field>
            <Toggle checked={draft.recoveryNeedsVerify} onChange={(v) => set('recoveryNeedsVerify', v)} icon={ShieldCheck}
              label="Recovery office verify kare"
              desc={draft.recoveryNeedsVerify ? 'Booker ka laya cash office ke verify karne par khata me jata hai' : 'Booker ka laya cash foran khata me chala jata hai'} />
          </SectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Default" desc="Jab customer ya route par kuch na likha ho" icon={Warehouse} color="violet">
            <div className="space-y-3">
              <Select label="Default price list" value={draft.defaultPriceListId ?? ''} onChange={(e) => set('defaultPriceListId', e.target.value || null)}
                options={[{ value: '', label: '— List par "Default" wali —' }, ...lists.map((l) => ({ value: l.id, label: l.name }))]}
                hint="Jis customer ki apni list nahi, us par yeh list" />
              <Select label="Default godown" value={draft.defaultShopId ?? ''} onChange={(e) => set('defaultShopId', e.target.value || null)}
                options={[{ value: '', label: '— Route ka godown —' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                hint="Route par godown na ho to maal yahan se nikalta hai" />
            </div>
          </SectionCard>

          <SectionCard title="Numbers" desc="Order aur load sheet ke number ka shuru ka hissa" icon={Hash} color="slate">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Order" value={draft.orderPrefix} maxLength={10} onChange={(e) => set('orderPrefix', e.target.value.toUpperCase())}
                leftIcon={<FileText className="h-4 w-4" />} hint={`Misal: ${draft.orderPrefix || 'SO-'}000042`} className="font-mono" />
              <Input label="Load sheet" value={draft.loadSheetPrefix} maxLength={10} onChange={(e) => set('loadSheetPrefix', e.target.value.toUpperCase())}
                leftIcon={<Truck className="h-4 w-4" />} hint={`Misal: ${draft.loadSheetPrefix || 'LS-'}000007`} className="font-mono" />
            </div>
          </SectionCard>
        </div>
      </>)}
    </div>
  );
}
