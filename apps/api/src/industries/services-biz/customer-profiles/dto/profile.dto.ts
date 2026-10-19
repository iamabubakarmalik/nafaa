import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Home / site facts the technician needs before the visit. Totals are worked out, never set. */
export class UpsertProfileDto {
  @ApiProperty() @IsUUID() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) propertyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) propertySize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) ownershipType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() preferredTechnicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) preferredTimeSlot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) paymentPreference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) emergencyAccessInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSecurityGuard?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPets?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) petDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) gateCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) buildingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) floorNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) flatNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['PHONE', 'WHATSAPP', 'SMS', 'EMAIL']) preferredContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) bestTimeToCall?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVip?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
