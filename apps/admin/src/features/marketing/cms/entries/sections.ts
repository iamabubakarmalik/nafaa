/**
 * Website sections in the Marketing sidebar (ARCH 13). Each one is the same
 * entry list filtered to its types.
 */
import { BookA, BookOpen, Briefcase, Code, Factory, FileText, Layers, MapPin, Scale, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import type { CmsEntryType } from '../contract/cms-contract';

export interface EntrySection {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Empty: every type. */
  types: CmsEntryType[];
}

export const ENTRY_SECTIONS: EntrySection[] = [
  { key: 'pages', label: 'Pages (sab types)', description: 'Site ki har entry ek jagah', icon: FileText, types: [] },
  { key: 'industries', label: 'Industries', description: 'Har karobar ke liye page', icon: Factory, types: ['INDUSTRY'] },
  { key: 'cities', label: 'Cities', description: 'Shehar ke hubs aur shehar + industry pages', icon: MapPin, types: ['CITY', 'CITY_INDUSTRY'] },
  { key: 'products', label: 'Products & integrations', description: 'Features, integrations aur tools', icon: Layers, types: ['PRODUCT', 'INTEGRATION', 'TOOL'] },
  { key: 'solutions', label: 'Solutions & services', description: 'Solutions aur services (Pakistan aur worldwide)', icon: Briefcase, types: ['SOLUTION', 'SERVICE'] },
  { key: 'compliance', label: 'Compliance', description: 'FBR, PRA aur doosre qawaid', icon: ShieldCheck, types: ['COMPLIANCE'] },
  { key: 'blog', label: 'Blog & guides', description: 'Posts, guides, categories, templates, case studies, changelog', icon: BookOpen, types: ['BLOG_POST', 'GUIDE', 'BLOG_CATEGORY', 'TEMPLATE', 'CASE_STUDY', 'CHANGELOG'] },
  { key: 'glossary', label: 'Glossary', description: 'Business alfaaz ke maani (EN + Roman Urdu)', icon: BookA, types: ['GLOSSARY_TERM'] },
  { key: 'compare', label: 'Compare & best-of', description: 'Muqabla, alternatives aur best-of lists', icon: Scale, types: ['COMPARE', 'ALTERNATIVE', 'BEST_OF'] },
  { key: 'team', label: 'Team', description: 'Authors aur reviewers', icon: Users, types: ['PERSON'] },
  { key: 'docs', label: 'Developer docs', description: 'API v1 docs ka tree', icon: Code, types: ['DOC'] },
];

export function sectionByKey(key: string | undefined): EntrySection | undefined {
  return ENTRY_SECTIONS.find((s) => s.key === key);
}

/** The most specific section for a type (falls back to "pages"). */
export function sectionForType(type: CmsEntryType): EntrySection {
  return ENTRY_SECTIONS.find((s) => s.types.includes(type)) ?? (ENTRY_SECTIONS[0] as EntrySection);
}
