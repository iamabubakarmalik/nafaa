import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EmiPlanStatus } from '@prisma/client';

export const EMI_VIEWS = ['active', 'overdue', 'upcoming', 'done', 'all'] as const;
export type EmiView = (typeof EMI_VIEWS)[number];

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

  @ApiPropertyOptional({ enum: EMI_VIEWS, description: 'active, overdue, upcoming (next 7 days), done, all' })
  @IsOptional()
  @IsIn(EMI_VIEWS)
  view?: EmiView;

  @ApiPropertyOptional({ enum: ['new', 'old', 'due', 'remaining'] })
  @IsOptional()
  @IsIn(['new', 'old', 'due', 'remaining'])
  sort?: 'new' | 'old' | 'due' | 'remaining';

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
