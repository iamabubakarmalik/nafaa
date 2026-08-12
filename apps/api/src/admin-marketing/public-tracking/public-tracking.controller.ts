import { Body, Controller, Headers, Ip, Post, Req } from '@nestjs/common';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PublicTrackingService } from './public-tracking.service';
import type { Request } from 'express';
import {
  TrackPageviewDto,
  TrackEventDto,
  SubscribeNewsletterDto,
  SubmitContactFormDto,
  BookDemoDto,
  StartChatDto,
  ChatMessageDto,
} from './dto/tracking.dto';

@Controller('public/marketing')
export class PublicTrackingController {
  constructor(private readonly svc: PublicTrackingService) {}

  @Public()
  @Post('pageview')
  pageview(
    @Body() dto: TrackPageviewDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('referer') referer: string,
  ) {
    return this.svc.trackPageview(dto, { ip, userAgent: ua, referer });
  }

  @Public()
  @Post('event')
  event(@Body() dto: TrackEventDto) {
    return this.svc.trackEvent(dto);
  }

  @Public()
  @Post('newsletter/subscribe')
  subscribe(
    @Body() dto: SubscribeNewsletterDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.svc.subscribeNewsletter(dto, { ip, userAgent: ua });
  }

  @Public()
  @Post('newsletter/unsubscribe')
  unsubscribe(@Body() body: { email: string; reason?: string }) {
    return this.svc.unsubscribeNewsletter(body.email, body.reason);
  }

  @Public()
  @Post('contact-form')
  contactForm(
    @Body() dto: SubmitContactFormDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.svc.submitContactForm(dto, { ip, userAgent: ua });
  }

  @Public()
  @Post('demo-booking')
  demoBooking(
    @Body() dto: BookDemoDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.svc.bookDemo(dto, { ip, userAgent: ua });
  }

  @Public()
  @Post('chat/start')
  chatStart(
    @Body() dto: StartChatDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.svc.startChat(dto, { ip, userAgent: ua });
  }

  @Public()
  @Post('chat/message')
  chatMessage(@Body() dto: ChatMessageDto) {
    return this.svc.chatMessage(dto);
  }

  @Public()
  @Post('heatmap')
  heatmap(@Body() body: {
    path: string;
    visitorId: string;
    sessionId: string;
    deviceType?: string;
    clicks?: any[];
    scrollDepth?: number;
    moves?: any[];
    durationSec?: number;
  }) {
    return this.svc.recordHeatmap(body);
  }
}
