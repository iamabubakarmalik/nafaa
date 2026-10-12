import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { Denominations } from './denominations';

export class OpenRegisterDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  openingBalance!: number;

  /** Branch whose till is being opened. Defaults to the active shop. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** Optional note/coin count; must add up to openingBalance. */
  @ApiPropertyOptional({ example: { '1000': 3, '500': 4 } })
  @IsOptional()
  @IsObject()
  denominations?: Denominations;
}
