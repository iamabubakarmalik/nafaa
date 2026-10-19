import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const METHOD_MSG = { message: 'Payment ka tareeqa sahi chunein' };

export class SubscribeDto {
  @IsString() memberId!: string;
  @IsString() planId!: string;
  /** `yyyy-mm-dd`; left out, today. */
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) paidAmount?: number;
  /** Agreed price when the desk gives a discount; defaults to the plan total. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) totalPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  /** Leave admission fee off (old member coming back, offer). */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() waiveAdmission?: boolean;
}

export class MembershipPaymentDto {
  @IsNumber() @Min(0.01) @Max(100_000_000) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
}

export class FreezeDto {
  @IsInt() @Min(1) @Max(365) days!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
  /** Part of the plan's freeze fee taken now; the rest goes on khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
}

export class CancelMembershipDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
  /** Kept for older screens. Money goes back only through a return on the bill. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) refundAmount?: number;
}

export class RenewDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
  /** Switch plan on renewal (monthly to quarterly); left out, the same plan. */
  @ApiPropertyOptional() @IsOptional() @IsString() planId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) totalPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
