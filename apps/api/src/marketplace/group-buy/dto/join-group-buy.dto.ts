import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class JoinGroupBuyDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  quantity?: number = 1;
}
