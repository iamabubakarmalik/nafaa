import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, MaxLength, ValidateIf, ValidateNested } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Bakery Items' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: '#2c9466' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: '🎂' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Parent category; null or empty = top level. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsUUID()
  parentId?: string | null;
}

export class CategoryOrderItemDto {
  @ApiProperty() @IsUUID() id!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsUUID() parentId?: string | null;
  @ApiProperty() @IsInt() @Min(0) sortOrder!: number;
}

/** New place of categories after a drag: parent and position among siblings. */
export class ReorderCategoriesDto {
  @ApiProperty({ type: [CategoryOrderItemDto] })
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => CategoryOrderItemDto)
  items!: CategoryOrderItemDto[];
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
