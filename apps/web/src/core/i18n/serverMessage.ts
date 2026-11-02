/**
 * Server messages with values (see the API's common/i18n/api-message.ts): a
 * template key plus params. A param can itself be a server message or a fixed
 * phrase from the catalog (an action name, a status word); both are
 * translated before they are filled in. All of them use the `api` catalog
 * area first.
 */

import { hasTranslation, translateIn, type Params } from './runtime';

const AREA = 'api';
const t = (text: string, params?: Params) => translateIn(AREA, text, params);
const known = (text: string) => hasTranslation(text, AREA);

/** Translates a fixed server text (no messageKey). */
export const translateServerText = (text: string): string => t(text);
export const hasServerTranslation = known;

interface ServerMessage {
  messageKey: string;
  params?: unknown;
}

const isServerMessage = (value: unknown): value is ServerMessage =>
  !!value && typeof value === 'object' && typeof (value as ServerMessage).messageKey === 'string';

function localParams(params: unknown): Params | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const out: Params = {};
  for (const [name, value] of Object.entries(params as Record<string, unknown>)) {
    if (isServerMessage(value)) out[name] = translateServerMessage(value.messageKey, value.params);
    else if (typeof value === 'string') out[name] = known(value) ? t(value) : value;
    else if (typeof value === 'number') out[name] = value;
  }
  return out;
}

export function translateServerMessage(key: string, params?: unknown): string {
  return t(key, localParams(params));
}

/**
 * Text saved on the server, such as a notification title: its template from
 * `metadata.i18n` when there is one, else the text itself when the catalog
 * knows it, else the text unchanged (names, free text typed by people).
 */
export function translateStoredText(text: string, template?: { key?: unknown; params?: unknown } | null): string {
  if (template && typeof template.key === 'string') return translateServerMessage(template.key, template.params);
  return text && known(text) ? t(text) : text;
}
