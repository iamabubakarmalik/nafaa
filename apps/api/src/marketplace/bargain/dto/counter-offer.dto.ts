import { Type } from 'class-transformer';
import { IsOptional, IsString, Min } from 'class-validator';

export class CounterOfferDto {
  @Type(() => Number) @Min(0.01)
  offerPrice!: number;

  @IsOptional() @IsString()
  message?: string;
}
