import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLensOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() frameProductId?: string;
  @ApiProperty() @IsString() frameName!: string;
  @ApiProperty() @IsString() lensType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lensMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lensIndex?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() lensCoatings?: string[];

  // Manual prescription override (if no prescriptionId)
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() rightAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() leftAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pupilDistance?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() labName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() labOrderRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() framePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lensPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fittingCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateLensOrderStatusDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() labOrderRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qcNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fittingNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class LensOrderPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}
