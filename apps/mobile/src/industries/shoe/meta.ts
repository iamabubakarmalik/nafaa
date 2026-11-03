/** Shoe labels, query keys and helpers shared by the shoe screens (mirror of the web shoe components/meta.ts). */

import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';

export const META_KEY = 'shoe-meta';
export const REQUEST_KEY = 'shoe-try-on';
export const CHART_KEY = 'shoe-size-charts';
export const DASH_KEY = 'shoe-dashboard-overview';

export function refreshShoe(keys: string[], money = false) {
  [...keys, DASH_KEY, 'shoe-try-on-summary', ...(money ? ['customers-directory', 'customer', 'sales-history', 'dashboard', 'inv', 'offline'] : [])]
    .forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export const GENDERS = [
  { value: 'MEN', label: msg('Gents') }, { value: 'WOMEN', label: msg('Ladies') }, { value: 'BOYS', label: msg('Larke') },
  { value: 'GIRLS', label: msg('Larkiyan') }, { value: 'BABY', label: msg('Chhote bachay') }, { value: 'UNISEX', label: msg('Sab ke liye') },
];
export const genderLabel = (g?: string | null) => { const x = GENDERS.find((v) => v.value === g); return x ? t(x.label) : '—'; };

export const SHOE_TYPES: Array<{ value: string; label: string; group: string }> = [
  { value: 'MENS_FORMAL', label: msg('Formal'), group: msg('Gents') }, { value: 'MENS_SNEAKERS', label: msg('Joggers / sneakers'), group: msg('Gents') },
  { value: 'MENS_LOAFERS', label: msg('Loafers'), group: msg('Gents') }, { value: 'MENS_SANDALS', label: msg('Chappal / sandal'), group: msg('Gents') },
  { value: 'MENS_PESHAWARI', label: msg('Peshawari'), group: msg('Gents') }, { value: 'MENS_KHUSSA', label: msg('Khussa'), group: msg('Gents') },
  { value: 'MENS_BOOTS', label: msg('Boots'), group: msg('Gents') }, { value: 'MENS_SLIPPERS', label: msg('Slippers'), group: msg('Gents') },
  { value: 'WOMENS_HEELS', label: msg('Heels'), group: msg('Ladies') }, { value: 'WOMENS_FLATS', label: msg('Flats / pumps'), group: msg('Ladies') },
  { value: 'WOMENS_SANDALS', label: msg('Sandal / chappal'), group: msg('Ladies') }, { value: 'WOMENS_KHUSSA', label: msg('Khussa'), group: msg('Ladies') },
  { value: 'WOMENS_SNEAKERS', label: msg('Joggers'), group: msg('Ladies') }, { value: 'WOMENS_WEDGES', label: msg('Wedges'), group: msg('Ladies') },
  { value: 'BRIDAL_SHOES', label: msg('Bridal'), group: msg('Ladies') },
  { value: 'KIDS_SCHOOL', label: msg('School shoes'), group: msg('Bachay') }, { value: 'KIDS_SNEAKERS', label: msg('Joggers'), group: msg('Bachay') },
  { value: 'KIDS_SANDALS', label: msg('Sandal'), group: msg('Bachay') }, { value: 'KIDS_CASUAL', label: msg('Casual'), group: msg('Bachay') },
  { value: 'BABY_SHOES', label: msg('Baby shoes'), group: msg('Bachay') },
  { value: 'RUNNING_SHOES', label: msg('Running'), group: msg('Sports') }, { value: 'FOOTBALL_STUDS', label: msg('Football studs'), group: msg('Sports') },
  { value: 'CRICKET_SPIKES', label: msg('Cricket spikes'), group: msg('Sports') }, { value: 'TRAINING_SHOES', label: msg('Gym / training'), group: msg('Sports') },
  { value: 'SAFETY_SHOES', label: msg('Safety shoes'), group: msg('Kaam') }, { value: 'RAIN_BOOTS', label: msg('Barish ke boots'), group: msg('Kaam') },
  { value: 'SOCK', label: msg('Jurabain'), group: msg('Saman') }, { value: 'SHOE_POLISH', label: msg('Polish / cream'), group: msg('Saman') },
  { value: 'SHOE_LACE', label: msg('Tasme'), group: msg('Saman') }, { value: 'SHOE_INSOLE', label: msg('Insole'), group: msg('Saman') }, { value: 'OTHER', label: msg('Doosra'), group: msg('Saman') },
];
export const typeLabel = (v?: string | null) => { const x = SHOE_TYPES.find((s) => s.value === v); return x ? t(x.label) : v ? v.replace(/_/g, ' ').toLowerCase() : '—'; };
export const SEASONS = ['Summer', 'Winter', 'Eid', 'Shaadi', 'School', 'All season'];
export const SYSTEM_LABEL: Record<string, string> = { UK: msg('PK / UK'), EU: msg('EU'), KIDS: msg('Bachay'), US: msg('US') };
