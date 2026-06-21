import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsInt, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateEmiPlanDto {
  @ApiPropertyOptional({ description: 'Link to existing sale (optional)' })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: 150000, description: 'Full device price' })
  @IsNumber()
  @Min(1)
  totalAmount!: number;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @ApiProperty({ example: 6, description: 'Number of installments (3, 6, 9, 12)' })
  @IsInt()
  @Min(1)
  installmentCount!: number;

  @ApiProperty({ example: '2026-07-01', description: 'First installment due date' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
