import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBulkPricingDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsNumber() minQuantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxQuantity?: number;
  @ApiProperty() @IsNumber() price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
}

export class CalculatePriceDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsNumber() quantity!: number;
}
