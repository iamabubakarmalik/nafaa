/** Services labels and helpers (mirror of the web services-biz components/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { formatDate } from '@/core/format';
import type { StatusTone } from '@/design';

export const SB_KEYS = { jobs: 'sb-jobs', quotes: 'sb-quotes', techs: 'sb-techs', catalog: 'sb-catalog', amc: 'sb-amc', warranty: 'sb-warranty', dash: 'sb-dash' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshServices(money = false) {
  [...Object.values(SB_KEYS), ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

const S = (label: string, tone: StatusTone) => ({ label, tone });
export const JOB_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: S(msg('Kachi entry'), 'neutral'), ENQUIRY: S(msg('Poochh-taachh'), 'info'), QUOTED: S(msg('Quote diya'), 'info'), CONFIRMED: S(msg('Booked'), 'info'), SCHEDULED: S(msg('Waqt tay'), 'info'), RESCHEDULED: S(msg('Naya waqt'), 'info'),
  ASSIGNED: S(msg('Technician laga'), 'info'), DISPATCHED: S(msg('Bheja gaya'), 'accent'), EN_ROUTE: S(msg('Raste me'), 'accent'), ARRIVED: S(msg('Pohanch gaya'), 'accent'), IN_PROGRESS: S(msg('Kaam chal raha'), 'warning'),
  PAUSED: S(msg('Ruka hua'), 'neutral'), AWAITING_PARTS: S(msg('Parts ka intezar'), 'warning'), AWAITING_APPROVAL: S(msg('Customer ki haan baqi'), 'warning'), WARRANTY_HOLD: S(msg('Warranty par ruka'), 'warning'),
  DISPUTED: S(msg('Jhagra'), 'danger'), QUALITY_CHECK: S(msg('Tayyar — bill baqi'), 'success'), UNABLE_TO_COMPLETE: S(msg('Kaam nahi ho saka'), 'danger'), COMPLETED: S(msg('Mukammal'), 'neutral'), CANCELLED: S(msg('Cancel'), 'danger'),
};
export const jobStatus = (s?: string | null) => JOB_STATUS[s ?? ''] ?? S(s ?? '—', 'neutral');
export const PRIORITIES = [['LOW', msg('Aram se')], ['NORMAL', msg('Normal')], ['HIGH', msg('Jaldi')], ['URGENT', msg('Foran')], ['EMERGENCY', msg('Emergency')]] as const;
export const priorityTone = (p: string): StatusTone => (p === 'EMERGENCY' ? 'danger' : p === 'URGENT' ? 'warning' : p === 'HIGH' ? 'warning' : 'neutral');
export const LOCATIONS = [['CUSTOMER_HOME', msg('Customer ke ghar')], ['CUSTOMER_OFFICE', msg('Customer ka office')], ['CUSTOMER_SHOP', msg('Customer ki dukaan')], ['IN_SHOP', msg('Hamari dukaan par')], ['FIELD_SITE', msg('Site par')], ['ONLINE_REMOTE', msg('Online')]] as const;
export const TECH_STATUS: Record<string, { label: string; tone: StatusTone }> = { AVAILABLE: S(msg('Free'), 'success'), ON_JOB: S(msg('Kaam par'), 'accent'), ON_BREAK: S(msg('Break'), 'warning'), OFF_DUTY: S(msg('Duty khatam'), 'neutral'), ON_LEAVE: S(msg('Chhutti'), 'neutral'), UNAVAILABLE: S(msg('Band'), 'danger') };
export const QUOTE_STATUS: Record<string, { label: string; tone: StatusTone }> = { DRAFT: S(msg('Kachchi'), 'neutral'), SENT: S(msg('Bheja'), 'info'), ACCEPTED: S(msg('Manzoor'), 'success'), REJECTED: S(msg('Na-manzoor'), 'danger'), EXPIRED: S(msg('Khatam'), 'neutral'), REVISED: S(msg('Badla'), 'info') };
export const AMC_STATUS: Record<string, { label: string; tone: StatusTone }> = { ACTIVE: S(msg('Chalu'), 'success'), EXPIRED: S(msg('Khatam'), 'neutral'), CANCELLED: S(msg('Cancel'), 'danger'), SUSPENDED: S(msg('Ruka'), 'warning'), RENEWAL_DUE: S(msg('Renew baqi'), 'warning') };
export const CLAIM_STATUS: Record<string, { label: string; tone: StatusTone }> = { SUBMITTED: S(msg('Jama'), 'info'), APPROVED: S(msg('Manzoor'), 'success'), IN_PROGRESS: S(msg('Kaam chal raha'), 'warning'), RESOLVED: S(msg('Hal'), 'success'), REJECTED: S(msg('Na-manzoor'), 'danger') };
export const RESOLUTIONS = [['REPAIR', msg('Theek karein')], ['REPLACE', msg('Badal dein')], ['REFUND', msg('Paisa wapas')], ['NO_FAULT', msg('Koi kharabi nahi')]] as const;
export const CATEGORIES = [['REPAIR', msg('Repair')], ['INSTALLATION', msg('Installation')], ['MAINTENANCE', msg('Maintenance')], ['INSPECTION', msg('Inspection')], ['CLEANING_SERVICE', msg('Safai')], ['UPGRADE', msg('Upgrade')], ['REPLACEMENT', msg('Replacement')], ['DIAGNOSTIC', msg('Check-up')], ['EMERGENCY', msg('Emergency')], ['OTHER_SERVICE', msg('Doosra')]] as const;
export const LEVELS = [['APPRENTICE', msg('Shagird')], ['JUNIOR', msg('Junior')], ['SENIOR', msg('Senior')], ['EXPERT', msg('Expert')], ['MASTER', msg('Master')], ['SUPERVISOR', msg('Supervisor')]] as const;
export const opts = (list: ReadonlyArray<readonly [string, string]>) => list.map(([value, label]) => ({ value, label: t(label) }));
export const labelOf = (list: ReadonlyArray<readonly [string, string]>, v?: string | null) => t(list.find(([k]) => k === v)?.[1] ?? v ?? '—');
export const dateOf = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const SKILLS = ['ELECTRICIAN', 'PLUMBER', 'AC_TECHNICIAN', 'APPLIANCE_REPAIR', 'MOBILE_REPAIR', 'COMPUTER_REPAIR', 'IT_SERVICES', 'CLEANING', 'PEST_CONTROL', 'CARPENTRY', 'PAINTING', 'MASONRY', 'WELDING', 'GLASS_WORK', 'CCTV_INSTALLATION', 'SOLAR_INSTALLATION', 'GENERATOR_SERVICE', 'UPS_SERVICE', 'WATER_TANK_CLEANING', 'HOME_MAINTENANCE', 'OFFICE_MAINTENANCE', 'AUTOMOBILE_MECHANIC', 'MOTORCYCLE_MECHANIC', 'HVAC', 'OTHER'] as const;
export const skillOptions = () => SKILLS.map((v) => ({ value: v, label: v.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ') }));
