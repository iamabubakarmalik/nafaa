/**
 * Colours, emoji sets and helpers shared by the quick keys page and editor.
 */

import { t } from '@core/i18n';
import type { QuickKey } from '../api/quick-keys.api';

export const KEY_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#ef4444', '#14b8a6', '#06b6d4', '#84cc16', '#64748b',
];

/** Emoji groups for the key editor; a function so the names follow the current language. */
export const emojiSets = (): Array<{ name: string; emojis: string[] }> => [
  { name: t('Aam'), emojis: ['⚡', '⭐', '🔥', '💎', '🎯', '💰', '📦', '🛒'] },
  { name: t('Kiryana'), emojis: ['🥛', '🍞', '🥚', '🧂', '🍚', '🌾', '🫖', '☕'] },
  { name: t('Snacks'), emojis: ['🍫', '🍪', '🥤', '🍬', '🥨', '🍿', '🧃', '🍩'] },
  { name: t('Phal sabzi'), emojis: ['🍎', '🍌', '🍊', '🥭', '🍇', '🍉', '🥕', '🧅'] },
  { name: t('Ghar'), emojis: ['🧴', '🧻', '🧼', '🧹', '🕯️', '🔋', '💊', '🪥'] },
  { name: t('Khana'), emojis: ['🍔', '🍕', '🌯', '🍗', '🍰', '🎂', '🥐', '🍵'] },
];

/** Heading used on the POS when a key has no group. */
export const DEFAULT_GROUP = 'General';
export const groupOf = (k: QuickKey) => k.group?.trim() || DEFAULT_GROUP;

/** Groups in the order the POS shows them (first key's position), keys sorted inside. */
export function grouped(keys: QuickKey[]) {
  const sorted = [...keys].sort((a, b) => a.position - b.position);
  const out = new Map<string, QuickKey[]>();
  for (const k of sorted) {
    const g = groupOf(k);
    out.set(g, [...(out.get(g) ?? []), k]);
  }
  return [...out.entries()];
}

export const QK_KEY = 'quick-keys-manage';
/** The POS query that must refresh after a change. */
export const POS_QK_KEY = 'pos-quick-keys';
