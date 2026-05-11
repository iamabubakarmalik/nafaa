import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateStep3Dto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopAddress?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:mm)' })
  openTime?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:mm)' })
  closeTime?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  workingDays?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxNumber?: string;
}
