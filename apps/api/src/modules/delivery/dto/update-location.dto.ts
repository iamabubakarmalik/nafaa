import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export class UpdateLocationDto {
  @Type(() => Number) @IsLatitude()
  lat!: number;

  @Type(() => Number) @IsLongitude()
  lng!: number;

  @IsOptional() @Type(() => Number)
  speed?: number;

  @IsOptional() @Type(() => Number)
  heading?: number;

  @IsOptional() @Type(() => Number)
  accuracy?: number;
}
