import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoeGender } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const blank = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

/** A customer asks for a size or colour the shop does not have now. */
export class CreateTryOnDto {
  @ApiPropertyOptional() @Transform(blank) @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2, { message: 'Customer ka naam likhein' }) @MaxLength(80) customerName!: string;
  @ApiProperty() @Transform(trim) @IsString() @Matches(/^[0-9+\-\s]{7,16}$/, { message: 'Phone number sahi likhein' }) customerPhone!: string;
  @ApiPropertyOptional() @Transform(blank) @IsOptional() @IsString() productId?: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2, { message: 'Joote ka naam ya article likhein' }) @MaxLength(120) productName!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) requestedSizes?: string[];
  @ApiPropertyOptional() @Transform(blank) @IsOptional() @IsString() @MaxLength(40) colorPreference?: string;
  @ApiPropertyOptional({ enum: ShoeGender }) @Transform(blank) @IsOptional() @IsEnum(ShoeGender) gender?: ShoeGender;
  /** When the customer was told the stock would come. */
  @ApiPropertyOptional() @Transform(blank) @IsOptional() @IsString() scheduledAt?: string;
  @ApiPropertyOptional() @Transform(blank) @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CompleteTryOnDto {
  @ApiProperty() @IsBoolean() purchased!: boolean;
  @ApiPropertyOptional() @Transform(blank) @IsOptional() @IsString() @MaxLength(20) purchasedSize?: string;
}
