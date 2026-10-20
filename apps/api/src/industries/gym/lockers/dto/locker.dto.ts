import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const METHOD_MSG = { message: 'Payment ka tareeqa sahi chunein' };

export class CreateLockerDto {
  @IsString() @MaxLength(20) @Matches(/\S/, { message: 'Locker number likhein' }) number!: string;
  @IsNumber({}, { message: 'Mahine ka rent likhein' }) @Min(0) @Max(1_000_000) monthlyRent!: number;
  /** Adds this many lockers in a row from a numeric `number` (e.g. 1 and 20 makes 1–20). */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) count?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class UpdateLockerDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) monthlyRent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  /** Only an empty locker changes between free and repair. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['FREE', 'MAINTENANCE'], { message: 'Status sahi chunein' }) status?: 'FREE' | 'MAINTENANCE';
}

export class LockerRentDto {
  @IsInt({ message: 'Mahine likhein' }) @Min(1, { message: 'Kam az kam 1 mahina' }) @Max(12, { message: 'Ek dafa 12 mahine tak' }) months!: number;
  /** Money taken now; the rest goes on the member's khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
}

export class AssignLockerDto extends LockerRentDto {
  @IsString() memberId!: string;
  /** `yyyy-mm-dd`; left out, today. */
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  /** Rent for this member if different from the locker's usual rent. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) monthlyRent?: number;
}

export class ReleaseLockerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
