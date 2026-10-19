import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiderDeliveryStatus } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AssignRiderDto {
  @ApiProperty() @IsString() riderId!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) estimatedMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(500) distanceKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;
  /** What the shop owes the rider for this trip; it becomes an expense when paid from the drawer at settle. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) riderCommission?: number;
}

export class DeliveryStatusDto {
  @ApiProperty({ enum: RiderDeliveryStatus }) @IsEnum(RiderDeliveryStatus) status!: RiderDeliveryStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) customerRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) feedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) proofPhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) failureReason?: string;
}

/** The rider is back at the counter with the cash of these delivered orders. */
export class SettleRiderCashDto {
  @ApiProperty() @IsString() riderId!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsString({ each: true }) orderIds!: string[];
  /** The rider's fee for these trips is paid from the drawer now and saved as a cash expense (needs expenses.create). */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() payRiderFee?: boolean;
}
