import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EmiPlanStatus } from '@prisma/client';

export class QueryEmiPlansDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;

  @ApiPropertyOptional({ enum: EmiPlanStatus })
  @IsOptional()
  @IsEnum(EmiPlanStatus)
  status?: EmiPlanStatus;

  @ApiPropertyOptional({ description: 'Filter: ONLY_OVERDUE / ONLY_UPCOMING' })
  @IsOptional()
  @IsString()
  filter?: 'ONLY_OVERDUE' | 'ONLY_UPCOMING';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
