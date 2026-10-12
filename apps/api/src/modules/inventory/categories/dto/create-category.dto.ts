import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
