import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryCustomersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  hasCredit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  isVip?: string;

  /**
   * `branch` (default when a shop is selected) — customers registered at this
   * branch plus anyone who has actually transacted here.
   * `all` — every customer of the tenant.
   *
   * Searching always looks across the whole tenant regardless: a cashier who
   * types a phone number must never be told "not found" for someone who simply
   * first shopped at another branch.
   */
  @ApiPropertyOptional({ enum: ['branch', 'all'] })
  @IsOptional()
  @IsString()
  scope?: 'branch' | 'all';

  @ApiPropertyOptional({ enum: ['name', 'totalSpent', 'balance', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'totalSpent' | 'balance' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
