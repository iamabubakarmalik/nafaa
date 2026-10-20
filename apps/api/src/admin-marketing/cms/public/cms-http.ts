/**
 * Small HTTP helpers shared by the A2 CMS controllers (public, media, faqs,
 * redirects, menus, settings, customers, dashboard).
 *
 * Request bodies and queries are checked with the contract's zod schemas
 * here, not with class-validator DTOs: the global ValidationPipe skips
 * parameters typed as `unknown`.
 */
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { formatIssuePath, type Issue } from '../contract/cms-contract';

/** One invalid field of a request (400 body `errors`). */
export interface FieldError {
  field: string;
  message: string;
}

/** Parses `input` with `schema` or throws 400 `{ message, errors: FieldError[] }`. */
export function parseOr400<S extends z.ZodType>(schema: S, input: unknown, prefix?: string): z.infer<S> {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data as z.infer<S>;
  const errors: FieldError[] = result.error.issues.map((zi) => ({
    field: formatIssuePath(zi.path, prefix) || '(body)',
    message: zi.message,
  }));
  const first = errors[0];
  throw new BadRequestException({
    statusCode: 400,
    message: first ? `${first.field}: ${first.message}` : 'Data theek nahi',
    error: 'Bad Request',
    errors,
  });
}

/** 422 in the contract's "checks failed" shape. */
export function checksFailed(issues: Issue[], message = 'Publish checks failed'): UnprocessableEntityException {
  return new UnprocessableEntityException({ statusCode: 422, message, issues });
}

/** ISO string or null. */
export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

/** The current admin's user id (JwtAuthGuard puts the user on the request). */
export function userId(req: { user?: { id?: string } }): string | null {
  return req.user?.id ?? null;
}

/**
 * Sends a public JSON response as is (not wrapped by the global
 * ResponseInterceptor), with `Cache-Control` and a weak ETag. Answers 304
 * when the client already has this body.
 */
export function sendPublicJson(req: Request, res: Response, body: unknown, cacheControl = 'public, max-age=60'): void {
  const json = JSON.stringify(body);
  const etag = `W/"${createHash('sha1').update(json).digest('base64url')}"`;
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('ETag', etag);
  res.setHeader('Vary', 'Accept-Encoding');
  const match = req.headers['if-none-match'];
  if (cacheControl !== 'no-store' && typeof match === 'string' && match.split(',').some((t) => t.trim() === etag)) {
    res.status(304).end();
    return;
  }
  res.status(200).type('application/json').send(json);
}

/** Plain object check. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** String field of an unknown object, or undefined. */
export function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
