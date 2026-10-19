import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

class IngredientDto {
  @ApiProperty() @IsUUID('all', { message: 'Ingredient chunein' }) ingredientProductId!: string;
  @ApiProperty() @IsNumber() @Min(0.0001, { message: 'Quantity 0 se zyada likhein' }) @Max(100000) quantity!: number;
  @ApiProperty() @IsString() @MaxLength(20) unit!: string;
  /** Percent lost in cleaning or cooking, taken from stock on top of the quantity. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100, { message: 'Wastage 100% se zyada nahi' }) wastagePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPerUnit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOptional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

class SizeFactorDto {
  @ApiProperty() @IsUUID('all', { message: 'Size chunein' }) variantId!: string;
  /** Share of the recipe one plate of this size uses: half = 0.5, full = 1. */
  @ApiProperty() @IsNumber() @Min(0.01, { message: 'Size ka hissa 0 se zyada likhein' }) @Max(20) factor!: number;
}

export class UpsertRecipeDto {
  @ApiProperty() @IsUUID() menuItemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01, { message: 'Kitni plate banti hain — 0 se zyada likhein' }) @Max(10000) yieldQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) yieldUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) preparationSteps?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1440) cookingTime?: number;
  @ApiProperty({ type: [IngredientDto] })
  @IsArray() @ArrayMinSize(1, { message: 'Kam se kam ek cheez recipe me daalein' }) @ArrayMaxSize(60)
  @ValidateNested({ each: true }) @Type(() => IngredientDto)
  ingredients!: IngredientDto[];
  /** Per size of the dish; when sent, replaces the saved list. A size left out uses the full recipe. */
  @ApiPropertyOptional({ type: [SizeFactorDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(30)
  @ValidateNested({ each: true }) @Type(() => SizeFactorDto)
  sizeFactors?: SizeFactorDto[];
}
