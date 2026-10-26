/**
 * City + industry pages (/pos-software/{city}/{industry}). Only pairs with
 * public, local material of their own are written; see each city file for
 * what was built and _build.ts for the shared layout.
 */

import type { SeedEntry } from '../../lib/types';
import { karachi } from './karachi';
import { lahore } from './lahore';
import { islamabad } from './islamabad';
import { rawalpindi } from './rawalpindi';
import { faisalabad } from './faisalabad';
import { multan } from './multan';
import { peshawar } from './peshawar';
import { sialkot } from './sialkot';
import { gujranwala } from './gujranwala';
import { chiniot } from './chiniot';
import { sargodha } from './sargodha';

export const cityIndustry: SeedEntry[] = [
  ...karachi,
  ...lahore,
  ...islamabad,
  ...rawalpindi,
  ...faisalabad,
  ...multan,
  ...peshawar,
  ...sialkot,
  ...gujranwala,
  ...chiniot,
  ...sargodha,
];
