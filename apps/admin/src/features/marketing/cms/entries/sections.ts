/**
 * Website sections in the Marketing menu. Each one is the same
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
  { key: 'pages', label: 'All pages', description: 'Every entry of the site in one list', icon: FileText, types: [] },
  { key: 'industries', label: 'Industries', description: 'A page for every kind of business', icon: Factory, types: ['INDUSTRY'] },
  { key: 'cities', label: 'Cities', description: 'City hubs and city + industry pages', icon: MapPin, types: ['CITY', 'CITY_INDUSTRY'] },
  { key: 'products', label: 'Products and integrations', description: 'Features, integrations and tools', icon: Layers, types: ['PRODUCT', 'INTEGRATION', 'TOOL'] },
  { key: 'solutions', label: 'Solutions and services', description: 'Solutions and services (Pakistan and worldwide)', icon: Briefcase, types: ['SOLUTION', 'SERVICE'] },
  { key: 'compliance', label: 'Compliance', description: 'FBR, PRA and other rules', icon: ShieldCheck, types: ['COMPLIANCE'] },
  { key: 'blog', label: 'Blog and guides', description: 'Posts, guides, categories, templates, case studies, changelog', icon: BookOpen, types: ['BLOG_POST', 'GUIDE', 'BLOG_CATEGORY', 'TEMPLATE', 'CASE_STUDY', 'CHANGELOG'] },
  { key: 'glossary', label: 'Glossary', description: 'Business terms and their meaning (English and Roman Urdu)', icon: BookA, types: ['GLOSSARY_TERM'] },
  { key: 'compare', label: 'Compare and best-of', description: 'Comparisons, alternatives and best-of lists', icon: Scale, types: ['COMPARE', 'ALTERNATIVE', 'BEST_OF'] },
  { key: 'team', label: 'Team', description: 'Authors and reviewers', icon: Users, types: ['PERSON'] },
  { key: 'docs', label: 'Developer docs', description: 'The API v1 docs tree', icon: Code, types: ['DOC'] },
];

export function sectionByKey(key: string | undefined): EntrySection | undefined {
  return ENTRY_SECTIONS.find((s) => s.key === key);
}

/** The most specific section for a type (falls back to "pages"). */
export function sectionForType(type: CmsEntryType): EntrySection {
  return ENTRY_SECTIONS.find((s) => s.types.includes(type)) ?? (ENTRY_SECTIONS[0] as EntrySection);
}
