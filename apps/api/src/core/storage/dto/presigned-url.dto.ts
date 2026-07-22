import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignedUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsOptional() @IsIn(['product', 'shop', 'avatar', 'review', 'live-shop', 'auction', 'chat'])
  folder?: 'product' | 'shop' | 'avatar' | 'review' | 'live-shop' | 'auction' | 'chat' = 'product';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50 * 1024 * 1024)
  fileSize?: number;
}
