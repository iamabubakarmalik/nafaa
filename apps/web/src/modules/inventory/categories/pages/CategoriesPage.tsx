/**
 * Categories setup page: the shared taxonomy page with colour and emoji.
 */

import { Layers } from 'lucide-react';
import { useIndustryPresets } from '@industries/_shared/presets/useIndustryPresets';
import { TaxonomyPage, type Draft } from '../../taxonomy/TaxonomyPage';
import { t } from '@core/i18n';

const payload = (d: Draft) => ({ name: d.name, color: d.color, icon: d.icon || '', isActive: d.isActive ?? true, parentId: d.parentId ?? null });

export default function CategoriesPage() {
  const presets = useIndustryPresets();
  return (
    <TaxonomyPage config={{
      kind: 'category', title: t('Categories'), one: 'category', icon: Layers,
      productParam: 'categoryId', noneFilter: true, canSwitchOff: true, color: true, emoji: true,
      presets: presets.categories, refreshKeys: ['categories'], toPayload: payload, tree: true,
      industry: { name: presets.industryName, emoji: presets.industryEmoji },
      guide: [
        { title: t('Category kya hai'), body: t('Maal ka group — jaise Mashroobat, Bakery, Safai. Har product ki ek category hoti hai.') },
        { title: t('Sub-category'), body: t('Category ke andar chhota group — jaise Mashroobat › Cold drinks. "Tree" me kheench kar kisi category ke beech me chhorein, ya badlein me "Kis ke andar" chunein. Upar wali category ka filter neeche wali sab products dikhata hai.') },
        { title: t('Kyun zaroori'), body: t('POS par jaldi dhoondna, aur reports me pata chalta hai kaunsi category zyada bikti aur kitna profit deti hai.') },
        { title: t('Period badlein'), body: t('Upar se period chunein — har category ki sale, profit aur stock ki qeemat usi period ki dikhegi.') },
        { title: t('Milana aur band karna'), body: t('Do jaisi categories hon to "Doosri me milayein". Band category naye products ke liye chunne me nahi aati; jin products par pehle se lagi hai woh wese hi rehte hain.') },
      ],
    }} />
  );
}
