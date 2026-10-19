import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Hair, skin, allergies and preferences the stylist reads before starting. */
export class UpsertCustomerProfileDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) hairType?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) hairLength?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) hairColor?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) hairTexture?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) skinType?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) skinTone?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(80, { each: true }) allergies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() preferredStaffId?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) preferredServices?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(80, { each: true }) favoriteBrands?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) medicalConditions?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) medications?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) pregnancyStatus?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
}
