import { IsArray, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class TrackPageviewDto {
  @IsString() visitorId!: string;
  @IsString() sessionId!: string;
  @IsString() path!: string;
  @IsOptional() @IsString() fullUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() referrer?: string;
  @IsOptional() @IsString() utmSource?: string;
  @IsOptional() @IsString() utmMedium?: string;
  @IsOptional() @IsString() utmCampaign?: string;
  @IsOptional() @IsString() utmTerm?: string;
  @IsOptional() @IsString() utmContent?: string;
  @IsOptional() @IsString() deviceType?: string;
  @IsOptional() @IsString() browser?: string;
  @IsOptional() @IsString() os?: string;
  @IsOptional() @IsInt() screenWidth?: number;
  @IsOptional() @IsInt() screenHeight?: number;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsInt() loadTimeMs?: number;
}

export class TrackEventDto {
  @IsString() eventName!: string;
  @IsString() visitorId!: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() eventCategory?: string;
  @IsOptional() @IsString() eventLabel?: string;
  @IsOptional() eventValue?: number;
  @IsOptional() @IsString() path?: string;
  @IsOptional() properties?: any;
}

export class SubscribeNewsletterDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() sourcePage?: string;
  @IsOptional() @IsString() utmSource?: string;
  @IsOptional() @IsString() utmMedium?: string;
  @IsOptional() @IsString() utmCampaign?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class SubmitContactFormDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() formType?: string;
  @IsString() @MinLength(3) subject!: string;
  @IsString() @MinLength(10) message!: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() sourcePage?: string;
  @IsOptional() @IsString() utmSource?: string;
  @IsOptional() @IsString() utmMedium?: string;
  @IsOptional() @IsString() utmCampaign?: string;
}

export class BookDemoDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsEmail() email!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() companySize?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsInt() numberOfShops?: number;
  @IsOptional() @IsString() currentSoftware?: string;
  @IsOptional() @IsString() painPoints?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interestedIn?: string[];
  @IsOptional() @IsString() budget?: string;
  @IsOptional() @IsString() timeline?: string;
  @IsString() preferredDate!: string;
  @IsString() preferredTime!: string;
  @IsOptional() @IsInt() duration?: number;
  @IsOptional() @IsString() meetingType?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() utmSource?: string;
  @IsOptional() @IsString() utmMedium?: string;
  @IsOptional() @IsString() utmCampaign?: string;
}

export class StartChatDto {
  @IsString() visitorId!: string;
  @IsOptional() @IsString() visitorName?: string;
  @IsOptional() @IsEmail() visitorEmail?: string;
  @IsOptional() @IsString() visitorPhone?: string;
  @IsOptional() @IsString() currentPage?: string;
  @IsOptional() @IsString() language?: string;
}

export class ChatMessageDto {
  @IsString() conversationId!: string;
  @IsString() @MinLength(1) content!: string;
}
