import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateTicketDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating!: number;

  @IsOptional() @IsString()
  feedback?: string;
}
