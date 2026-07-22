import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class B2BItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class CreateB2BOrderDto {
  @IsString() buyerShopId!: string;
  @IsString() sellerShopId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => B2BItemDto)
  items!: B2BItemDto[];
  @IsOptional() @IsIn(['COD', 'CREDIT', 'ADVANCE', 'BANK_TRANSFER'])
  paymentTerms?: string;
  @IsOptional() @Type(() => Number) @IsInt() creditDays?: number;
  @IsOptional() @IsString() buyerNotes?: string;
}
