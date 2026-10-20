import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const METHOD_MSG = { message: 'Payment ka tareeqa sahi chunein' };
export const CONTRACT_STATUSES = ['QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export class CreateWeddingContractDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Dulhan ka naam likhein' }) @MaxLength(120) brideName!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Dulha ka naam likhein' }) @MaxLength(120) groomName!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Rabta karne wale ka naam likhein' }) @MaxLength(120) contactPerson!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Phone likhein' }) @MaxLength(20) contactPhone!: string;
  // The form sends '' when no email is typed; that means none, not a bad address.
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => (value === '' ? undefined : value)) @IsEmail() contactEmail?: string;

  @ApiProperty() @IsString() weddingDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ceremonyVenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receptionVenue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBridalBouquet?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBridesmaidBouquets?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) bridesmaidCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesBoutonnieres?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) boutonniereCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesGarlands?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) garlandCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesCarDecoration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesStageDecoration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesMehndiSetup?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesTableCentrepieces?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) centrepieceCount?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) colorTheme?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) primaryFlowers?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() styleInspiration?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) moodBoardUrls?: string[];

  @ApiProperty() @IsNumber() @Min(0) quotedAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advanceAmount?: number;
  /** How the booking advance came in; it lands in that account (drawer for cash). */
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) advancePaymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() siteVisitDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() setupStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateWeddingContractDto extends PartialType(CreateWeddingContractDto) {}

/** Flowers and stock taken from the shop for the wedding. */
export class WeddingMaterialDto {
  @ApiProperty() @IsUUID('4', { message: 'Cheez chunein' }) productId!: string;
  @ApiProperty() @IsNumber() @Min(0.001, { message: 'Kitne — likhein' }) quantity!: number;
}

export class UpdateContractStatusDto {
  @ApiProperty() @IsIn(CONTRACT_STATUSES, { message: 'Ghalat status' }) status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  /** On COMPLETED: stems and items used, taken off stock; their cost goes on the bill. */
  @ApiPropertyOptional({ type: [WeddingMaterialDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => WeddingMaterialDto) materials?: WeddingMaterialDto[];
}

export class RecordWeddingPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01, { message: 'Amount sahi likhein' }) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
}
