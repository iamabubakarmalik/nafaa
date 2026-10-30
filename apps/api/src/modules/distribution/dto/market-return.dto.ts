/**
 * Market return bodies, kept apart so the booker sync (field.dto) and the
 * phase 2 DTOs can both use them without importing each other.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { RETURN_CONDITIONS } from '../distribution.constants';

export class MarketReturnLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string | null;
  @ApiProperty({ description: 'Quantity in the pack.' }) @IsNumber() @Min(0.0001) qty!: number;
  @ApiProperty({ enum: RETURN_CONDITIONS }) @IsIn(RETURN_CONDITIONS) condition!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) batchNo?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional({ description: 'Rupees per pack to credit; kept only with returns.approve (else the last invoice price is used).' })
  @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional({ description: 'Claim it from the principal; defaults to true for damaged / expired goods of a principal\'s brand.' })
  @IsOptional() @IsBoolean() claimable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string | null;
}

export class CreateMarketReturnDto {
  @ApiPropertyOptional({ description: 'Id made on the phone; saved once.' }) @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiPropertyOptional({ description: 'Godown the goods come back into (default: the route\'s).' }) @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional({ description: 'Collected on this van (its open day).' }) @IsOptional() @IsString() vanId?: string;
  @ApiProperty({ type: [MarketReturnLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => MarketReturnLineDto) items!: MarketReturnLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() collectedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional({ description: 'Approve at once (needs returns.approve).' }) @IsOptional() @IsBoolean() approve?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}
