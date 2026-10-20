import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpticalAppointmentStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateEyeTestDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) customerName!: string;
  @ApiProperty() @IsString() @MaxLength(20) customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(120) customerAge?: number;

  @ApiProperty() @IsDateString() appointmentDate!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Waqt HH:MM likhein' }) scheduledSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() optometristId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() chiefComplaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalHistory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentMedications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() familyEyeHistory?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) testFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordTestResultsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() rightAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() rightVa?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() leftSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() leftAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() leftVa?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() pupilDistance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() intraocularPressure?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorVisionTest?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() depthPerceptionTest?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() peripheralVisionTest?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fundusExamination?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendation?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresFollowUp?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() followUpDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpReason?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() issuePrescription?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateTestStatusDto {
  @ApiProperty({ enum: OpticalAppointmentStatus }) @IsEnum(OpticalAppointmentStatus) status!: OpticalAppointmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() rescheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5) scheduledSlot?: string;
}

export class RecordTestPaymentDto {
  @ApiPropertyOptional({ description: 'Left out with onKhata or waiveOff' }) @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() waiveOff?: boolean;
  @ApiPropertyOptional({ description: 'Put the whole remaining fee on the customer\'s khata' }) @IsOptional() @IsBoolean() onKhata?: boolean;
}
