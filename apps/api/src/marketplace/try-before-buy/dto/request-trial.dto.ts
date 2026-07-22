import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestTrialDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsString() addressId!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7) trialDays?: number;
  @IsOptional() @IsString() customerNotes?: string;
}
