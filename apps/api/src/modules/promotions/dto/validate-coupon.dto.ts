import { Type } from 'class-transformer';
import { IsOptional, IsString, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString() code!: string;
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @Type(() => Number) @Min(0) orderSubtotal?: number;
}
