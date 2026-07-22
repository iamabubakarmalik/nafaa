import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BakeryCategory, BakeryOrderStatus, BakerySize, CakeFlavor, CakeShape, CreamType, DeliveryType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCakeOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerEmail?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productName?: string;
  @ApiPropertyOptional({ enum: BakeryCategory }) @IsOptional() @IsEnum(BakeryCategory) category?: BakeryCategory;

  @ApiProperty({ enum: BakerySize }) @IsEnum(BakerySize) size!: BakerySize;
  @ApiPropertyOptional() @IsOptional() @IsNumber() customWeightKg?: number;
  @ApiPropertyOptional({ enum: CakeShape }) @IsOptional() @IsEnum(CakeShape) shape?: CakeShape;
  @ApiPropertyOptional() @IsOptional() @IsString() customShapeDesc?: string;
  @ApiProperty({ enum: CakeFlavor }) @IsEnum(CakeFlavor) flavor!: CakeFlavor;
  @ApiPropertyOptional() @IsOptional() @IsString() customFlavorDesc?: string;
  @ApiPropertyOptional({ enum: CreamType }) @IsOptional() @IsEnum(CreamType) creamType?: CreamType;

  @ApiPropertyOptional() @IsOptional() @IsString() numberOrLetter?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfTiers?: number;
  @ApiPropertyOptional() @IsOptional() tierDetails?: any;

  @ApiPropertyOptional() @IsOptional() @IsString() messageOnCake?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() messageColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPhotoOnCake?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasEdibleImage?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() designReferenceUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() designInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorTheme?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() decorativeItems?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() candlesRequired?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() candleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cakeStand?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cakeKnife?: boolean;

  @ApiProperty() @IsString() occasion!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() celebrantName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() celebrantAge?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() eventDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eventTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eventVenue?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEggless?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSugarFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegan?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() allergies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() dietaryNotes?: string;

  @ApiPropertyOptional({ enum: DeliveryType }) @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @ApiProperty() @IsString() neededBy!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryLandmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryCharges?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() basePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() customizationCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() photoCakeCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advanceRequired?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advancePaid?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() specialInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class UpdateCakeOrderStatusDto {
  @ApiProperty({ enum: BakeryOrderStatus }) @IsEnum(BakeryOrderStatus) status!: BakeryOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}
