import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CashTransactionDto {
  @ApiProperty({ enum: ['CASH_IN', 'CASH_OUT'] })
  @IsEnum(['CASH_IN', 'CASH_OUT'])
  type!: 'CASH_IN' | 'CASH_OUT';

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'Owner withdrew cash' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
