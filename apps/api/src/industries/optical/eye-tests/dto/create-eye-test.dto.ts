import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpticalAppointmentStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEyeTestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() customerAge?: number;

  @ApiProperty() @IsString() appointmentDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() optometristId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() chiefComplaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalHistory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentMedications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() familyEyeHistory?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() testFee?: number;
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
  @ApiPropertyOptional() @IsOptional() @IsString() followUpDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpReason?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() issuePrescription?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateTestStatusDto {
  @ApiProperty({ enum: OpticalAppointmentStatus }) @IsEnum(OpticalAppointmentStatus) status!: OpticalAppointmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rescheduledDate?: string;
}

export class RecordTestPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() waiveOff?: boolean;
}
