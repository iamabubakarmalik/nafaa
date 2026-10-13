import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const AUDIT_TYPES = [
  'void', 'refund', 'discount', 'below_cost', 'pin', 'drawer', 'cash_out',
  'stock_loss', 'damage', 'transfer_short', 'expense_deleted', 'settings', 'login',
] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

export const SEVERITIES = ['high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const EVENT_SORTS = ['new', 'old', 'amount', 'severity'] as const;
export type EventSort = (typeof EVENT_SORTS)[number];

export const LOGIN_STATUSES = ['all', 'failed', 'new', 'after'] as const;
export type LoginStatus = (typeof LOGIN_STATUSES)[number];

const DAY_OR_ALL = /^(\d{4}-\d{2}-\d{2}|all)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Period, branch, staff and the limits that decide what counts as unusual. */
export class AuditFilterDto {
  /** Business day "YYYY-MM-DD", or "all". */
  @IsOptional() @Matches(DAY_OR_ALL) from?: string;
  @IsOptional() @Matches(DAY) to?: string;
  /** Branch id; only used by owners on the all-branches view. */
  @IsOptional() @IsString() @MaxLength(60) branch?: string;
  /** User id. */
  @IsOptional() @IsString() @MaxLength(60) staffId?: string;
  /** Hand discount, as a percent of the bill, from which a bill is listed. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) discountPct?: number;
  /** Amount in rupees from which an event counts as large. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(100) @Max(100_000_000) big?: number;
  /** Shop hours "HH:MM"; default from Settings, else 07:00–23:00. */
  @IsOptional() @Matches(CLOCK) open?: string;
  @IsOptional() @Matches(CLOCK) close?: string;
}

export class AuditEventsDto extends AuditFilterDto {
  @IsOptional() @IsIn(AUDIT_TYPES as unknown as string[]) type?: AuditType;
  @IsOptional() @IsIn(SEVERITIES as unknown as string[]) severity?: Severity;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsIn(EVENT_SORTS as unknown as string[]) sort?: EventSort;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2000) limit?: number;
}

export class AuditLoginsDto extends AuditFilterDto {
  @IsOptional() @IsIn(LOGIN_STATUSES as unknown as string[]) status?: LoginStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}
