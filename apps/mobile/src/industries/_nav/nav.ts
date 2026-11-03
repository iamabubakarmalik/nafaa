/** More-menu items of the retail-type industry packs, gathered for the shell nav config. */

import type { NavItem } from '@/modules/shell/navigation/nav-config';
import { NAV as RETAIL_NAV } from '../retail/nav';
import { NAV as PHARMACY_NAV } from '../pharmacy/nav';
import { NAV as COSMETICS_NAV } from '../cosmetics/nav';
import { NAV as GARMENTS_NAV } from '../garments/nav';
import { NAV as SHOE_NAV } from '../shoe/nav';
import { NAV as SPORTS_NAV } from '../sports/nav';
import { NAV as TOYSTORE_NAV } from '../toystore/nav';
import { NAV as BOOKSTORE_NAV } from '../bookstore/nav';
import { NAV as FLORIST_NAV } from '../florist/nav';
import { NAV as PETSHOP_NAV } from '../petshop/nav';
import { NAV as JEWELRY_NAV } from '../jewelry/nav';
import { NAV as OPTICAL_NAV } from '../optical/nav';

export const RETAIL_TYPE_NAV: NavItem[] = [
  ...RETAIL_NAV,
  ...PHARMACY_NAV,
  ...COSMETICS_NAV,
  ...GARMENTS_NAV,
  ...SHOE_NAV,
  ...SPORTS_NAV,
  ...TOYSTORE_NAV,
  ...BOOKSTORE_NAV,
  ...FLORIST_NAV,
  ...PETSHOP_NAV,
  ...JEWELRY_NAV,
  ...OPTICAL_NAV,
];
