import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { NewsletterService } from './newsletter.service';
import { ListSubscribersDto } from './dto/list-subscribers.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { SendNewsletterDto } from './dto/send-newsletter.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

@Controller('admin/marketing/newsletter')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class NewsletterController {
  constructor(private readonly svc: NewsletterService) {}

  @Get('stats')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_VIEW)
  stats() {
    return this.svc.getStats();
  }

  @Get('subscribers')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_VIEW)
  list(@Query() dto: ListSubscribersDto) {
    return this.svc.listSubscribers(dto);
  }

  @Get('subscribers/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_VIEW)
  getOne(@Param('id') id: string) {
    return this.svc.getSubscriber(id);
  }

  @Patch('subscribers/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_MANAGE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriberDto,
    @Req() req: any,
  ) {
    return this.svc.updateSubscriber(id, dto, req.user.id);
  }

  @Post('subscribers/bulk')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_MANAGE)
  bulk(@Body() dto: BulkActionDto, @Req() req: any) {
    return this.svc.bulkAction(dto, req.user.id);
  }

  @Post('send')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_SEND)
  send(@Body() dto: SendNewsletterDto, @Req() req: any) {
    return this.svc.sendNewsletter(dto, req.user.id);
  }

  @Get('history')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_VIEW)
  history(@Query() dto: { page?: number; limit?: number }) {
    return this.svc.listNewsletters(dto);
  }

  @Get('export')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.NEWSLETTER_EXPORT)
  @Header('Content-Type', 'text/csv')
  async export(@Query() dto: ListSubscribersDto, @Res() res: Response) {
    const { csv, count } = await this.svc.exportSubscribers(dto);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="subscribers-${Date.now()}.csv"`,
    );
    res.setHeader('X-Total-Rows', String(count));
    res.send(csv);
  }
}
