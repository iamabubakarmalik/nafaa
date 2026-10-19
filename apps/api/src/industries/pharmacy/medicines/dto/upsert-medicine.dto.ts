import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrugScheduleClass, StorageCondition } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertMedicineDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) registrationNumber?: string;
  /** YYYY-MM-DD; an empty string clears it. */
  @ApiPropertyOptional() @IsOptional() @IsString() approvalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) dosageForm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) packUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) importedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() indication?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mechanismOfAction?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pharmacokinetics?: string;
  @ApiPropertyOptional({ enum: StorageCondition }) @IsOptional() @IsEnum(StorageCondition) storageCondition?: StorageCondition;
  @ApiPropertyOptional() @IsOptional() @IsString() storageInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresColdChain?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minTemperature?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxTemperature?: number;
  @ApiPropertyOptional({ enum: DrugScheduleClass }) @IsOptional() @IsEnum(DrugScheduleClass) scheduleClass?: DrugScheduleClass;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresPrescription?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNarcotic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRefrigerated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) shape?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) markings?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGeneric?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) brandTier?: string;
}
