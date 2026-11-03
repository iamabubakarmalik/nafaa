import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Sent by the app on start and resume. */
export class HeartbeatDto {
  @IsString() @Matches(/^[A-Za-z0-9-]{8,64}$/)
  installId!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @IsString() @Matches(/^\d+(\.\d+){0,3}$/)
  appVersion!: string;

  @IsOptional() @IsString() @MaxLength(32)
  buildNumber?: string;

  @IsOptional() @IsString() @MaxLength(64)
  runtimeVersion?: string;

  @IsOptional() @IsString() @MaxLength(64)
  updateId?: string;

  @IsOptional() @IsString() @MaxLength(32)
  osVersion?: string;

  @IsOptional() @IsString() @MaxLength(80)
  deviceModel?: string;

  @IsOptional() @IsString() @MaxLength(40)
  deviceBrand?: string;

  @IsOptional() @IsIn(['en', 'ur', 'roman'])
  language?: 'en' | 'ur' | 'roman';

  /** Expo push token; null clears it (notifications turned off). */
  @IsOptional() @IsString() @MaxLength(200)
  pushToken?: string | null;
}

export class ConfigQueryDto {
  @IsOptional() @IsIn(['ios', 'android'])
  platform?: 'ios' | 'android';

  @IsOptional() @IsString() @Matches(/^\d+(\.\d+){0,3}$/)
  version?: string;
}

export class DevicesQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsIn(['ios', 'android'])
  platform?: string;

  @IsOptional() @IsString() @MaxLength(20)
  version?: string;

  @IsOptional() @IsString()
  tenantId?: string;

  /** Last seen within N days. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  activeDays?: number;

  @IsOptional() @IsIn(['lastSeen', 'firstSeen', 'version'])
  sort?: 'lastSeen' | 'firstSeen' | 'version';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export class OverviewQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(180)
  days?: number;
}

