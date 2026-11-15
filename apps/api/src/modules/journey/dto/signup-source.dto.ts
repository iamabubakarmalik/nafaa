import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Where a new shop came from, as the web app saw it on its first visit:
 * utm_* on the landing URL, the first touch carried from nafaa.pk (ft_*),
 * the nafaa.pk call-to-action id, the referring page and the landing page.
 */
export class SignupSourceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) utmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) utmMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) utmCampaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) utmTerm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) utmContent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) ftSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) ftMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) ftCampaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) ftTerm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) ftContent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) cta?: string;
  /** Full referring URL (document.referrer); only its domain is kept. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) referrer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) landingPage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) referralCode?: string;
}
