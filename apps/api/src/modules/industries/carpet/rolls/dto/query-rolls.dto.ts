import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Min,
} from 'class-validator';
import { CarpetRollStatus } from '@prisma/client';

export class QueryRollsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ enum: CarpetRollStatus })
  @IsOptional()
  @IsEnum(CarpetRollStatus)
  status?: CarpetRollStatus;

  @ApiPropertyOptional({
    description: 'Show only active stock (ACTIVE status + remaining > 0)',
  })
  @IsOptional()
  @IsBooleanString()
  inStockOnly?: string;

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
