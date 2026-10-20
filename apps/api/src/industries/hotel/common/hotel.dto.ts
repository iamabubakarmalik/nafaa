/** Request bodies of the hotel API. Unknown fields are refused by the global validation pipe. */

import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { BookingSource, FolioChargeType, GuestIdType, HousekeepingStatus, MealPlan, RoomStatus } from '@prisma/client';

const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

export class PayPartDto {
  @IsIn(METHODS as unknown as string[]) method!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() @MaxLength(80) reference?: string;
}

/** Money taken at the counter: one method, split parts, or nothing (khata). */
export class TenderDto {
  @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => PayPartDto) payments?: PayPartDto[];
  @IsOptional() @IsIn(METHODS as unknown as string[]) paymentMethod?: string;
  @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @IsOptional() @IsBoolean() onCredit?: boolean;
}

// ─── Rooms ──────────────────────────────────────────────────────────

export class CreateRoomDto {
  @IsUUID() roomTypeId!: string;
  @IsString() @MaxLength(20) roomNumber!: string;
  @IsOptional() @IsString() @MaxLength(20) floor?: string;
  @IsOptional() @IsString() @MaxLength(60) building?: string;
  @IsOptional() @IsString() @MaxLength(60) wing?: string;
  @IsOptional() @IsString() @MaxLength(60) viewType?: string;
  @IsOptional() @IsString() @MaxLength(60) facing?: string;
  @IsOptional() @IsNumber() @Min(0) customPrice?: number | null;
  @IsOptional() @IsString() @MaxLength(300) customNotes?: string;
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsEnum(HousekeepingStatus) housekeepingStatus?: HousekeepingStatus;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Branch of the room; left out, the branch being viewed (none in "All shops" = every branch). */
  @IsOptional() @IsUUID() shopId?: string | null;
}

export class UpdateRoomDto {
  @IsOptional() @IsUUID() roomTypeId?: string;
  @IsOptional() @IsString() @MaxLength(20) roomNumber?: string;
  @IsOptional() @IsString() @MaxLength(20) floor?: string;
  @IsOptional() @IsString() @MaxLength(60) building?: string;
  @IsOptional() @IsString() @MaxLength(60) wing?: string;
  @IsOptional() @IsString() @MaxLength(60) viewType?: string;
  @IsOptional() @IsString() @MaxLength(60) facing?: string;
  @IsOptional() @IsNumber() @Min(0) customPrice?: number | null;
  @IsOptional() @IsString() @MaxLength(300) customNotes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Moves the room to a branch; null makes it show in every branch. */
  @IsOptional() @IsUUID() shopId?: string | null;
}

export class RoomStatusDto {
  @IsEnum(RoomStatus) status!: RoomStatus;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class RoomHousekeepingDto {
  @IsEnum(HousekeepingStatus) housekeepingStatus!: HousekeepingStatus;
}

// ─── Guests ─────────────────────────────────────────────────────────

export class GuestDto {
  @IsOptional() @IsString() @MaxLength(10) title?: string;
  @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsOptional() @IsString() @MaxLength(120) email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(30) altPhone?: string;
  @IsOptional() @IsEnum(GuestIdType) idType?: GuestIdType;
  @IsOptional() @IsString() @MaxLength(40) idNumber?: string;
  @IsOptional() @IsString() idExpiryDate?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(20) gender?: string;
  @IsOptional() @IsString() @MaxLength(60) nationality?: string;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(60) country?: string;
  @IsOptional() @IsString() @MaxLength(120) companyName?: string;
  @IsOptional() @IsString() @MaxLength(80) designation?: string;
  @IsOptional() @IsBoolean() isVIP?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) specialRequests?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsUUID() customerId?: string;
}

export class ReasonDto {
  @IsString() @MaxLength(300) reason!: string;
}

// ─── Bookings ───────────────────────────────────────────────────────

export class BookingRoomDto {
  @IsOptional() @IsUUID() roomId?: string;
  @IsOptional() @IsUUID() roomTypeId?: string;
  /** Agreed rate per night; left out, the rate is worked out from the room type and plans. */
  @IsOptional() @IsNumber() @Min(0) ratePerNight?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) adults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(20) children?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5) extraBeds?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsBoolean() isComplimentary?: boolean;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class CheckInGuestDto {
  @IsOptional() @IsEnum(GuestIdType) idType?: GuestIdType;
  @IsOptional() @IsString() @MaxLength(40) idNumber?: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) adults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) children?: number;
  @IsOptional() @IsString() @MaxLength(60) nationality?: string;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(200) purposeOfVisit?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateBookingDto extends CheckInGuestDto {
  @IsOptional() @IsUUID() primaryGuestId?: string;
  @IsString() @MaxLength(160) guestName!: string;
  @IsString() @MaxLength(30) guestPhone!: string;
  @IsOptional() @IsString() @MaxLength(120) guestEmail?: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) totalAdults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) totalChildren?: number;
  @IsString() checkInDate!: string;
  @IsString() checkOutDate!: string;
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => BookingRoomDto) rooms!: BookingRoomDto[];
  @IsOptional() @IsEnum(BookingSource) source?: BookingSource;
  @IsOptional() @IsString() @MaxLength(80) sourceRef?: string;
  /** Company or agent that made the booking, shown on the bill. */
  @IsOptional() @IsString() @MaxLength(120) bookedBy?: string;
  @IsOptional() @IsString() @MaxLength(120) agentName?: string;
  @IsOptional() @IsNumber() @Min(0) agentCommission?: number;
  @IsOptional() @IsEnum(MealPlan) mealPlan?: MealPlan;
  @IsOptional() @IsIn(['TENTATIVE', 'CONFIRMED']) status?: 'TENTATIVE' | 'CONFIRMED';
  @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @IsOptional() @IsNumber() @Min(0) serviceCharge?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() @MaxLength(1000) specialRequests?: string;
  @IsOptional() @IsString() @MaxLength(20) arrivalTime?: string;
  @IsOptional() @IsNumber() @Min(0) advancePaid?: number;
  @IsOptional() @IsIn(METHODS as unknown as string[]) paymentMethod?: string;
  /** Company / regular khata that holds the advance and any udhaar. */
  @IsOptional() @IsUUID() customerId?: string;
  /** Walk-in: check the guest in straight away. */
  @IsOptional() @IsBoolean() checkInNow?: boolean;
  @IsOptional() @IsString() shopId?: string;
}

export class UpdateBookingDto {
  @IsOptional() @IsString() @MaxLength(160) guestName?: string;
  @IsOptional() @IsString() @MaxLength(30) guestPhone?: string;
  @IsOptional() @IsString() @MaxLength(120) guestEmail?: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) totalAdults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) totalChildren?: number;
  @IsOptional() @IsString() checkInDate?: string;
  @IsOptional() @IsString() checkOutDate?: string;
  @IsOptional() @IsEnum(BookingSource) source?: BookingSource;
  @IsOptional() @IsString() @MaxLength(80) sourceRef?: string;
  @IsOptional() @IsString() @MaxLength(120) bookedBy?: string;
  @IsOptional() @IsEnum(MealPlan) mealPlan?: MealPlan;
  @IsOptional() @IsIn(['TENTATIVE', 'CONFIRMED']) status?: 'TENTATIVE' | 'CONFIRMED';
  @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @IsOptional() @IsNumber() @Min(0) serviceCharge?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() @MaxLength(1000) specialRequests?: string;
  @IsOptional() @IsString() @MaxLength(20) arrivalTime?: string;
  @IsOptional() @IsString() @MaxLength(200) purposeOfVisit?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  /** Company / regular khata the stay is billed to; null clears it. */
  @IsOptional() @IsUUID() customerId?: string | null;
}

export class BookingPaymentDto {
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsIn(METHODS as unknown as string[]) paymentMethod?: string;
  @IsOptional() @IsUUID() customerId?: string;
}

export class ExtendDto {
  @IsString() newCheckOutDate!: string;
}

export class ChangeRoomDto {
  @IsUUID() bookedRoomId!: string;
  @IsUUID() roomId!: string;
  /** New rate from tonight; left out, the guest keeps the old rate. */
  @IsOptional() @IsNumber() @Min(0) ratePerNight?: number;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class CheckOutDto extends TenderDto {
  /** Bill the unpaid part to this khata (company). Must be the khata that holds the advance, if any. */
  @IsOptional() @IsUUID() customerId?: string;
  /** Guest leaves early but pays for every booked night. */
  @IsOptional() @IsBoolean() keepBookedNights?: boolean;
}

export class CancelBookingDto {
  @IsString() @MaxLength(300) reason!: string;
  /** Cancellation or no-show charge kept from the advance (rest stays on khata). */
  @IsOptional() @IsNumber() @Min(0) charge?: number;
  @IsOptional() @IsBoolean() noShow?: boolean;
}

export class RefundAdvanceDto {
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

// ─── Folio ──────────────────────────────────────────────────────────

export const FOLIO_TYPES = ['FOOD', 'BEVERAGE', 'LAUNDRY', 'SPA', 'MINIBAR', 'TELEPHONE', 'INTERNET', 'PARKING', 'SERVICE_CHARGE', 'DAMAGE', 'MISCELLANEOUS'] as const;

export class FolioChargeDto {
  @IsUUID() bookingId!: string;
  @IsIn(FOLIO_TYPES as unknown as string[]) chargeType!: FolioChargeType;
  @IsString() @MaxLength(160) description!: string;
  @IsOptional() @IsNumber() @Min(0.001) @Max(10000) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  /** Catalog item served (minibar, food); its stock is taken now. */
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

// ─── Housekeeping ───────────────────────────────────────────────────

export class HousekeepingTaskDto {
  @IsUUID() roomId!: string;
  @IsIn(['CHECKOUT_CLEAN', 'DAILY_CLEAN', 'DEEP_CLEAN', 'TURNDOWN', 'INSPECTION', 'MAINTENANCE', 'LINEN_CHANGE']) taskType!: string;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
  @IsOptional() @IsString() scheduledFor?: string;
  @IsOptional() @IsString() @MaxLength(80) assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(80) assignedName?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class AssignTaskDto {
  @IsOptional() @IsString() @MaxLength(80) assignedTo?: string;
  @IsString() @MaxLength(80) assignedName!: string;
}

export class CompleteTaskDto {
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsString() @MaxLength(1000) issueFound?: string;
}

// ─── Rate plans ─────────────────────────────────────────────────────

export class RatePlanDto {
  @IsOptional() @IsString() @MaxLength(30) code?: string;
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(400) description?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsIn(['SEASON', 'PEAK', 'OFF_SEASON', 'WEEKEND', 'PROMO', 'CORPORATE', 'LONG_STAY']) planType?: string;
  @IsOptional() @IsEnum(MealPlan) mealPlan?: MealPlan;
  @IsOptional() @IsBoolean() isPercentage?: boolean;
  @IsOptional() @IsNumber() @Min(-100000) @Max(1000000) adjustment?: number;
  @IsOptional() @IsInt() @Min(1) minNights?: number | null;
  @IsOptional() @IsInt() @Min(1) maxNights?: number | null;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) applicableDays?: number[];
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) applicableRoomTypeIds?: string[];
  @IsOptional() @IsArray() @IsEnum(BookingSource, { each: true }) applicableSources?: BookingSource[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() displayOrder?: number;
}

export class CloseNightAuditDto {
  /** `yyyy-mm-dd`; left out, today. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date sahi likhein' }) date?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
