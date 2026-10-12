import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Filters shared by the returns record and its analytics. */
export class ListReturnsDto {
  /** Business-day keys (YYYY-MM-DD); no date filter when left out. */
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  /** Exact reason, or `none` for returns without one. */
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
  @IsOptional() @IsString() staffId?: string;
  /** Return or bill number, customer, phone, product, SKU, barcode or IMEI/serial. */
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
