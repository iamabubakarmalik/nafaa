import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustRollDto {
  @ApiProperty({
    example: -5,
    description: 'Positive (+) to add length, negative (-) to reduce',
  })
  @IsNumber()
  lengthDeltaFt!: number;

  @ApiProperty({ example: 'Damage in corner' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
