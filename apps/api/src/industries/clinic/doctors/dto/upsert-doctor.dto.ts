import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClinicSpecialty } from '@prisma/client';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertDoctorDto {
  /** Existing staff member; left out, a staff record is made from the name and phone. */
  @ApiPropertyOptional() @IsOptional() @IsString() staffId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiProperty() @IsString() fullName!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() qualifications?: string[];
  @ApiPropertyOptional({ enum: ClinicSpecialty, isArray: true }) @IsOptional() @IsArray() specialties?: ClinicSpecialty[];
  @ApiPropertyOptional() @IsOptional() @IsString() subSpecialty?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() yearsOfExperience?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pmcNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registeredWith?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) consultationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) followUpFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(365) followUpDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) telemedicineFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) homeVisitFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) emergencyFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(240) slotDurationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bufferMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxDailyPatients?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breakStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breakEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commissionPct?: number;
  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'FIXED'] }) @IsOptional() @IsIn(['PERCENTAGE', 'FIXED']) commissionType?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() languages?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() services?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() proceduresOffered?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() acceptsTelemedicine?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() acceptsHomeVisit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() acceptsEmergency?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
