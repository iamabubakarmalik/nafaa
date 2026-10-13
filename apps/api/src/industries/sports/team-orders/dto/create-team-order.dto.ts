import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TeamOrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

/** Blank form fields arrive as ''; treat them as not given. */
const blankToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateTeamOrderDto {
  @ApiProperty() @IsString() teamName!: string;
  @ApiProperty() @IsString() contactPerson!: string;
  @ApiProperty() @IsString() contactPhone!: string;
  @ApiPropertyOptional() @Transform(blankToUndefined) @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organization?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  // Plain objects: without @Type the global implicit conversion turns each
  // element into an empty array and the rows are saved as [].
  @ApiProperty() @IsArray() @Type(() => Object) items!: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    size?: string;
    color?: string;
    customizationNotes?: string;
  }>;

  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shippingCharge?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCustomJerseys?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customizationDetails?: string;
  @ApiPropertyOptional() @IsOptional() playerNames?: any;
  @ApiPropertyOptional() @IsOptional() playerNumbers?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() teamLogoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advancePaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: string;

  @ApiPropertyOptional() @Transform(blankToUndefined) @IsOptional() @IsString() expectedDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() poNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

/** Edit form: same fields as create, all optional. Payments go through /payment. */
export class UpdateTeamOrderDto extends PartialType(CreateTeamOrderDto) {}

export class UpdateTeamOrderStatusDto {
  @ApiProperty({ enum: TeamOrderStatus }) @IsEnum(TeamOrderStatus) status!: TeamOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  /** Money taken at delivery. Left out, the full remaining amount is taken as collected. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: string;
}

export class RecordPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
