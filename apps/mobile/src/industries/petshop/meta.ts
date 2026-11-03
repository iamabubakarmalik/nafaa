/** Pet shop labels and helpers (mirror of the web petshop lib/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { AnimalStatus, GroomingService, GroomingStatus, PetLifeStage, PetSpecies } from './api';

export const PET_KEYS = { animals: 'petshop-animals', animal: 'petshop-animal', grooming: 'petshop-grooming', groomers: 'petshop-groomers', profiles: 'petshop-profiles', overview: 'petshop-dashboard-overview', posAnimals: 'petshop-pos-animals' } as const;

/** Lists a money action can change, refreshed after it. */
const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshPet(keys: string[], money = false) {
  [...keys, PET_KEYS.overview, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const SPECIES: Record<PetSpecies, { label: string; emoji: string }> = {
  DOG: { label: msg('Kutta'), emoji: '🐕' }, CAT: { label: msg('Billi'), emoji: '🐈' }, BIRD: { label: msg('Parinda / tota'), emoji: '🐦' },
  FISH: { label: msg('Machhli'), emoji: '🐟' }, RABBIT: { label: msg('Khargosh'), emoji: '🐇' }, HAMSTER: { label: msg('Hamster'), emoji: '🐹' },
  GUINEA_PIG: { label: msg('Guinea pig'), emoji: '🐹' }, TURTLE: { label: msg('Kachhua'), emoji: '🐢' }, REPTILE: { label: msg('Reptile'), emoji: '🦎' },
  SNAKE: { label: msg('Saanp'), emoji: '🐍' }, FERRET: { label: msg('Ferret'), emoji: '🦦' }, OTHER: { label: msg('Aur'), emoji: '🐾' },
};
export const speciesEmoji = (v?: string | null) => (v && v in SPECIES ? SPECIES[v as PetSpecies].emoji : '🐾');
export const speciesLabel = (v?: string | null) => (v && v in SPECIES ? `${SPECIES[v as PetSpecies].emoji} ${t(SPECIES[v as PetSpecies].label)}` : v || '—');
export const speciesOptions = () => Object.entries(SPECIES).map(([value, s]) => ({ value, label: `${s.emoji} ${t(s.label)}` }));

export const ANIMAL_STATUS: Record<AnimalStatus, { label: string; tone: StatusTone }> = {
  AVAILABLE: { label: msg('Bikne ke liye'), tone: 'success' }, RESERVED: { label: msg('Rok liya'), tone: 'warning' }, SOLD: { label: msg('Bik gaya'), tone: 'info' },
  RETURNED: { label: msg('Wapas gaya'), tone: 'neutral' }, DECEASED: { label: msg('Mar gaya'), tone: 'danger' },
};
export const GROOM_STATUS: Record<GroomingStatus, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: msg('Booking'), tone: 'neutral' }, CONFIRMED: { label: msg('Pakki'), tone: 'info' }, IN_PROGRESS: { label: msg('Kaam jari'), tone: 'warning' },
  READY_FOR_PICKUP: { label: msg('Tayyar — le jayein'), tone: 'accent' }, COMPLETED: { label: msg('Le gaye'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
  NO_SHOW: { label: msg('Nahi aaye'), tone: 'danger' },
};

export const SERVICE: Record<GroomingService, string> = {
  BATH: msg('Nahlana'), HAIRCUT: msg('Baal katna'), FULL_GROOMING: msg('Poori grooming'), NAIL_TRIMMING: msg('Nakhun katna'), EAR_CLEANING: msg('Kaan safai'),
  TEETH_CLEANING: msg('Daant safai'), ANAL_GLAND: msg('Anal gland'), FLEA_TREATMENT: msg('Pissu ka ilaj'), DEWORMING: msg('Deworming'), DELUXE_PACKAGE: msg('Deluxe package'), OTHER: msg('Aur'),
};
export const serviceLabel = (v?: string | null) => (v && v in SERVICE ? t(SERVICE[v as GroomingService]) : v || '—');

export const CATEGORY_GROUPS: Array<{ id: 'food' | 'medicine' | 'care' | 'gear' | 'aquarium'; label: string; items: Array<[string, string]> }> = [
  { id: 'food', label: msg('Khana'), items: [
    ['DOG_FOOD_DRY', msg('Kutte ka dry food')], ['DOG_FOOD_WET', msg('Kutte ka wet food')], ['DOG_TREATS', msg('Kutte ke treats')], ['CAT_FOOD_DRY', msg('Billi ka dry food')],
    ['CAT_FOOD_WET', msg('Billi ka wet food')], ['CAT_TREATS', msg('Billi ke treats')], ['BIRD_FOOD', msg('Parinde ka dana')], ['FISH_FOOD', msg('Machhli ka khana')],
    ['RABBIT_FOOD', msg('Khargosh ka khana')], ['HAMSTER_FOOD', msg('Hamster ka khana')], ['REPTILE_FOOD', msg('Reptile food')], ['TRAINING_TREATS', msg('Training treats')],
  ] },
  { id: 'medicine', label: msg('Dawai'), items: [['VET_MEDICINE', msg('Dawai')], ['VET_VACCINE', msg('Vaccine')], ['VET_DEWORMER', msg('Deworming dawai')], ['VET_SUPPLEMENT', msg('Supplement')]] },
  { id: 'care', label: msg('Safai / grooming'), items: [['VET_SHAMPOO', msg('Shampoo')], ['VET_GROOMING', msg('Grooming saman')], ['VET_HYGIENE', msg('Safai')], ['CAT_LITTER', msg('Litter')]] },
  { id: 'gear', label: msg('Saman'), items: [
    ['DOG_ACCESSORY', msg('Kutte ka saman')], ['DOG_TOY', msg('Kutte ke khilone')], ['DOG_LEASH_COLLAR', msg('Patta / rassi')], ['DOG_BED', msg('Kutte ka bistar')],
    ['CAT_ACCESSORY', msg('Billi ka saman')], ['CAT_TOY', msg('Billi ke khilone')], ['CAT_BED', msg('Billi ka bistar')], ['CAT_SCRATCH_POST', msg('Scratch post')],
    ['BIRD_CAGE', msg('Pinjra')], ['BIRD_ACCESSORY', msg('Parinde ka saman')], ['RABBIT_ACCESSORY', msg('Khargosh ka saman')], ['HAMSTER_CAGE', msg('Hamster pinjra')],
    ['REPTILE_ACCESSORY', msg('Reptile saman')], ['TRAINING_TOOL', msg('Training')], ['CARRIER', msg('Carrier')], ['TRANSPORT_CAGE', msg('Safar ka pinjra')], ['OTHER', msg('Aur')],
  ] },
  { id: 'aquarium', label: msg('Aquarium'), items: [
    ['AQUARIUM_TANK', msg('Tank')], ['AQUARIUM_FILTER', msg('Filter')], ['AQUARIUM_DECOR', msg('Sajawat')], ['AQUARIUM_PLANT', msg('Paude')],
    ['AQUARIUM_HEATER', msg('Heater')], ['AQUARIUM_LIGHT', msg('Light')], ['AQUARIUM_ACCESSORY', msg('Aquarium saman')],
  ] },
];
const CATEGORY_LABEL = new Map(CATEGORY_GROUPS.flatMap((g) => g.items));
export const categoryLabel = (v?: string | null) => (v ? t(CATEGORY_LABEL.get(v) ?? v) : '—');

export const LIFE_STAGE: Record<PetLifeStage, string> = { PUPPY: msg('Puppy'), KITTEN: msg('Kitten'), ADULT: msg('Bara'), SENIOR: msg('Buzurg'), ALL_STAGES: msg('Har umar') };

export const RECORD_TYPES = [
  { value: 'VACCINATION', label: msg('Vaccine') }, { value: 'DEWORMING', label: msg('Deworming') }, { value: 'CHECKUP', label: msg('Check-up') },
  { value: 'TREATMENT', label: msg('Ilaj') }, { value: 'OTHER', label: msg('Aur') },
];
export const recordLabel = (v: string) => { const r = RECORD_TYPES.find((x) => x.value === v); return r ? t(r.label) : v; };

export const SOURCES = [
  { value: 'BREEDER', label: msg('Breeder') }, { value: 'MANDI', label: msg('Mandi') }, { value: 'IMPORT', label: msg('Import') },
  { value: 'CUSTOMER', label: msg('Customer se liya') }, { value: 'OWN', label: msg('Apne ghar ka') },
];
export const GENDERS = [{ value: 'Male', label: msg('Nar (male)') }, { value: 'Female', label: msg('Mada (female)') }, { value: 'Pair', label: msg('Jora') }];
export const TEMPERS = [msg('Seedha'), msg('Darta hai'), msg('Kaat leta hai'), msg('Bohat chanchal')];
export const WEEKDAYS = [msg('Itwar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];
export const BRANDS = ['Royal Canin', 'Pedigree', 'Whiskas', 'Drools', 'Me-O', 'Purina', 'Reflex'];
export const DOSAGE_FORMS = [msg('Tablet'), msg('Syrup'), msg('Injection'), msg('Drops'), msg('Spray'), msg('Powder')];
export const PET_SIZES = [msg('Chhota'), msg('Darmiyana'), msg('Bara'), 'XL'];

/** Age from months: "8 mahine", "2 saal 3 mahine". */
export function ageText(months?: number | null) {
  if (months === null || months === undefined) return '';
  if (months < 12) return t('{{months}} mahine', { months });
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? t('{{y}} saal {{m}} mahine', { y, m }) : t('{{y}} saal', { y });
}
