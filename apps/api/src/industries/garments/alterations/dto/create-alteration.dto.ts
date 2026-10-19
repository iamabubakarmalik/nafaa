import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { GarmentAlterationStatus, GarmentPriority } from '@prisma/client';
import { IsArray, IsEnum, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export class CreateAlterationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  /** The bill the garment was bought on, when it was bought here. */
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiProperty() @IsString() @MaxLength(200) garmentDescription!: string;
  @ApiProperty() @IsString() @MaxLength(120) alterationType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) alterationDetails?: string;
  @ApiPropertyOptional({ enum: GarmentPriority }) @IsOptional() @IsEnum(GarmentPriority) priority?: GarmentPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() promisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tailorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) charges?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) beforeImageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  /** Advance taken when the garment is handed in. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advanceAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) advanceMethod?: string;
}

/** Changes to an open ticket; money already received is not edited here. */
export class UpdateAlterationDto extends PartialType(OmitType(CreateAlterationDto, ['advanceAmount', 'advanceMethod', 'shopId'] as const)) {}

export class AlterationStatusDto {
  @ApiProperty({ enum: GarmentAlterationStatus }) @IsEnum(GarmentAlterationStatus) status!: GarmentAlterationStatus;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) afterImageUrls?: string[];
  /** How the money was taken, used for the sale made on delivery. */
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
  /** Money taken at delivery. Left out, the full remaining amount is taken as collected. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AlterationPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
}
