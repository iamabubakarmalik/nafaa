import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustRollDto {
  @ApiProperty({
    example: -5,
    description: 'Positive (+) to add length, negative (-) to reduce (whole feet portion)',
  })
  @IsNumber()
  lengthDeltaFt!: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Inches portion of adjustment (0-11). E.g. add 5ft 6in',
  })
  @IsOptional()
  @IsNumber()
  lengthDeltaInch?: number;

  @ApiProperty({ example: 'Damage in corner' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
