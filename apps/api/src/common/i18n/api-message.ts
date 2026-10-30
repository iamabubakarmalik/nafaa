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

export type ApiMessageParams = Record<string, string | number | null | undefined>;

export interface ApiMessage {
  message: string;
  messageKey: string;
  params: Record<string, string | number>;
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export function apiMessage(template: string, params: ApiMessageParams = {}): ApiMessage {
  const clean: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) clean[name] = value;
  }
  const message = template.replace(PLACEHOLDER, (whole, name: string) =>
    name in clean ? String(clean[name]) : whole,
  );
  return { message, messageKey: template, params: clean };
}
