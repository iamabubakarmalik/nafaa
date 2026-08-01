import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRepairServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;

  @ApiProperty() @IsString() itemType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemBrand?: string;
  @ApiProperty() @IsString() itemDescription!: string;
  @ApiProperty() @IsString() issue!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() repairType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advancePaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() estimatedReadyAt?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateRepairStatusDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workDone?: string;
  @ApiPropertyOptional() @IsOptional() partsUsed?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() finalCost?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAfterUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
