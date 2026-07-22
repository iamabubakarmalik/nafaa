import { IsOptional, IsString } from 'class-validator';

export class AddWishlistDto {
  @IsString()
  productId!: string;

  @IsOptional() @IsString()
  notes?: string;
}
