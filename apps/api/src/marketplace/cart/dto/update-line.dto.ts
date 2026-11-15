import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateLineDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(999)
  quantity?: number;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @IsOptional()
  modifiers?: any;

  @IsOptional() @IsObject()
  options?: Record<string, unknown>;
}
