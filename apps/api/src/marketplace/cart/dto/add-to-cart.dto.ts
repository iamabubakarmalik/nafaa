import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(999)
  quantity!: number;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  /** Restaurant add-ons (POS modifier groups). */
  @IsOptional()
  modifiers?: any;

  /** Category flow choices: cake form, booking slot, substitute preference, gift message. */
  @IsOptional() @IsObject()
  options?: Record<string, unknown>;
}
