import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';

export class CreateEmiPlanDto {
  @ApiPropertyOptional({ description: 'The credit bill the plan collects (required to create)' })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
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

  @ApiProperty({ example: 6, description: 'Number of installments (1 to 60)' })
  @IsInt()
  @Min(1)
  @Max(60)
  installmentCount!: number;

  @ApiProperty({ example: '2026-07-01', description: 'First installment due date (yyyy-MM-dd, shop time)' })
  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'Pehli qist ki tareekh chunein' })
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
