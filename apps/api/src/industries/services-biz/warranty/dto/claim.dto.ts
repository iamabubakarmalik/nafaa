import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { WarrantyType } from '@prisma/client';

export const CLAIM_STATUSES = ['SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export const RESOLUTIONS = ['REPAIR', 'REPLACE', 'REFUND', 'NO_FAULT'] as const;

export class CreateClaimDto {
  /** The finished job the complaint is about; customer, dates and warranty come from it. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() originalJobId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional({ enum: WarrantyType }) @IsOptional() @IsEnum(WarrantyType) claimType?: WarrantyType;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(2000) issueDescription!: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(1000, { each: true }) photoUrls?: string[];
  /** Records the claim even when the job's warranty has ended (owner's goodwill). */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowExpired?: boolean;
}

export class ApproveClaimDto {
  @ApiProperty({ enum: RESOLUTIONS }) @IsIn(RESOLUTIONS) resolutionType!: (typeof RESOLUTIONS)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class RejectClaimDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class ListClaimsQuery {
  @ApiPropertyOptional({ enum: CLAIM_STATUSES }) @IsOptional() @IsIn(CLAIM_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
