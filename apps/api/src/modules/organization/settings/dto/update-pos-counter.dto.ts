import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { POS_DENSITIES, POS_LAYOUTS } from '../constants/settings.constants';

/** Settings → Counter & POS → POS counter. Every field optional. */
export class UpdatePosCounterDto {
  @ApiPropertyOptional({ enum: POS_LAYOUTS }) @IsOptional() @IsIn(POS_LAYOUTS) layout?: string;
  @ApiPropertyOptional({ enum: POS_DENSITIES }) @IsOptional() @IsIn(POS_DENSITIES) density?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showImages?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCategories?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showQuickKeys?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showReceiver?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDelivery?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() lineNotes?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() priceEdit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sounds?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPrint?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() recentItems?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() changeDue?: boolean;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsNumber({}, { each: true }) @Min(0.5, { each: true }) @Max(100, { each: true })
  quickDiscounts?: number[];
}
