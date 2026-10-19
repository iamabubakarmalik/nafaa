import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, SalonAppointmentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

class AppointmentServiceDto {
  @ApiProperty() @IsString() serviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() staffProfileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(1440) durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateAppointmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) customerNotes?: string;
  @ApiProperty() @IsString() scheduledStart!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) serviceCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  /** Group bookings (bridal party etc.); kept in the notes. */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) numberOfGuests?: number;
  /** Customer is at the counter now: joins the waiting queue instead of a booked slot. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() walkIn?: boolean;
  @ApiProperty({ type: [AppointmentServiceDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => AppointmentServiceDto) services!: AppointmentServiceDto[];
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: SalonAppointmentStatus }) @IsEnum(SalonAppointmentStatus) status!: SalonAppointmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiProperty() @IsString() paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
}

export class RescheduleDto {
  @ApiProperty() @IsString() scheduledStart!: string;
  @ApiProperty() @IsString() scheduledEnd!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

/** Final bill from the appointment screen: completes the appointment and posts the sale. */
export class CheckoutAppointmentDto {
  @ApiProperty() @IsNumber() @Min(0) paidAmount!: number;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @Transform(bankAlias) @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tip?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class RatingDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) feedback?: string;
}

export const APPOINTMENT_VIEWS = ['today', 'queue', 'upcoming', 'done', 'missed', 'all'] as const;
export type AppointmentView = (typeof APPOINTMENT_VIEWS)[number];

export class AppointmentPageQuery {
  @IsOptional() @IsIn(APPOINTMENT_VIEWS as unknown as string[]) view?: AppointmentView;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() staffProfileId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
