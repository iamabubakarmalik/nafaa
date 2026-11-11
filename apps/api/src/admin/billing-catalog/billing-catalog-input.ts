/**
 * Input checks for the admin billing catalog and shop billing endpoints.
 * Bodies arrive as plain objects (no class DTOs), so every field is read and
 * checked here.
 */

import { BadRequestException } from '@nestjs/common';
import { AddOnKind } from '@prisma/client';
import { FEATURE_KEYS, LIMIT_KEYS, LimitKey } from '../../modules/billing/entitlements/feature-catalog';
import { bool, number, optText, text } from '../partners/admin-partner-input';

export const ADDON_CATEGORIES = ['integrations', 'sales', 'operations', 'capacity', 'services'] as const;
const KINDS: AddOnKind[] = ['FLAT', 'PER_UNIT', 'ONE_TIME'];

/** Feature keys from the catalog only, without duplicates. */
export function featureKeys(v: unknown, field: string): string[] {
  if (!Array.isArray(v)) throw new BadRequestException(`${field} must be a list`);
  const out = [...new Set(v.filter((k): k is string => typeof k === 'string'))];
  const unknown = out.filter((k) => !FEATURE_KEYS.has(k));
  if (unknown.length) throw new BadRequestException(`Unknown feature: ${unknown.join(', ')}`);
  return out;
}

function stringList(v: unknown, field: string): string[] {
  if (!Array.isArray(v)) throw new BadRequestException(`${field} must be a list`);
  return [...new Set(v.filter((k): k is string => typeof k === 'string' && !!k.trim()).map((k) => k.trim()))];
}

/** { users: 1, shops: 2 } with known keys and whole numbers 0 or more; empty → null. */
export function limitMap(v: unknown, field: string): Partial<Record<LimitKey, number>> | null {
  if (v === null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) throw new BadRequestException(`${field} must be an object`);
  const out: Partial<Record<LimitKey, number>> = {};
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!LIMIT_KEYS.includes(k as LimitKey)) throw new BadRequestException(`Unknown limit: ${k}`);
    if (raw === null || raw === undefined || raw === '') continue;
    out[k as LimitKey] = number(raw, `${field}.${k}`, { min: 0, max: 999_999, int: true });
  }
  return Object.keys(out).length ? out : null;
}

export interface AddOnInput {
  key?: string;
  name?: string;
  description?: string | null;
  category?: string;
  kind?: AddOnKind;
  priceMonthly?: number;
  unitLabel?: string | null;
  grantsFeatures?: string[];
  grantsLimits?: Partial<Record<LimitKey, number>> | null;
  bundleKeys?: string[];
  availableOnPlans?: string[];
  isPublic?: boolean;
  isActive?: boolean;
  comingSoon?: boolean;
  sortOrder?: number;
}

/** Reads an add-on body. `create` makes key, name, category and kind required. */
export function addOnInput(body: Record<string, unknown>, create: boolean): AddOnInput {
  const b = body ?? {};
  const out: AddOnInput = {};
  if (create) {
    const key = text(b.key, 40).toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(key)) throw new BadRequestException('Key may use lowercase letters, numbers and underscores (2–40)');
    out.key = key;
  } else if (b.key !== undefined) {
    throw new BadRequestException('The key cannot change after the add-on is made');
  }
  if (create || b.name !== undefined) {
    const name = text(b.name, 80);
    if (!name) throw new BadRequestException('Name is required');
    out.name = name;
  }
  if (b.description !== undefined) out.description = optText(b.description, 500) ?? null;
  if (create || b.category !== undefined) {
    const category = text(b.category, 40).toLowerCase();
    if (!ADDON_CATEGORIES.includes(category as (typeof ADDON_CATEGORIES)[number])) throw new BadRequestException(`Category must be one of: ${ADDON_CATEGORIES.join(', ')}`);
    out.category = category;
  }
  if (create || b.kind !== undefined) {
    const kind = text(b.kind, 20).toUpperCase() as AddOnKind;
    if (!KINDS.includes(kind)) throw new BadRequestException(`Kind must be one of: ${KINDS.join(', ')}`);
    out.kind = kind;
  }
  if (create || b.priceMonthly !== undefined) out.priceMonthly = number(b.priceMonthly ?? 0, 'Price', { min: 0, max: 10_000_000 });
  if (b.unitLabel !== undefined) out.unitLabel = optText(b.unitLabel, 20) ?? null;
  if (b.grantsFeatures !== undefined) out.grantsFeatures = featureKeys(b.grantsFeatures, 'grantsFeatures');
  if (b.grantsLimits !== undefined) out.grantsLimits = limitMap(b.grantsLimits, 'grantsLimits');
  if (b.bundleKeys !== undefined) out.bundleKeys = stringList(b.bundleKeys, 'bundleKeys');
  if (b.availableOnPlans !== undefined) out.availableOnPlans = stringList(b.availableOnPlans, 'availableOnPlans');
  if (b.isPublic !== undefined) out.isPublic = bool(b.isPublic, 'isPublic');
  if (b.isActive !== undefined) out.isActive = bool(b.isActive, 'isActive');
  if (b.comingSoon !== undefined) out.comingSoon = bool(b.comingSoon, 'comingSoon');
  if (b.sortOrder !== undefined) out.sortOrder = number(b.sortOrder, 'sortOrder', { min: -10_000, max: 10_000, int: true });
  return out;
}

/** ISO date or null; undefined when the field was not sent. */
export function optDate(v: unknown, field: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw new BadRequestException(`${field} must be a date`);
  return new Date(v);
}

export type GiveMode = 'free_until' | 'forever' | 'custom_price';

export interface GiveAddOnInput {
  key: string;
  quantity: number;
  mode: GiveMode;
  freeUntil: Date | null;
  unitPrice: number | null;
  note: string | null;
}

export function giveAddOnInput(body: Record<string, unknown>): GiveAddOnInput {
  const b = body ?? {};
  const key = text(b.key, 40);
  if (!key) throw new BadRequestException('Pick an add-on');
  const mode = text(b.mode, 20) as GiveMode;
  if (!['free_until', 'forever', 'custom_price'].includes(mode)) throw new BadRequestException('Mode must be free_until, forever or custom_price');
  const quantity = b.quantity === undefined ? 1 : number(b.quantity, 'Quantity', { min: 1, max: 500, int: true });
  let freeUntil: Date | null = null;
  let unitPrice: number | null = null;
  if (mode === 'free_until') {
    freeUntil = optDate(b.freeUntil, 'Free until') ?? null;
    if (!freeUntil) throw new BadRequestException('Choose the date the free period ends');
    if (freeUntil <= new Date()) throw new BadRequestException('The free period must end in the future');
  }
  if (mode === 'custom_price') unitPrice = number(b.unitPrice, 'Price', { min: 0, max: 10_000_000 });
  return { key, quantity, mode, freeUntil, unitPrice, note: optText(b.note, 300) ?? null };
}
