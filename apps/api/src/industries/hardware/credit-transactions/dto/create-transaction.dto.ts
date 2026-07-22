import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareCreditTransactionType } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCreditTransactionDto {
  @ApiProperty() @IsString() accountId!: string;
  @ApiProperty({ enum: HardwareCreditTransactionType }) @IsEnum(HardwareCreditTransactionType) transactionType!: HardwareCreditTransactionType;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() attachmentUrls?: string[];
}
