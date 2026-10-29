import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class RecipeLineDto {
  @IsString() @IsNotEmpty() productId!: string;
  @Type(() => Number) @IsNumber() @Min(0.0001) quantity!: number;
  /** Unit the quantity is written in; defaults to the raw item's own unit. */
  @IsOptional() @IsString() @MaxLength(40) unitName?: string;
  /** One of the raw item's packs (ProductUnit). */
  @IsOptional() @IsString() unitId?: string | null;
  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

export class SaveRecipeDto {
  @Type(() => Number) @IsNumber() @Min(0.0001) yieldQty!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(90) wastagePercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packingCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) labourCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) overheadCost?: number;
  @IsOptional() @IsBoolean() makeOnSale?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => RecipeLineDto) lines!: RecipeLineDto[];
}

export class ProduceItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  /** Units to make, in the product's base unit. Give this or `batches`. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.0001) quantity?: number;
  /** Recipe batches to make. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.0001) batches?: number;
  /** Optional batch number and expiry for what is made. */
  @IsOptional() @IsString() @MaxLength(60) batchNumber?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
}

export class ProduceDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ProduceItemDto) items!: ProduceItemDto[];
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ReverseRunDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class ListRunsDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsIn(['all', 'DONE', 'REVERSED']) status?: string;
  @IsOptional() @IsIn(['all', 'MANUAL', 'SALE', 'AI']) source?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class ListRecipesDto {
  @IsOptional() @IsString() @MaxLength(80) search?: string;
}

export class ReportQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
