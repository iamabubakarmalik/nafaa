import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UsedPhoneCondition, UsedPhoneStatus } from '@prisma/client';

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
