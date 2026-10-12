import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Status filter: one booking status, or a group (ACTIVE = still open, OVERDUE = open and past pickup). */
export const BOOKING_STATUS_FILTERS = [
  'PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP', 'CONVERTED', 'CANCELLED', 'EXPIRED', 'ACTIVE', 'OVERDUE',
] as const;
export type BookingStatusFilter = (typeof BOOKING_STATUS_FILTERS)[number];

export class ListBookingsDto {
  /** Booked on these business days (YYYY-MM-DD); no date filter when left out. */
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  /** Pickup on these business days (YYYY-MM-DD), for the upcoming list and the calendar. */
  @IsOptional() @IsString() pickupFrom?: string;
  @IsOptional() @IsString() pickupTo?: string;
  @ApiPropertyOptional({ enum: BOOKING_STATUS_FILTERS })
  @IsOptional() @IsIn(BOOKING_STATUS_FILTERS) status?: BookingStatusFilter;
  /** Staff member who took the booking. */
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  /** Explicit branch; the active branch when left out. */
  @IsOptional() @IsString() shopId?: string;
  /** new = latest booked first; pickup = nearest pickup first. */
  @IsOptional() @IsIn(['new', 'pickup']) sort?: 'new' | 'pickup';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300) limit?: number;
}
