import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class StartSessionDto {
  @ApiProperty() @IsString() stationId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() playerCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() gameSelected?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerHour?: number;
}

export class EndSessionDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() foodCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() additionalCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
