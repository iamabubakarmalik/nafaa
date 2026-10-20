/** Error shapes from API-CONTRACT 1: 409 with the current entry, 422 with issues. */
import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { z } from 'zod';
import type { AdminEntry, Issue } from '../contract/cms-contract';

export class EntryConflictException extends ConflictException {
  constructor(current: AdminEntry | null, message = 'Entry changed since you opened it') {
    super({ statusCode: 409, message, current });
  }
}

export class ChecksFailedException extends UnprocessableEntityException {
  constructor(public readonly issues: Issue[], message = 'Publish checks failed') {
    super({ statusCode: 422, message, issues });
  }
}

/** Parses a request body or query with a contract schema; 400 with readable issues on failure. */
export function parseOr400<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value ?? {});
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }));
  throw new BadRequestException({ statusCode: 400, message: `Request theek nahi: ${issues[0]?.path ?? ''} ${issues[0]?.message ?? ''}`.trim(), error: 'Bad Request', issues });
}
