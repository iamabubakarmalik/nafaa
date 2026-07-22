import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, Min } from 'class-validator';

export class PlaceBidDto {
  @Type(() => Number) @Min(0.01)
  amount!: number;

  @IsOptional() @IsBoolean()
  isAutoBid?: boolean;

  @IsOptional() @Type(() => Number) @Min(0.01)
  maxAutoBid?: number;
}
