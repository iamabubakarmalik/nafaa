import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Purana khata — system se pehle supplier ko jitna dena tha.
 * Paper register se aane walon ke liye pehla qadam yahi hota hai.
 */
export class OpeningBalanceDto {
  @ApiProperty({ example: 45000, description: 'Pehle se kitna dena tha' })
  @IsNumber() @Min(0) amount!: number;

  @ApiPropertyOptional({ description: 'Kis tareekh ka hisab hai' })
  @IsOptional() @IsDateString() entryDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

/** Udhaar par maal liya (bina purchase bill banaye) */
export class AddDueDto {
  @ApiProperty({ example: 12000 })
  @IsNumber() @Min(1) amount!: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() entryDate?: string;
  @ApiPropertyOptional({ description: 'Bill number ya reference' })
  @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

/** Supplier ko paisa diya */
export class PaymentDto {
  @ApiProperty({ example: 5000 })
  @IsNumber() @Min(1) amount!: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() entryDate?: string;
  @ApiPropertyOptional({ description: 'Cheque number, transfer ref waghera' })
  @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

/** Maal wapas kiya — hamara dena kam hua */
export class ReturnDto {
  @ApiProperty({ example: 3000 })
  @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() entryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

/**
 * Haath se durusti — dono taraf ja sakti hai.
 * Musbat = hamara dena barha, manfi = kam hua.
 */
export class AdjustmentDto {
  @ApiProperty({ example: -500, description: 'Musbat = dena barha, manfi = kam hua' })
  @IsNumber() amount!: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() entryDate?: string;
  @ApiProperty({ description: 'Wajah likhna zaroori hai' })
  @IsString() note!: string;
}
