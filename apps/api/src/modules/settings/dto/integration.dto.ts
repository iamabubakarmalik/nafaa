import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { INTEGRATION_TYPES, IntegrationType } from '../constants/settings.constants';

export class UpsertIntegrationDto {
  @ApiProperty({ enum: INTEGRATION_TYPES })
  @IsIn(INTEGRATION_TYPES as any)
  type!: IntegrationType;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() credentials?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsString() webhookUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class TestIntegrationDto {
  @ApiProperty({ enum: INTEGRATION_TYPES })
  @IsIn(INTEGRATION_TYPES as any)
  type!: IntegrationType;
}
