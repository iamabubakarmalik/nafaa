import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { RepairPriority, RepairStatus } from '@prisma/client';

export const REPAIR_VIEWS = ['open', 'working', 'ready', 'late', 'unpaid', 'closed', 'warranty', 'all'] as const;
export type RepairView = (typeof REPAIR_VIEWS)[number];

export class QueryRepairsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianId?: string;
  @ApiPropertyOptional({ description: 'Technician name as written on tickets' }) @IsOptional() @IsString() technician?: string;

  @ApiPropertyOptional({ enum: RepairStatus })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiPropertyOptional({ enum: RepairPriority })
  @IsOptional()
  @IsEnum(RepairPriority)
  priority?: RepairPriority;

  @ApiPropertyOptional({ enum: REPAIR_VIEWS, description: 'open, working, ready, late, unpaid, closed, warranty, all' })
  @IsOptional()
  @IsIn(REPAIR_VIEWS)
  view?: RepairView;

  @ApiPropertyOptional({ description: 'yyyy-MM-dd (received date; delivered date for closed)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ description: 'yyyy-MM-dd' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional({ enum: ['new', 'old', 'due', 'amount'] })
  @IsOptional()
  @IsIn(['new', 'old', 'due', 'amount'])
  sort?: 'new' | 'old' | 'due' | 'amount';

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
