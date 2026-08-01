import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWeddingContractDto {
  @ApiProperty() @IsString() brideName!: string;
  @ApiProperty() @IsString() groomName!: string;
  @ApiProperty() @IsString() contactPerson!: string;
  @ApiProperty() @IsString() contactPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;

  @ApiProperty() @IsString() weddingDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ceremonyVenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receptionVenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBridalBouquet?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBridesmaidBouquets?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() bridesmaidCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBoutonnieres?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() boutonniereCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesGarlands?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() garlandCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesCarDecoration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesStageDecoration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesMehndiSetup?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesTableCentrepieces?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() centrepieceCount?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() colorTheme?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() primaryFlowers?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() styleInspiration?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() moodBoardUrls?: string[];

  @ApiProperty() @IsNumber() quotedAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advanceAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() siteVisitDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() setupStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateContractStatusDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordWeddingPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
