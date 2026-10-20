/**
 * Pet shop counter on the shared POS engine. Food and litter sell by pack
 * or by weight (product units), medicines show their expiry, and live
 * animals sit on the counter as their own cards: adding one puts the
 * animal's catalogue line (stock 1) on the bill, and after the server saves
 * the bill the animal is marked sold. A void or return puts it back on sale.
 */

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bone, CalendarX, Fish, HeartPulse, PawPrint, Pill, ShieldCheck, Syringe } from 'lucide-react';
import type { Product } from '@modules/inventory/products/api/products.api';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { liveAnimalsApi, type PetLiveAnimal } from '../api/live-animals.api';
import { petProductsApi, type PetProductProfile } from '../api/products.api';
import { AnimalBillRetry } from './AnimalBillRetry';
import { ANIMALS_KEY, animalLines, markAnimalsSold } from './animalBill';
import { LIFE_STAGE, PET_KEYS, ageText, categoryGroup, daysFromToday, errorText, speciesLabel } from '../lib/meta';

const isAnimalProduct = (p: Product) => (p as Product & { productType?: string }).productType === 'PET_ANIMAL' || /^PET-/.test(p.sku ?? '');

function animalItem(a: PetLiveAnimal): PosItem {
  const name = [a.name, a.breed || speciesLabel(a.species)].filter(Boolean).join(' · ');
  const product = { id: `animal:${a.id}`, name, price: a.askingPrice, stock: 1, unit: 'pcs', isActive: true, sku: `PET-${a.animalNumber}` } as unknown as Product;
  return {
    id: `animal:${a.id}`,
    product,
    name,
    price: a.askingPrice,
    stock: 1,
    unit: 'pcs',
    image: a.imageUrls?.[0],
    featured: a.isFeatured,
    subline: [a.animalNumber, a.gender, ageText(a.ageMonths), a.color, a.currentCage ? `Cage ${a.currentCage}` : null].filter(Boolean).join(' · '),
    searchText: [a.animalNumber, a.name, a.breed, a.species, speciesLabel(a.species), a.color].filter(Boolean).join(' '),
    badges: [
      ...(a.status === 'RESERVED' ? [{ label: 'Rok liya', tone: 'warning' as const }] : []),
      ...(a.isVaccinated ? [{ label: 'Vaccine', tone: 'success' as const, icon: ShieldCheck }] : [{ label: 'Vaccine nahi', tone: 'danger' as const, icon: Syringe }]),
    ],
    rank: a.status === 'RESERVED' ? 5 : 0,
    meta: { group: 'animal', animalId: a.id, reserved: a.status === 'RESERVED' },
  };
}

function usePetshopCatalog() {
  const profilesQ = useQuery({ queryKey: [PET_KEYS.profiles], queryFn: () => petProductsApi.list(), staleTime: 60_000, retry: 1 });
  const animalsQ = useQuery({
    queryKey: [ANIMALS_KEY],
    queryFn: () => liveAnimalsApi.paged({ status: 'ON_SALE', limit: 100 }).then((r) => r.items),
    staleTime: 30_000, retry: 1,
  });
  const byProduct = new Map<string, PetProductProfile>((profilesQ.data ?? []).map((p) => [p.productId, p]));
  const catalog = useProductCatalog((it): PosItem => {
    if (isAnimalProduct(it.product)) return { ...it, meta: { ...it.meta, hide: true } };
    const p = byProduct.get(it.id);
    if (!p) return it;
    const left = daysFromToday(p.expiryDate);
    const expired = left !== null && left < 0;
    return {
      ...it,
      badges: [
        ...(expired ? [{ label: 'Expire', tone: 'danger' as const, icon: CalendarX }] : left !== null && left <= 30 ? [{ label: `${left} din`, tone: 'warning' as const, icon: CalendarX }] : []),
        ...(p.isPrescriptionOnly ? [{ label: 'Doctor ki parchi', tone: 'info' as const, icon: Pill }] : []),
      ],
      subline: [p.brand, p.species ? speciesLabel(p.species) : null, p.lifeStage ? LIFE_STAGE[p.lifeStage] : null, p.packSize, p.flavor].filter(Boolean).join(' · ') || it.subline,
      searchText: [it.searchText, p.brand, p.species, p.flavor, p.activeIngredient].filter(Boolean).join(' '),
      dim: expired || it.dim,
      rank: expired ? 9 : it.rank,
      meta: { ...it.meta, group: categoryGroup(p.categoryType), expired, rx: p.isPrescriptionOnly },
    };
  }, [profilesQ.data]);
  const items = [...(animalsQ.data ?? []).map(animalItem), ...catalog.items.filter((i) => !i.meta?.hide)];
  return { items, loading: catalog.loading, refreshKeys: [...catalog.refreshKeys, PET_KEYS.profiles, ANIMALS_KEY] };
}

const inGroup = (...ids: string[]) => (i: PosItem) => ids.includes(String(i.meta?.group ?? ''));
const filters: PosFilter[] = [
  { id: 'animals', label: 'Janwar', icon: PawPrint, match: inGroup('animal') },
  { id: 'food', label: 'Khana', icon: Bone, match: inGroup('food') },
  { id: 'medicine', label: 'Dawai', icon: HeartPulse, match: inGroup('medicine') },
  { id: 'aquarium', label: 'Aquarium', icon: Fish, match: inGroup('aquarium') },
];

export const petshopPos: PosIndustryConfig = {
  id: 'petshop',
  label: 'Pet shop',
  useCatalog: usePetshopCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Khana, dawai, brand ya janwar (Persian, tota)…',
  receiptFooter: 'Janwar ki vaccine ka record sambhal kar rakhein.',
  beforeAdd: (item, opts, api) => {
    const animalId = item.meta?.animalId as string | undefined;
    if (animalId && !item.meta?.ready) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) { toast.error('Janwar bechne ke liye internet chahiye'); return 'handled'; }
      if (item.meta?.reserved) toast.warning(`${item.name} kisi ke liye roka hua hai — check kar ke dein`, { duration: 2500 });
      liveAnimalsApi.counterItem(animalId)
        .then((r) => {
          if (api.cart.some((l) => l.productId === r.productId)) { toast.error('Ye janwar bill me pehle se hai'); return; }
          animalLines.add(r.productId);
          api.addItem({ ...item, id: r.productId, product: { ...item.product, id: r.productId }, price: r.price, meta: { ...item.meta, ready: true } }, opts);
        })
        .catch((e) => toast.error(errorText(e, 'Janwar counter par nahi aaya')));
      return 'handled';
    }
    if (item.meta?.expired && !(opts.confirmed ?? []).includes('expired')) toast.warning(`${item.name} expire ho chuka hai — check kar ke dein`, { duration: 2500 });
    return 'continue';
  },
  beforeCheckout: (cart) => {
    const hasAnimal = cart.some((l) => l.productId && animalLines.has(l.productId));
    if (hasAnimal && typeof navigator !== 'undefined' && !navigator.onLine) return 'Janwar ke bill ke liye internet chahiye';
    return null;
  },
  onSale: (sale) => {
    if (!animalLines.size) return;
    const sold = !sale.items || sale.items.some((i) => i.productId && animalLines.has(i.productId));
    animalLines.clear();
    if (sold) void markAnimalsSold(sale.id, sale.saleNumber);
  },
  CartExtra: AnimalBillRetry,
  voiceAliases: { kutta: 'dog', billi: 'cat', tota: 'parrot', machhli: 'fish', khana: 'food', dawai: 'medicine', patta: 'collar' },
};
