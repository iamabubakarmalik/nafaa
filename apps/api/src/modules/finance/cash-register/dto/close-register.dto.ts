import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { Denominations } from './denominations';

export class CloseRegisterDto {
  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  closingBalance!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** The exact till to close. Without it, the open till of the active branch. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registerId?: string;

  /** Optional note/coin count; must add up to closingBalance. */
  @ApiPropertyOptional({ example: { '5000': 2, '1000': 12 } })
  @IsOptional()
  @IsObject()
  denominations?: Denominations;
}
