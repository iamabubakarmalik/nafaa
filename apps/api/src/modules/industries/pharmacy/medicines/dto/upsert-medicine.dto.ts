import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrugScheduleClass, StorageCondition } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertMedicineDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dosageForm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() importedBy?: string;
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
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() markings?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGeneric?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() brandTier?: string;
}
