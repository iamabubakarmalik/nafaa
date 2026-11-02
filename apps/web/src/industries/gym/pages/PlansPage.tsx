/**
 * Membership plans: monthly, quarterly, yearly, couple, student or a PT
 * package (a plan with PT sessions). Each plan has its price, admission fee
 * (first membership only), security deposit, visit limit, gym hours,
 * freeze rules and what it includes. Price changes apply to the next sale.
 *
 * Keys: N new plan · G guide.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Clock, Dumbbell, Flame, GraduationCap, Pencil, Plus, Snowflake, Star, Target } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Badge, Button, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Switch, Textarea, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { membershipPlansApi, type MembershipPlan, type PlanInput, type PlanType } from '../api/membership-plans.api';
import { EmptyList, ListSkeleton, LoadFailed } from '../components/ui';
import { GYM_KEYS, PLAN_TYPES, WEEKDAYS, apiError, num, planTypeLabel } from '../lib/meta';
import { useGymCan } from '../lib/permissions';
import { t as tr } from '@core/i18n';

type Tab = 'active' | 'off';

export default function PlansPage() {
  const can = useGymCan();
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('active');
  const [edit, setEdit] = useState<MembershipPlan | 'new' | null>(null);
  const q = useQuery({ queryKey: [GYM_KEYS.plans, 'all'], queryFn: () => membershipPlansApi.list() });
  const all = q.data ?? [];
  const live = all.filter((p) => p.isActive);
  const rows = tab === 'active' ? live : all.filter((p) => !p.isActive);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.newPlan) { e.preventDefault(); setEdit('new'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      <PageHero
        title={tr('Plans')}
        chip={<><Target /> {' '}{tr('Gym')}</>}
        meta={tr('Mahana, 3 mahine, saalana, couple, student aur PT package')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.newPlan && <button type="button" onClick={() => setEdit('new')} title={tr('Naya plan (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya plan')}</button>}
        </>}
        stats={[
          { label: tr('Chalu plans'), value: live.length },
          { label: tr('Kul bike'), value: all.reduce((s, p) => s + p.totalSubscribers, 0) },
          { label: tr('Plans se Sale'), value: formatPKR(all.reduce((s, p) => s + p.totalRevenue, 0)) },
        ]}
      />

      <KpiRow cols={3}>
        {q.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Award} color="#16a34a" label={tr('Chalu')} value={live.length} hint={tr('Counter par bikte hain')} onClick={() => setTab('active')} active={tab === 'active'} />
          <KpiCard icon={Flame} color="#e11d48" label={tr('PT wale')} value={live.filter((p) => p.includesPersonalTraining).length} hint={tr('Plan me PT sessions')} />
          <KpiCard icon={Snowflake} color="#64748b" label={tr('Band')} value={all.length - live.length} hint={tr('Purane members chalte rehte hain')} onClick={() => setTab('off')} active={tab === 'off'} />
        </>}
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'active', label: tr('Chalu'), icon: Award, count: live.length }, { id: 'off', label: tr('Band'), icon: Snowflake, count: all.length - live.length }]} />

      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what={tr('Plans')} retry={() => q.refetch()} /> : !rows.length ? (
        <EmptyList icon={Target} title={tab === 'active' ? tr('Koi chalu plan nahi') : tr('Koi band plan nahi')} text={tr('Pehla plan banayein: maslan Mahana — Rs 3,000, admission Rs 1,000, 30 din.')}>
          {can.newPlan && tab === 'active' && <Button onClick={() => setEdit('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Pehla plan banayein')}</Button>}
        </EmptyList>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80" style={{ borderTop: `4px solid ${p.colorTheme || 'rgb(var(--brand-500))'}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">{p.isFeatured && <Star className="h-4 w-4 text-amber-500" />}{p.name}</p>
                  <p className="text-[0.8125rem] text-slate-500">{tr('{{planType}} · {{durationDays}} din{{value}}', { planType: planTypeLabel(p.planType), durationDays: p.durationDays, value: p.code ? ` · ${p.code}` : '' })}</p>
                </div>
                {!p.isActive && <Badge size="xs">{tr('Band')}</Badge>}
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{formatPKR(p.price)}</p>
              <p className="text-[0.8125rem] text-slate-600">{p.registrationFee > 0 ? tr('+ admission {{registrationFee}}', { registrationFee: formatPKR(p.registrationFee) }) : tr('Admission nahi')}{p.securityDeposit > 0 ? tr(' · security {{securityDeposit}}', { securityDeposit: formatPKR(p.securityDeposit) }) : ''}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge size="xs" variant="info">{p.isUnlimited ? tr('Jitni dafa chahein') : tr('{{value}} visits', { value: p.visitLimit ?? 0 })}</Badge>
                {!p.accessAllHours && p.accessTimeStart && <Badge size="xs"><Clock className="h-3 w-3" /> {p.accessTimeStart}–{p.accessTimeEnd}</Badge>}
                {p.includesPersonalTraining && <Badge size="xs" variant="danger">{tr('{{personalTrainingSessions}} PT', { personalTrainingSessions: p.personalTrainingSessions })}</Badge>}
                {p.allowFreeze && <Badge size="xs" variant="ghost">{tr('Freeze {{maxFreezeDays}} din', { maxFreezeDays: p.maxFreezeDays })}</Badge>}
                {p.includesLockerFacility && <Badge size="xs" variant="ghost">{tr('Locker')}</Badge>}
                {p.includesGuestPasses > 0 && <Badge size="xs" variant="ghost">{tr('{{includesGuestPasses}} mehmaan', { includesGuestPasses: p.includesGuestPasses })}</Badge>}
              </div>
              {!!p.benefits.length && <ul className="mt-2 list-inside list-disc text-[0.8125rem] text-slate-600">{p.benefits.slice(0, 3).map((b) => <li key={b}>{b}</li>)}</ul>}
              <p className="mt-2 text-[0.75rem] text-slate-500">{tr('{{totalSubscribers}} dafa bika · {{totalRevenue}}', { totalSubscribers: p.totalSubscribers, totalRevenue: formatPKR(p.totalRevenue) })}</p>
              {can.plans && <Button className="mt-3" size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEdit(p)}>{tr('Badlein')}</Button>}
            </div>
          ))}
        </div>
      )}

      {edit && <PlanModal plan={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Plans — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Target, color: '#2563eb', title: tr('Plan'), text: tr('Naam, qeemat aur kitne din. Couple ya student plan ke liye "Apna" chunein aur naam me likh dein.') },
            { icon: Award, color: '#16a34a', title: tr('Admission'), text: tr('Admission fee sirf pehli membership par lagti hai; renew par nahi. Security deposit bhi sirf pehli dafa.') },
            { icon: Flame, color: '#e11d48', title: tr('PT package'), text: tr('PT sessions plan me daal dein (maslan 12). PT book karte waqt "Plan se" chunein — session ka alag bill nahi banta, trainer ki commission banti hai.') },
            { icon: Dumbbell, color: '#7c3aed', title: tr('Qeemat badalna'), text: tr('Nayi qeemat agli sale se lagti hai. Purane members apni qeemat par chalte rehte hain. Band plan bikta nahi.') },
          ]}
          shortcuts={[['N', tr('naya plan')], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PlanModal({ plan, onClose }: { plan: MembershipPlan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const s = (v?: number | string | null) => (v == null ? '' : String(v));
  const [f, setF] = useState({
    name: plan?.name ?? '', code: plan?.code ?? '', planType: (plan?.planType ?? 'MONTHLY') as PlanType, durationDays: s(plan?.durationDays ?? 30),
    price: s(plan?.price), registrationFee: s(plan?.registrationFee ?? ''), securityDeposit: s(plan?.securityDeposit ?? ''),
    isUnlimited: plan?.isUnlimited ?? true, visitLimit: s(plan?.visitLimit), accessAllHours: plan?.accessAllHours ?? true,
    accessTimeStart: plan?.accessTimeStart ?? '06:00', accessTimeEnd: plan?.accessTimeEnd ?? '22:00', accessDays: plan?.accessDays ?? [0, 1, 2, 3, 4, 5, 6],
    allowFreeze: plan?.allowFreeze ?? false, maxFreezeDays: s(plan?.maxFreezeDays || 15), freezeFee: s(plan?.freezeFee || ''),
    includesPersonalTraining: plan?.includesPersonalTraining ?? false, personalTrainingSessions: s(plan?.personalTrainingSessions || ''),
    includesClasses: plan?.includesClasses ?? false, includesLockerFacility: plan?.includesLockerFacility ?? false, includesTowelService: plan?.includesTowelService ?? false,
    includesSteamSauna: plan?.includesSteamSauna ?? false, includesNutritionPlan: plan?.includesNutritionPlan ?? false, includesGuestPasses: s(plan?.includesGuestPasses || ''),
    benefits: (plan?.benefits ?? []).join('\n'), description: plan?.description ?? '', isFeatured: plan?.isFeatured ?? false, isActive: plan?.isActive ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const error = f.name.trim().length < 2 ? tr('Plan ka naam likhein')
    : f.price === '' ? tr('Qeemat likhein')
      : !(Number(f.durationDays) >= 1) ? tr('Kitne din likhein')
        : !f.isUnlimited && !(Number(f.visitLimit) >= 1) ? tr('Visits ki tadaad likhein')
          : f.allowFreeze && !(Number(f.maxFreezeDays) >= 1) ? tr('Freeze ke din likhein')
            : f.includesPersonalTraining && !(Number(f.personalTrainingSessions) >= 1) ? tr('PT sessions ki tadaad likhein')
              : !f.accessAllHours && f.accessTimeStart >= f.accessTimeEnd ? tr('Gym ka waqt sahi likhein')
                : undefined;
  const save = useMutation({
    mutationFn: () => {
      const body: PlanInput = {
        name: f.name.trim(), code: f.code.trim() || undefined, planType: f.planType, durationDays: Number(f.durationDays), price: Number(f.price),
        registrationFee: Number(f.registrationFee) || 0, securityDeposit: Number(f.securityDeposit) || 0,
        isUnlimited: f.isUnlimited, ...(f.isUnlimited ? {} : { visitLimit: Number(f.visitLimit) }),
        accessAllHours: f.accessAllHours, ...(f.accessAllHours ? {} : { accessTimeStart: f.accessTimeStart, accessTimeEnd: f.accessTimeEnd }), accessDays: f.accessDays,
        allowFreeze: f.allowFreeze, ...(f.allowFreeze && { maxFreezeDays: Number(f.maxFreezeDays), freezeFee: Number(f.freezeFee) || 0 }),
        includesPersonalTraining: f.includesPersonalTraining, ...(f.includesPersonalTraining && { personalTrainingSessions: Number(f.personalTrainingSessions) }),
        includesClasses: f.includesClasses, includesLockerFacility: f.includesLockerFacility, includesTowelService: f.includesTowelService,
        includesSteamSauna: f.includesSteamSauna, includesNutritionPlan: f.includesNutritionPlan, includesGuestPasses: Number(f.includesGuestPasses) || 0,
        benefits: f.benefits.split('\n').map((b) => b.trim()).filter(Boolean).slice(0, 20), description: f.description.trim() || undefined,
        isFeatured: f.isFeatured, isActive: f.isActive,
      };
      return plan ? membershipPlansApi.update(plan.id, body) : membershipPlansApi.create(body);
    },
    onSuccess: () => { toast.success(tr('Plan save ho gaya')); qc.invalidateQueries({ queryKey: [GYM_KEYS.plans] }); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Plan save nahi hua'))),
  });
  const toggleDay = (d: number) => set('accessDays', f.accessDays.includes(d) ? f.accessDays.filter((x) => x !== d) : [...f.accessDays, d].sort());
  return (
    <Modal open onClose={onClose} size="lg" title={plan ? tr('{{name}} — badlein', { name: plan.name }) : tr('Naya plan')} description={plan ? tr('Nayi qeemat agli sale se lagegi') : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>{tr('Save')}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input wrapperClassName="sm:col-span-2" label={tr('Naam')} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={tr('Mahana / Couple / Student')} maxLength={80} />
          <Input label={tr('Code')} value={f.code} onChange={(e) => set('code', e.target.value)} placeholder={tr('M1')} hint={tr('Marzi hai')} maxLength={30} />
          <Select label={tr('Plan type')} value={f.planType} onChange={(e) => { const t = e.target.value as PlanType; set('planType', t); set('durationDays', String(PLAN_TYPES.find((x) => x.value === t)?.days ?? 30)); }}
            options={PLAN_TYPES.map((t) => ({ value: t.value, label: t.label }))} hint={tr('Din khud bhar jate hain')} />
          <Input label={tr('Kitne din')} inputMode="numeric" value={f.durationDays} onChange={(e) => set('durationDays', e.target.value.replace(/\D/g, ''))} />
          <Input label={tr('Qeemat (Rs)')} inputMode="decimal" value={f.price} onChange={(e) => set('price', num(e.target.value))} placeholder="3000" />
          <Input label={tr('Admission fee')} inputMode="decimal" value={f.registrationFee} onChange={(e) => set('registrationFee', num(e.target.value))} placeholder="0" hint={tr('Sirf pehli dafa')} />
          <Input label={tr('Security deposit')} inputMode="decimal" value={f.securityDeposit} onChange={(e) => set('securityDeposit', num(e.target.value))} placeholder="0" hint={tr('Locker / card ki')} />
          <Input label={tr('Mehmaan pass')} inputMode="numeric" value={f.includesGuestPasses} onChange={(e) => set('includesGuestPasses', e.target.value.replace(/\D/g, ''))} placeholder="0" hint={tr('Dost saath la sakta hai')} />
        </div>

        <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2">
          <Switch checked={f.isUnlimited} onChange={(e) => set('isUnlimited', e.target.checked)} label={tr('Jitni dafa chahein')} description={tr('Off karein to visits gin kar')} />
          {!f.isUnlimited && <Input label={tr('Kitni visits')} inputMode="numeric" value={f.visitLimit} onChange={(e) => set('visitLimit', e.target.value.replace(/\D/g, ''))} placeholder="12" />}
          <Switch checked={f.accessAllHours} onChange={(e) => set('accessAllHours', e.target.checked)} label={tr('Gym ke poore waqt')} description={tr('Off karein to sirf subah / ladies timing')} />
          {!f.accessAllHours && (
            <div className="grid grid-cols-2 gap-2">
              <Input label={tr('Se')} type="time" value={f.accessTimeStart} onChange={(e) => set('accessTimeStart', e.target.value)} />
              <Input label={tr('Tak')} type="time" value={f.accessTimeEnd} onChange={(e) => set('accessTimeEnd', e.target.value)} />
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{tr('Kin dinon')}</p>
            <div className="flex flex-wrap gap-1">{WEEKDAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => toggleDay(i)} className={`h-8 rounded-lg px-2.5 text-[0.75rem] font-medium ring-1 ${f.accessDays.includes(i) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'}`}>{d}</button>
            ))}</div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2">
          <Switch checked={f.allowFreeze} onChange={(e) => set('allowFreeze', e.target.checked)} label={tr('Freeze ki ijazat')} description={tr('Safar / beemari me din rok sakein')} />
          {f.allowFreeze && (
            <div className="grid grid-cols-2 gap-2">
              <Input label={tr('Zyada se zyada din')} inputMode="numeric" value={f.maxFreezeDays} onChange={(e) => set('maxFreezeDays', e.target.value.replace(/\D/g, ''))} />
              <Input label={tr('Freeze fee')} inputMode="decimal" value={f.freezeFee} onChange={(e) => set('freezeFee', num(e.target.value))} placeholder="0" />
            </div>
          )}
          <Switch checked={f.includesPersonalTraining} onChange={(e) => set('includesPersonalTraining', e.target.checked)} label={tr('PT sessions shamil')} description={tr('PT package')} />
          {f.includesPersonalTraining && <Input label={tr('PT sessions')} inputMode="numeric" value={f.personalTrainingSessions} onChange={(e) => set('personalTrainingSessions', e.target.value.replace(/\D/g, ''))} placeholder="12" />}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Switch checked={f.includesClasses} onChange={(e) => set('includesClasses', e.target.checked)} label={tr('Group classes')} />
          <Switch checked={f.includesLockerFacility} onChange={(e) => set('includesLockerFacility', e.target.checked)} label={tr('Locker')} />
          <Switch checked={f.includesTowelService} onChange={(e) => set('includesTowelService', e.target.checked)} label={tr('Towel')} />
          <Switch checked={f.includesSteamSauna} onChange={(e) => set('includesSteamSauna', e.target.checked)} label={tr('Steam / sauna')} />
          <Switch checked={f.includesNutritionPlan} onChange={(e) => set('includesNutritionPlan', e.target.checked)} label={tr('Diet plan')} />
          <Switch checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} label={tr('Upar dikhayein')} />
        </div>
        <Textarea label={tr('Faide (har line ek)')} value={f.benefits} onChange={(e) => set('benefits', e.target.value)} rows={3} placeholder={tr('Free diet chart\nMahine me ek body check')} />
        <Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} label={tr('Chalu')} description={tr('Band plan bikta nahi; is ke members chalte rehte hain')} />
        {error && <p className="text-[0.8125rem] text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
