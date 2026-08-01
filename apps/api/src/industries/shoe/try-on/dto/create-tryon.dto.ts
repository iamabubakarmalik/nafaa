import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoeGender } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTryOnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() requestedSizes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() colorPreference?: string;
  @ApiPropertyOptional({ enum: ShoeGender }) @IsOptional() @IsEnum(ShoeGender) gender?: ShoeGender;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
