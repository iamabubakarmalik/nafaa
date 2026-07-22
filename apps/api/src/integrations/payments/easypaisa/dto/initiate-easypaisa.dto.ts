import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Min } from 'class-validator';

export class InitiateEasypaisaDto {
  @IsString()
  orderId!: string;

  @Type(() => Number) @Min(1)
  amount!: number;

  @IsIn(['MA', 'OTC']) // Mobile Account or Over-the-Counter
  paymentMethod!: 'MA' | 'OTC';

  @IsOptional() @IsString()
  mobileAccountNo?: string;

  @IsOptional() @IsString()
  email?: string;
}
