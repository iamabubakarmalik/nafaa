import { ApiPropertyOptional } from '@nestjs/swagger';
import { DamageReasonCode, DamageStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

export class ApproveDamageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RejectDamageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ApproveManyDamageDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListDamageDto {
  /** Business-day keys (YYYY-MM-DD); no date filter when left out. */
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsEnum(DamageStatus) status?: DamageStatus;
  @IsOptional() @IsEnum(DamageReasonCode) reasonCode?: DamageReasonCode;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() productId?: string;
  /** Explicit branch; the active branch when left out. */
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
