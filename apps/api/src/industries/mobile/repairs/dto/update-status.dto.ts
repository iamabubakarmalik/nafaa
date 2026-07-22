import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepairStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: RepairStatus })
  @IsEnum(RepairStatus)
  toStatus!: RepairStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
