import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertReorderRuleDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsNumber() minStock!: number;
  @ApiProperty() @IsNumber() reorderPoint!: number;
  @ApiProperty() @IsNumber() reorderQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredSupplier?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() leadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoAlert?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
