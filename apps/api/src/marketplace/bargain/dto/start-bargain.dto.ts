import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class StartBargainDto {
  @IsString()
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @Type(() => Number) @Min(0.01)
  offerPrice!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  quantity?: number = 1;

  @IsOptional() @IsString()
  message?: string;
}
