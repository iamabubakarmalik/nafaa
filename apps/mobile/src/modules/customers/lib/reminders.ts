/** The shop's own reminder wording, kept on this phone per language and tone; the defaults come from @nafaa/core. */

import { DEFAULT_REMINDERS, type MessageLang, type ReminderTone } from '@nafaa/core/customers';
import { kv } from '@/core/storage/kv';

const KEY = 'nafaa.khata.reminders.v2';
type Saved = Partial<Record<`${MessageLang}.${ReminderTone}`, string>>;

export function loadReminder(lang: MessageLang, tone: ReminderTone): string {
  const saved = kv.get<Saved>(KEY, {});
  return saved[`${lang}.${tone}`] ?? DEFAULT_REMINDERS[lang][tone];
}

export function saveReminder(lang: MessageLang, tone: ReminderTone, text: string | null) {
  const saved = { ...kv.get<Saved>(KEY, {}) };
  if (text == null || text === DEFAULT_REMINDERS[lang][tone]) delete saved[`${lang}.${tone}`];
  else saved[`${lang}.${tone}`] = text;
  kv.set(KEY, saved);
}
