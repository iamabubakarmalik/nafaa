import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class SaveCardDto {
  @IsString()
  cardBrand!: string;

  @IsString() @Length(4, 4)
  last4!: string;

  @Type(() => Number) @IsInt() @Min(1)
  expiryMonth!: number;

  @Type(() => Number) @IsInt() @Min(2026)
  expiryYear!: number;

  @IsString()
  holderName!: string;

  @IsString()
  gatewayToken!: string;

  @IsString()
  gatewayProvider!: string;

  @IsOptional()
  isDefault?: boolean;
}
