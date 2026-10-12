import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const MOVEMENT_TYPES = [
  'PURCHASE_IN', 'SALE_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'OPENING_BALANCE',
  'DAMAGE', 'LOSS', 'TRANSFER_IN', 'TRANSFER_OUT', 'PURCHASE_RETURN',
] as const;

export class ListMovementsDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  /** One type, or a comma list ("SALE_OUT,RETURN_IN"). */
  @IsOptional() @IsString() @MaxLength(200) type?: string;
  @IsOptional() @IsIn(['all', 'in', 'out']) direction?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}
