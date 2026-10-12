import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min,
  ValidateNested,
} from 'class-validator';

export class UpsertQuickKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comboId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'ProductUnit sold by this key (dozen, carton)' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  label!: string;

  @ApiPropertyOptional({ example: '#10b981' })
  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/i, { message: 'Rang #rrggbb shakal me ho' })
  color?: string;

  @ApiPropertyOptional({ description: 'Emoji' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12)
  hotkey?: string;

  @ApiPropertyOptional({ description: 'Heading the key is shown under on the POS' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string;

  @ApiPropertyOptional({ description: 'Only in this branch; every branch when empty' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Only for the person creating it; shared with everyone when false' })
  @IsOptional()
  @IsBoolean()
  personal?: boolean;
}

export class UpdateQuickKeyDto extends PartialType(UpsertQuickKeyDto) {}

export class QuickKeyPositionDto {
  @IsString() @IsNotEmpty() id!: string;
  @IsInt() @Min(0) position!: number;
}

export class ReorderQuickKeysDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => QuickKeyPositionDto)
  items!: QuickKeyPositionDto[];
}
