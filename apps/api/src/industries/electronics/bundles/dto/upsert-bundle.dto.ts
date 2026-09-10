import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBundleDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiProperty() @IsArray() items!: Array<{ productId: string; quantity: number; unitPrice: number }>;
  @ApiProperty() @IsNumber() originalPrice!: number;
  @ApiProperty() @IsNumber() bundlePrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
}


/**
 * Sirf chand fields badalne ke liye (jaise sirf isActive ya isFeatured).
 * UpsertBundleDto me name/items/prices lazmi hain — us se ek chhota
 * toggle bhi 400 de deta tha.
 */
export class PatchBundleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() items?: Array<{ productId: string; quantity: number; unitPrice: number }>;
  @ApiPropertyOptional() @IsOptional() @IsNumber() originalPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bundlePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
}
