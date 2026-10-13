import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class CreatePaymentDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  /** How the customer paid. Cash goes to the drawer, the rest to its bank or wallet account. */
  @ApiPropertyOptional({ enum: MONEY_METHODS, default: 'CASH' })
  @IsOptional()
  @Transform(({ value }) => (value === 'BANK' ? 'BANK_TRANSFER' : value))
  @IsIn(MONEY_METHODS)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Bina sale ke udhaar — jaise purana hisab, ya koi cheez bina bill
 * ke di. Naye dukandar jo pehle copy par khata likhte the, unke liye
 * ye sab se zaroori cheez hai.
 */
export class AddUdhaarDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Bill ya parchi ka number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Purana khata shuru karne ke liye — customer ka balance seedha
 * set kar dete hain (jorte nahi). Copy se software par aate waqt
 * yehi chahiye hota hai.
 */
export class OpeningBalanceDto {
  @ApiProperty({ example: 12000, description: 'Customer par kitna purana baqi hai' })
  @IsNumber()
  @Min(0)
  balance!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
