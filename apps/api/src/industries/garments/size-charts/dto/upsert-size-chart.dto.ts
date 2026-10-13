import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentCategoryType, GarmentGender, GarmentMeasurementUnit } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSizeChartDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ enum: GarmentCategoryType }) @IsOptional() @IsEnum(GarmentCategoryType) categoryType?: GarmentCategoryType;
  @ApiPropertyOptional({ enum: GarmentGender }) @IsOptional() @IsEnum(GarmentGender) gender?: GarmentGender;
  @ApiPropertyOptional({ enum: GarmentMeasurementUnit }) @IsOptional() @IsEnum(GarmentMeasurementUnit) unit?: GarmentMeasurementUnit;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  // Rows of the chart, e.g. [{ size: 'M', chest: 40 }]
  // Plain objects: without @Type the global implicit conversion turns each
  // element into an empty array and the rows are saved as [].
  @ApiProperty() @IsArray() @Type(() => Object) rows!: any[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
