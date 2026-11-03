/** More-menu items of the device and trade industry packs, gathered for the shell nav config. Each pack adds one import and one spread. */

import type { NavItem } from '@/modules/shell/navigation/nav-config';
import { NAV as AGRI_NAV } from '../agri/nav';
import { NAV as APPLIANCES_NAV } from '../appliances/nav';
import { NAV as HARDWARE_NAV } from '../hardware/nav';
import { NAV as CARPET_NAV } from '../carpet/nav';
import { NAV as FURNITURE_NAV } from '../furniture/nav';
import { NAV as AUTOPARTS_NAV } from '../autoparts/nav';
import { NAV as MOBILE_NAV } from '../mobile/nav';
import { NAV as ELECTRONICS_NAV } from '../electronics/nav';
import { NAV as DAIRY_NAV } from '../dairy/nav';
import { NAV as MEAT_NAV } from '../meat/nav';

export const TRADE_TYPE_NAV: NavItem[] = [
  ...MEAT_NAV,
  ...DAIRY_NAV,
  ...MOBILE_NAV,
  ...ELECTRONICS_NAV,
  ...APPLIANCES_NAV,
  ...HARDWARE_NAV,
  ...AGRI_NAV,
  ...CARPET_NAV,
  ...FURNITURE_NAV,
  ...AUTOPARTS_NAV,
];
