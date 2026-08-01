import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToyCategoryType, ToyGenderTarget } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBirthdayReminderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;

  @ApiProperty() @IsString() childName!: string;
  @ApiProperty() @IsString() childBirthDate!: string;
  @ApiPropertyOptional({ enum: ToyGenderTarget }) @IsOptional() @IsEnum(ToyGenderTarget) childGender?: ToyGenderTarget;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() childInterests?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() parentRelation?: string;
  @ApiPropertyOptional({ enum: ToyCategoryType, isArray: true }) @IsOptional() @IsArray() favoriteCategories?: ToyCategoryType[];
  @ApiPropertyOptional() @IsOptional() @IsString() budgetRange?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() reminderDaysBefore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordGiftPurchaseDto {
  @ApiProperty() @IsString() giftDescription!: string;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
}
