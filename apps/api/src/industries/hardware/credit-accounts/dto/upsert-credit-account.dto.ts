import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareCreditAccountStatus } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertCreditAccountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() interestRateMonthly?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorRelation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chequeSecurity?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() postDatedCheques?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() referredBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentsUrls?: string[];
  @ApiPropertyOptional({ enum: HardwareCreditAccountStatus }) @IsOptional() @IsEnum(HardwareCreditAccountStatus) status?: HardwareCreditAccountStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
