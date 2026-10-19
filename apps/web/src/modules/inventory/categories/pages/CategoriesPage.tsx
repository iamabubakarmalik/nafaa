/**
 * Categories setup page: the shared taxonomy page with colour and emoji.
 */

import { Layers } from 'lucide-react';
import { useIndustryPresets } from '@industries/_shared/presets/useIndustryPresets';
import { TaxonomyPage, type Draft } from '../../taxonomy/TaxonomyPage';

const payload = (d: Draft) => ({ name: d.name, color: d.color, icon: d.icon || '', isActive: d.isActive ?? true });

export default function CategoriesPage() {
  const presets = useIndustryPresets();
  return (
    <TaxonomyPage config={{
      kind: 'category', title: 'Categories', one: 'category', icon: Layers,
      productParam: 'categoryId', noneFilter: true, canSwitchOff: true, color: true, emoji: true,
      presets: presets.categories, refreshKeys: ['categories'], toPayload: payload,
      industry: { name: presets.industryName, emoji: presets.industryEmoji },
      guide: [
        { title: 'Category kya hai', body: 'Maal ka group — jaise Mashroobat, Bakery, Safai. Har product ki ek category hoti hai.' },
        { title: 'Kyun zaroori', body: 'POS par jaldi dhoondna, aur reports me pata chalta hai kaunsi category zyada bikti aur kitna profit deti hai.' },
        { title: 'Period badlein', body: 'Upar se period chunein — har category ki sale, profit aur stock ki qeemat usi period ki dikhegi.' },
        { title: 'Milana aur band karna', body: 'Do jaisi categories hon to "Doosri me milayein". Band category naye products ke liye chunne me nahi aati; jin products par pehle se lagi hai woh wese hi rehte hain.' },
      ],
    }} />
  );
}
