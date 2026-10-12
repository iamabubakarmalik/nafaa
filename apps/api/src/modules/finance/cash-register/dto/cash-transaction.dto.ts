import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CashTransactionDto {
  @ApiProperty({ enum: ['CASH_IN', 'CASH_OUT'] })
  @IsEnum(['CASH_IN', 'CASH_OUT'])
  type!: 'CASH_IN' | 'CASH_OUT';

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  @Max(100_000_000)
  amount!: number;

  @ApiProperty({ example: 'Owner withdrew cash' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** The exact till. Without it, the open till of the active branch. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registerId?: string;

  /** Client key for this entry; a repeat with the same key is not posted twice. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestId?: string;
}
