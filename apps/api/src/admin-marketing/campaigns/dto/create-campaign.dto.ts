import {
  IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength,
} from 'class-validator';

export enum CampaignChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  BOTH = 'BOTH',
}

export enum CampaignType {
  BROADCAST = 'BROADCAST',
  DRIP = 'DRIP',
  TRIGGERED = 'TRIGGERED',
  AB_TEST = 'AB_TEST',
}

export class CreateCampaignDto {
  @IsString() @MinLength(3) name!: string;
  @IsEnum(CampaignChannel) channel!: CampaignChannel;
  @IsOptional() @IsEnum(CampaignType) type?: CampaignType;
  @IsOptional() @IsString() emailSubject?: string;
  @IsOptional() @IsString() emailHtml?: string;
  @IsOptional() @IsString() emailPreheader?: string;
  @IsOptional() @IsString() smsMessage?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) audienceTags?: string[];
  @IsOptional() @IsString() audienceSegment?: string;
  @IsOptional() @IsString() scheduledFor?: string; // ISO
  @IsOptional() @IsBoolean() draft?: boolean;
}
