import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CutRollDto {
  @ApiProperty({ example: 10, description: 'Length to cut — whole feet portion' })
  @IsNumber()
  @Min(0)
  lengthFt!: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Length to cut — inches portion (0-11). E.g. cut 10ft 6in',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthInch?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Customer width (if smaller than roll width, leftover becomes cut piece)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  customerWidthFt?: number;

  @ApiPropertyOptional({
    description: 'Create cut piece from leftover width? (Recommended: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createLeftoverPiece?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saleItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
