/**
 * Server messages (mirror of the web serverMessage.ts). The API sends finished
 * text in `message`; messages with values also send `messageKey` + `params`.
 * Everything is looked up in the `api` catalog area first.
 */

import { hasTranslation, translateIn, type Params } from './runtime';

const AREA = 'api';
const tr = (text: string, params?: Params) => translateIn(AREA, text, params);
const known = (text: string) => hasTranslation(text, AREA);

export const translateServerText = (text: string): string => tr(text);
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
    else if (typeof value === 'string') out[name] = known(value) ? tr(value) : value;
    else if (typeof value === 'number') out[name] = value;
  }
  return out;
}

export function translateServerMessage(key: string, params?: unknown): string {
  return tr(key, localParams(params));
}

/** Stored text (a notification title): its template when there is one, else the text. */
export function translateStoredText(text: string, template?: { key?: unknown; params?: unknown } | null): string {
  if (template && typeof template.key === 'string') return translateServerMessage(template.key, template.params);
  return text && known(text) ? tr(text) : text;
}

/** Translates `message` on an API body in place (used by the API client). */
export function translateBody(body: unknown, isError: boolean): void {
  if (!body || typeof body !== 'object') return;
  const b = body as { message?: unknown; messageKey?: unknown; params?: unknown };
  if (typeof b.messageKey === 'string') {
    b.message = translateServerMessage(b.messageKey, b.params);
  } else if (typeof b.message === 'string') {
    if (isError || known(b.message)) b.message = translateServerText(b.message);
  } else if (Array.isArray(b.message) && isError) {
    b.message = b.message.map((m) => (typeof m === 'string' ? translateServerText(m) : m));
  }
}
