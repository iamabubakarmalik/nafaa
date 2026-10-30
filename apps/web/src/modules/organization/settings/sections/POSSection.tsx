/**
 * Counter rules: the payment method checkout opens with, a customer on every
 * bill, hand discounts and their ceiling, which actions need the owner's PIN,
 * and the industry rules a counter needs (dine-in service charge for a
 * restaurant, exchange days for garments). The POS follows these and the
 * server checks them again on every bill.
 */

import { ArrowLeftRight, Ban, CreditCard, KeyRound, Monitor, Percent, Printer, Receipt, RotateCcw, ShieldCheck, Tag, Users, UtensilsCrossed } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { ChoiceGroup, Divider, Field, NumberInput, PageLink, SectionCard, Toggle } from '../components/SettingsBlocks';
import { Badge, Alert } from '@/design-system/components';
import { SettingLink } from '../components/SettingsFrame';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';
import { PosCounterSettings } from './_PosCounter';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { t } from '@core/i18n';

const QUICK_LIMITS = [5, 10, 15, 20, 25];

export function POSSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const hasPin = !!settings.hasManagerPin;
  const max = Number(draft.maxDiscountPercent) || 0;
  const industry = useCurrentIndustry()?.id;
  const service = Number(draft.serviceChargePct) || 0;
  const exchange = Number(draft.exchangeDays) || 0;
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <PosCounterSettings canEdit={canEdit} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={t('Payment')} desc={t('Checkout khulte hi yeh tareeqa chuna hota hai')} icon={CreditCard} color="emerald">
          <Field label={t('Pehle se chuna payment')} hint={t('Cashier har bill par badal sakta hai; yeh sirf shuru ka chunao hai.')}>
            <ChoiceGroup value={draft.defaultPaymentMethod} onChange={(v) => set('defaultPaymentMethod', v)} columns={3}
              options={[
                { value: 'CASH', label: t('Cash') },
                { value: 'CARD', label: t('Card') },
                { value: 'JAZZCASH', label: t('JazzCash') },
                { value: 'EASYPAISA', label: t('EasyPaisa') },
                { value: 'BANK_TRANSFER', label: t('Bank') },
                { value: 'RAAST', label: t('Raast') },
              ]} />
          </Field>
        </SectionCard>

        <SectionCard title={t('Bill')} desc={t('Har bill par lagne wale usool')} icon={Users} color="blue">
          <Toggle checked={draft.requireCustomerForSale} onChange={(v) => set('requireCustomerForSale', v)} icon={Users}
            label={t('Har bill par customer zaroori')}
            desc={t('Bagair customer chune bill nahi banega. Walk-in ke liye ek \'Walk-in\' customer bana lein.')} />
        </SectionCard>
      </div>

      <SectionCard title={t('Discount')} desc={t('Cashier haath se kitna Discount de sakta hai (codes aur points ke apne usool hain)')} icon={Percent} color="amber"
        badge={<Badge size="xs" variant={draft.allowDiscount ? 'warning' : 'default'}><span className="opacity-70">{t('Had')}</span>{draft.allowDiscount ? `${max}%` : t('Band')}</Badge>}>
        <Toggle checked={draft.allowDiscount} onChange={(v) => set('allowDiscount', v)} icon={Tag}
          label={t('Haath se Discount')}
          desc={draft.allowDiscount ? t('Cashier bill par Discount de sakta hai') : t('Band — counter par Discount ka button kaam nahi karega')} />
        {draft.allowDiscount && (
          <>
            <Divider />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-start">
              <Field label={t('Zyada se zyada Discount')} hint={hasPin ? t('Is se zyada sirf malik ke PIN se') : t('Is se zyada bilkul nahi (malik ka PIN lagayein to PIN se ho sakega)')}>
                <NumberInput value={draft.maxDiscountPercent} onChange={(v) => set('maxDiscountPercent', v)} min={0} max={100} suffix="%" />
              </Field>
              <div>
                <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">{t('Jaldi chunein')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_LIMITS.map((p) => (
                    <button key={p} type="button" onClick={() => set('maxDiscountPercent', p)}
                      className={max === p ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-fg' : 'rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}>
                      {p}%
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">{t('Misaal: {{value}} ke bill par {{value2}} tak Discount.', { value: formatPKR(1000), value2: formatPKR((1000 * max) / 100) })}</p>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {(industry === 'restaurant' || industry === 'garments') && (
        <div className="grid gap-4 xl:grid-cols-2">
          {industry === 'restaurant' && (
            <SectionCard title={t('Service charge')} desc={t('Table par khane (dine-in) ke bill par lagta hai')} icon={UtensilsCrossed} color="emerald"
              badge={<Badge size="xs" variant={service ? 'success' : 'default'}><span className="opacity-70">{t('Ab')}</span>{service ? `${service}%` : t('Nahi')}</Badge>}>
              <Field label={t('Dine-in service charge')} hint={t('Har naya dine-in order isi % se shuru hota hai; waiter ek order par badal sakta hai. 0 = koi service charge nahi.')}>
                <NumberInput value={draft.serviceChargePct} onChange={(v) => set('serviceChargePct', v)} min={0} max={100} step={0.5} suffix="%" />
              </Field>
              {service > 0 && <p className="mt-2 text-xs text-slate-500">{t('Misaal: {{value}} ke khane par {{value2}} service charge.', { value: formatPKR(1000), value2: formatPKR((1000 * service) / 100) })}</p>}
            </SectionCard>
          )}
          {industry === 'garments' && (
            <SectionCard title={t('Exchange')} desc={t('Bika hua maal kitne din tak badla ja sakta hai')} icon={ArrowLeftRight} color="blue"
              badge={<Badge size="xs" variant={exchange ? 'info' : 'default'}><span className="opacity-70">{t('Had')}</span>{exchange ? t('{{exchange}} din', { exchange }) : t('Nahi')}</Badge>}>
              <Field label={t('Exchange ke din')} hint={t('Bill ke itne din baad tak maal badla ja sakta hai. 0 = koi had nahi.')}>
                <NumberInput value={draft.exchangeDays} onChange={(v) => set('exchangeDays', Math.round(v))} min={0} max={365} suffix="din" />
              </Field>
            </SectionCard>
          )}
        </div>
      )}

      <SectionCard title={t('Malik ka PIN kab maangein')} desc={t('In kaamon se pehle counter par malik ka PIN maanga jayega')} icon={ShieldCheck} color="violet"
        badge={<Badge size="xs" variant={hasPin ? 'success' : 'danger'}><span className="opacity-70">{t('PIN')}</span>{hasPin ? t('Laga hua') : t('Nahi laga')}</Badge>}>
        {!hasPin && (
          <Alert tone="warning" title={t('Abhi PIN nahi laga')} icon={<KeyRound className="h-4 w-4" />}>
            {t('PIN ke bagair yeh usool kaam nahi karte (sirf Discount ki had band rehti hai).')}{' '}
            <SettingLink to="/settings/security" find={t('Malik ka PIN')} className="font-semibold underline underline-offset-2">{t('PIN lagayein')}</SettingLink>
          </Alert>
        )}
        <div className="mt-1">
          <Toggle checked={draft.requirePinForVoid} onChange={(v) => set('requirePinForVoid', v)} icon={Ban}
            label={t('Bill cancel par PIN')} desc={t('Bana hua bill cancel karne se pehle')} />
          <Toggle checked={draft.requirePinForRefund} onChange={(v) => set('requirePinForRefund', v)} icon={RotateCcw}
            label={t('Return par PIN')} desc={t('Maal wapas le kar paise lautane se pehle')} />
          <Toggle checked={draft.requirePinForDiscount} onChange={(v) => set('requirePinForDiscount', v)} icon={Percent}
            label={t('Har Discount par PIN')} desc={t('Had ke andar bhi, har haath ke Discount par')} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('Customer ki credit limit se zyada udhaar par bhi PIN maanga jata hai.')}</p>
      </SectionCard>

      <SectionCard title={t('Counter se jure pages')} desc={t('Bill, printer aur har counter ki apni settings')} icon={Monitor} color="slate">
        <div className="grid gap-2 sm:grid-cols-3">
          <PageLink to="/settings/receipt" icon={Receipt} title={t('Receipt')} desc={t('Bill ka design aur kaghaz')} />
          <PageLink to="/settings/printing" icon={Printer} title={t('Printing')} desc={t('A4, thermal, colour')} />
          <PageLink to="/settings/hardware" icon={Monitor} title={t('POS hardware')} desc={t('Printer, drawer, tarazu')} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {t('Udhaar par bill ka profit kab gina jaye — paisa milne par ya bill bante hi?')}{' '}
          <SettingLink to="/settings/reports" find={t('Udhaar ka profit kab ginein')} className="font-semibold text-brand-700 underline underline-offset-2">{t('Udhaar ka profit kab ginein')}</SettingLink>
          {t('(Settings → Reports). Galle ka cash is se nahi badalta: udhaar wala hissa kabhi galle me nahi ginta.')}
        </p>
        <p className="mt-3 text-xs text-slate-500">{t('Apna layout, auto-print aur printer har counter ke liye alag hain — POS khol kar ⚙️ se badlein. Shortcuts ke liye counter par ? dabayein.')}</p>
      </SectionCard>
    </div>
  );
}
