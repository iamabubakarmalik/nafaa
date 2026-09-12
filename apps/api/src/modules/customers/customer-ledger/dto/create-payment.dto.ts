import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

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
