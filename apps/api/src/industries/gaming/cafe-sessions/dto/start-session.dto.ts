import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class StartSessionDto {
  @ApiProperty() @IsString() stationId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) playerCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) gameSelected?: string;
  /** Rate for this session (package or player rate); the station's hourly rate when left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ratePerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class EndSessionDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) foodCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) additionalCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class CloseSalePartDto {
  @ApiProperty() @IsString() id!: string;
  /** Line amount the session was added to the bill with. */
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  /** Minutes billed when it was added. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minutes?: number;
}

export class CloseSaleDto {
  @ApiProperty() @IsString() saleId!: string;
  @ApiProperty({ type: [CloseSalePartDto] }) @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CloseSalePartDto) sessions!: CloseSalePartDto[];
}
