import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

class IngredientDto {
  @ApiProperty() @IsUUID('all', { message: 'Ingredient chunein' }) ingredientProductId!: string;
  @ApiProperty() @IsNumber() @Min(0.0001, { message: 'Quantity 0 se zyada likhein' }) @Max(100000) quantity!: number;
  @ApiProperty() @IsString() @MaxLength(20) unit!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPerUnit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOptional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpsertRecipeDto {
  @ApiProperty() @IsUUID() menuItemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01, { message: 'Kitni plate banti hain — 0 se zyada likhein' }) @Max(10000) yieldQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) yieldUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) preparationSteps?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1440) cookingTime?: number;
  @ApiProperty({ type: [IngredientDto] })
  @IsArray() @ArrayMinSize(1, { message: 'Kam se kam ek cheez recipe me daalein' }) @ArrayMaxSize(60)
  @ValidateNested({ each: true }) @Type(() => IngredientDto)
  ingredients!: IngredientDto[];
}
