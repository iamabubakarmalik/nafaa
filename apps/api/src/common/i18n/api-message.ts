/**
 * Translatable API messages.
 *
 * The web app translates server messages with its own catalogs. A fixed
 * message needs nothing: the client looks the text up as it is. A message with
 * values in it (names, counts, amounts) is sent as a template plus params, so
 * the client can find the template in its catalog and fill the values in:
 *
 *   throw new BadRequestException(apiMessage('Stock kam hai — {{item}}', { item: name }));
 *
 * The response keeps `message` as the finished text, so older clients and the
 * mobile apps keep working; `messageKey` and `params` are extra fields that the
 * global exception filter passes through.
 */

export type ApiMessageParams = Record<string, string | number | ApiMessage | null | undefined>;

export interface ApiMessage {
  message: string;
  messageKey: string;
  params: Record<string, string | number | ApiMessage>;
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * A value can itself be an apiMessage() (a translatable phrase inside a
 * sentence, such as the action a PIN protects); the client translates it too.
 */
export function apiMessage(template: string, params: ApiMessageParams = {}): ApiMessage {
  const clean: Record<string, string | number | ApiMessage> = {};
  for (const [name, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) clean[name] = value;
  }
  const message = template.replace(PLACEHOLDER, (whole, name: string) => {
    if (!(name in clean)) return whole;
    const value = clean[name];
    return typeof value === 'object' ? value.message : String(value);
  });
  return { message, messageKey: template, params: clean };
}

/**
 * Marks a fixed text that reaches the user by an indirect route (a constant,
 * a helper's return value, a phrase passed as a value) so the i18n scan
 * collects it. Returns the text unchanged.
 */
export const apiText = <T extends string>(text: T): T => text;

/** A message as plain text or as a translatable template with values. */
export type MessageText = string | ApiMessage;

export const isApiMessage = (value: unknown): value is ApiMessage =>
  typeof value === 'object' && value !== null && typeof (value as ApiMessage).messageKey === 'string';

/** The finished text of a message. */
export const messageText = (value: MessageText): string => (typeof value === 'string' ? value : value.message);

/**
 * Fields for a stored notification. Title and message are saved as finished
 * text (old clients, mobile push); templates are also kept in
 * `metadata.i18n` so the web app can show them in the viewer's language:
 *
 *   metadata.i18n = { title?: { key, params }, message?: { key, params } }
 *
 * Fixed texts need no entry: the web app looks them up as they are.
 */
export function notificationText(title: MessageText, message: MessageText, metadata?: unknown) {
  const i18n: Record<string, { key: string; params: ApiMessage['params'] }> = {};
  if (isApiMessage(title)) i18n.title = { key: title.messageKey, params: title.params };
  if (isApiMessage(message)) i18n.message = { key: message.messageKey, params: message.params };
  const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : undefined;
  const withI18n = Object.keys(i18n).length ? { ...(base ?? {}), i18n } : metadata;
  return { title: messageText(title), message: messageText(message), metadata: withI18n as any };
}

/**
 * Several messages shown as one ("a; b"). Each part stays translatable: the
 * key is only placeholders, which the client fills with the translated parts.
 */
export function joinMessages(parts: MessageText[], separator = '; '): ApiMessage {
  const params: Record<string, MessageText> = {};
  parts.forEach((part, i) => { params[String(i + 1)] = part; });
  return apiMessage(parts.map((_, i) => `{{${i + 1}}}`).join(separator), params);
}
