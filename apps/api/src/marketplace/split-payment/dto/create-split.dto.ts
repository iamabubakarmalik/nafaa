import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested, Min } from 'class-validator';

class ParticipantDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() name?: string;
  @Type(() => Number) @Min(1) shareAmount!: number;
}

export class CreateSplitDto {
  @IsString() orderId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ParticipantDto)
  participants!: ParticipantDto[];
}
