/**
 * Long names for the tax authority codes in the contract (INDUSTRY_AUTHORITIES,
 * CITY_AUTHORITIES). Labels only; every rule, rate or date about an authority
 * comes from CMS content with its source.
 */
import type { EntryData } from '@/lib/cms/contract/cms-contract';

type ComplianceAuthority = Extract<EntryData, { type: 'COMPLIANCE' }>['authority'];
type CityAuthority = Extract<EntryData, { type: 'CITY' }>['authority'];

export const AUTHORITY_NAMES: Record<ComplianceAuthority | CityAuthority, string> = {
  FBR: 'Federal Board of Revenue',
  PRA: 'Punjab Revenue Authority',
  SRB: 'Sindh Revenue Board',
  KPRA: 'Khyber Pakhtunkhwa Revenue Authority',
  BRA: 'Balochistan Revenue Authority',
  ICT: 'FBR, Islamabad Capital Territory',
  DRAP: 'Drug Regulatory Authority of Pakistan',
  OTHER: 'Other authority',
};

/** The display code: ICT services tax is administered by FBR, so it reads "ICT" with the long name beside it. */
export function authorityName(code: string): string {
  return (AUTHORITY_NAMES as Record<string, string>)[code] ?? code;
}
