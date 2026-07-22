import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingInterval } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AssignPlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @ApiProperty({ enum: BillingInterval, example: 'MONTHLY' })
  @IsEnum(BillingInterval)
  interval!: BillingInterval;

  @ApiPropertyOptional({ description: 'Number of days from today (overrides interval)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  customDays?: number;

  @ApiPropertyOptional({ default: true, description: 'Mark as paid (no invoice required)' })
  @IsOptional()
  @IsBoolean()
  markAsPaid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExtendSubscriptionDto {
  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  days!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
