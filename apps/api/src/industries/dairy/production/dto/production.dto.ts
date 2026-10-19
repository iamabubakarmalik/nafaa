import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class ProductionOutputDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsNumber() @Min(0.001) @Max(20000) quantity!: number;
}

export class CreateProductionDto {
  /** Milk (or cream) used; the shop's main milk when left out. */
  @ApiPropertyOptional() @IsOptional() @IsString() sourceProductId?: string;
  @ApiProperty() @IsNumber() @Min(0.001) @Max(20000) sourceQty!: number;
  @ApiProperty({ type: [ProductionOutputDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => ProductionOutputDto)
  outputs!: ProductionOutputDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

export class CancelProductionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
