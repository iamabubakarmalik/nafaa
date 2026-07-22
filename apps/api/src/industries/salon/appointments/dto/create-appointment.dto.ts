import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalonAppointmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class AppointmentServiceDto {
  @ApiProperty() @IsString() serviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() staffProfileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateAppointmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiProperty() @IsString() scheduledStart!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() serviceCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiProperty({ type: [AppointmentServiceDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => AppointmentServiceDto) services!: AppointmentServiceDto[];
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: SalonAppointmentStatus }) @IsEnum(SalonAppointmentStatus) status!: SalonAppointmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}

export class RescheduleDto {
  @ApiProperty() @IsString() scheduledStart!: string;
  @ApiProperty() @IsString() scheduledEnd!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
