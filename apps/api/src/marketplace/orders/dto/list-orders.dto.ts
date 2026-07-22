import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MarketplaceOrderStatus } from '@prisma/client';

export class ListOrdersDto {
  @IsOptional() @IsArray() @IsEnum(MarketplaceOrderStatus, { each: true })
  status?: MarketplaceOrderStatus[];

  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsString()
  search?: string; // by orderNumber

  @IsOptional() @IsString()
  fromDate?: string; // ISO

  @IsOptional() @IsString()
  toDate?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
