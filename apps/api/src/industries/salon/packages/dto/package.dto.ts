import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

export class CreatePackageDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional({ description: 'Price of the services one by one, shown as the saving' }) @IsOptional() @IsNumber() @Min(0) originalPrice?: number | null;
  @ApiProperty({ type: [String], description: 'Services the sessions can be used on; empty means any service' })
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) services!: string[];
  @ApiProperty() @IsInt() @Min(1) @Max(500) totalSessions!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3650) validityDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {}

export class PurchaseDto {
  @ApiProperty() @IsString() packageId!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty({ description: 'Paid now (advance for a bridal package); the rest goes on the khata' }) @IsNumber() @Min(0) amountPaid!: number;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @Transform(bankAlias) @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class UseSessionDto {
  @ApiProperty() @IsString() appointmentId!: string;
}

export class CancelPurchaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
