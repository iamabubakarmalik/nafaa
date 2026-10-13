import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class SetStaffStatusDto {
  @ApiProperty({ enum: StaffStatus })
  @IsEnum(StaffStatus)
  status!: StaffStatus;

  @ApiPropertyOptional({ description: 'Last working day when the person leaves' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
