import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Shop rent for May' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsIn(MONEY_METHODS)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Day of the expense. A business-day key ("2026-10-13") or a full ISO time. ' +
      "Today's key is saved with the current time so a cash expense lands in the open shift. Defaults to now.",
  })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional({ description: 'Photo of the bill or receipt' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ description: 'Branch of the expense; defaults to the open branch, then the main one' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

/** Every field optional: send only what changed. An empty string clears category or photo. */
export class UpdateExpenseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000_000) amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expenseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional({ enum: ExpenseStatus }) @IsOptional() @IsEnum(ExpenseStatus) status?: ExpenseStatus;
}

/** Pays a pending bill now. */
export class PayExpenseDto {
  @ApiPropertyOptional({ enum: PaymentMethod, description: 'How it was paid; keeps the saved method when left out' })
  @IsOptional()
  @IsIn(MONEY_METHODS)
  paymentMethod?: PaymentMethod;
}
