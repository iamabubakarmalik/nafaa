import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DietaryTag, SpiceLevel } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min,
} from 'class-validator';

/** HH:mm, or empty to clear the window. */
const HHMM = /^(([01]\d|2[0-3]):[0-5]\d)?$/;
const HHMM_MSG = 'Waqt HH:mm me likhein, maslan 07:00';

export class UpsertMenuItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(600) prepTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) cookingInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chefSpecial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSpicy?: boolean;
  @ApiPropertyOptional({ enum: SpiceLevel }) @IsOptional() @IsEnum(SpiceLevel) spiceLevel?: SpiceLevel;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(20000) calories?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) servingSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) servesPeople?: number;
  @ApiPropertyOptional({ enum: DietaryTag, isArray: true }) @IsOptional() @IsArray() @IsEnum(DietaryTag, { each: true }) dietaryTags?: DietaryTag[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) allergenInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @Matches(HHMM, { message: HHMM_MSG }) availableFrom?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(HHMM, { message: HHMM_MSG }) availableTo?: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) availableDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) highlightColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) tagLine?: string;
}

export class AttachModifiersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  modifierGroupIds!: string[];
}

export class SetAvailabilityDto {
  @ApiProperty() @IsBoolean() available!: boolean;
}

export class BulkAvailabilityDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  menuItemIds!: string[];

  @ApiProperty() @IsBoolean() available!: boolean;
}

export class AddToMenuDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  productIds!: string[];
}

export const BOARD_STATES = ['all', 'live', 'off', 'cantmake', 'norecipe', 'notonpos', 'raw', 'inactive'] as const;
export const BOARD_SORTS = ['name', 'new', 'priceHigh', 'priceLow', 'sold', 'foodCost', 'profit', 'canMake'] as const;
export type BoardState = (typeof BOARD_STATES)[number];
export type BoardSort = (typeof BOARD_SORTS)[number];

export class MenuBoardQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsIn(BOARD_STATES) state?: BoardState;
  @IsOptional() @IsIn(BOARD_SORTS) sort?: BoardSort;
  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number;
}
