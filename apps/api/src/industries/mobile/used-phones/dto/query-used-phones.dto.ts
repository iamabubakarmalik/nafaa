import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PtaStatus, TradeInSource, UsedPhoneCondition, UsedPhoneStatus } from '@prisma/client';

export class QueryUsedPhonesDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;

  @ApiPropertyOptional({ enum: UsedPhoneStatus })
  @IsOptional()
  @IsEnum(UsedPhoneStatus)
  status?: UsedPhoneStatus;

  @ApiPropertyOptional({ enum: UsedPhoneCondition })
  @IsOptional()
  @IsEnum(UsedPhoneCondition)
  condition?: UsedPhoneCondition;

  @ApiPropertyOptional({ enum: TradeInSource })
  @IsOptional()
  @IsEnum(TradeInSource)
  source?: TradeInSource;

  @ApiPropertyOptional({ enum: PtaStatus })
  @IsOptional()
  @IsEnum(PtaStatus)
  ptaStatus?: PtaStatus;

  @ApiPropertyOptional({ description: 'yyyy-MM-dd; sold date for SOLD, received date otherwise' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ description: 'yyyy-MM-dd' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional({ description: 'Only phones in stock for at least this many days' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  agedDays?: number;

  @ApiPropertyOptional({ enum: ['new', 'old', 'priceHigh', 'margin', 'sold'] })
  @IsOptional()
  @IsIn(['new', 'old', 'priceHigh', 'margin', 'sold'])
  sort?: 'new' | 'old' | 'priceHigh' | 'margin' | 'sold';

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
