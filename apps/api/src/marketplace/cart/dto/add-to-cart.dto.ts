import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(999)
  quantity!: number;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional()
  modifiers?: any; // Restaurant / customization options

  @IsOptional() @IsString()
  bargainId?: string;

  @IsOptional() @IsString()
  groupBuyId?: string;
}
