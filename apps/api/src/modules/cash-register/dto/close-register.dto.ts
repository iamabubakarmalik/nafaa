import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseRegisterDto {
  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  closingBalance!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
