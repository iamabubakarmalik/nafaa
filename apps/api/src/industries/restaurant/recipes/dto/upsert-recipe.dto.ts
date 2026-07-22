import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class IngredientDto {
  @ApiProperty() @IsString() ingredientProductId!: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiProperty() @IsString() unit!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPerUnit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOptional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
}

export class UpsertRecipeDto {
  @ApiProperty() @IsString() menuItemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() yieldQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() yieldUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preparationSteps?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() cookingTime?: number;
  @ApiProperty({ type: [IngredientDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => IngredientDto) ingredients!: IngredientDto[];
}
