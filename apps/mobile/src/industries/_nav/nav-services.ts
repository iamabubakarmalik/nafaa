/** More-menu items of the service industry packs (salon, clinic, gym, hotel, gaming, services-biz), gathered for the shell nav config. */

import type { NavItem } from '@/modules/shell/navigation/nav-config';
import { NAV as SALON_NAV } from '../salon/nav';
import { NAV as GYM_NAV } from '../gym/nav';
import { NAV as HOTEL_NAV } from '../hotel/nav';
import { NAV as GAMING_NAV } from '../gaming/nav';
import { NAV as CLINIC_NAV } from '../clinic/nav';
import { NAV as SERVICES_NAV } from '../services-biz/nav';

export const SERVICE_TYPE_NAV: NavItem[] = [...SALON_NAV, ...GYM_NAV, ...HOTEL_NAV, ...GAMING_NAV, ...CLINIC_NAV, ...SERVICES_NAV];
