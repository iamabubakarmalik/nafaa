/**
 * Tags setup page: the shared taxonomy page with colour. A product can carry
 * many tags (e.g. "Naya", "Sale", "Ramzan").
 */

import { Tag } from 'lucide-react';
import { useIndustryPresets } from '@industries/_shared/presets/useIndustryPresets';
import { TaxonomyPage, type Draft } from '../../taxonomy/TaxonomyPage';
import { t } from '@core/i18n';

const payload = (d: Draft) => ({ name: d.name, color: d.color });

export default function TagsPage() {
  const presets = useIndustryPresets();
  return (
    <TaxonomyPage config={{
      kind: 'tag', title: t('Tags'), one: 'tag', icon: Tag,
      productParam: 'tagId', color: true,
      presets: presets.tags, refreshKeys: ['tags'], toPayload: payload,
      industry: { name: presets.industryName, emoji: presets.industryEmoji },
      guide: [
        { title: t('Tag kya hai'), body: t('Product par chhota label — "Naya", "Sale", "Ramzan", "Imported". Ek product par kai tags lag sakte hain.') },
        { title: t('Category se farq'), body: t('Category ek hoti hai (maal ka group); tags kai ho sakte hain (khaas baat). Brand banane wali company hai.') },
        { title: t('Sale dekhein'), body: t('Period chunein — har tag wale products ki sale aur stock yahan milta hai, jaise "Sale" tag ne kitna becha.') },
        { title: t('Milana'), body: t('Do jaise tags hon to "Doosri me milayein" — products par sirf ek tag reh jayega.') },
      ],
    }} />
  );
}
