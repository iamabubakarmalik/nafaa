import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

class OptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Har option ka naam likhein' }) @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-100000) @Max(100000) priceAdjustment?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) emoji?: string;
  /** Raw material one portion of this add-on uses; empty or null clears it. */
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(60) ingredientProductId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100000) ingredientQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) ingredientUnit?: string;
}

export class UpsertModifierGroupDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Group ka naam likhein' }) @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;
  @ApiPropertyOptional({ enum: ModifierType }) @IsOptional() @IsEnum(ModifierType) type?: ModifierType;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(50) minSelections?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(50) maxSelections?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ type: [OptionDto] }) @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => OptionDto) options!: OptionDto[];
}

export class AssignDishesDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) menuItemIds!: string[];
}
