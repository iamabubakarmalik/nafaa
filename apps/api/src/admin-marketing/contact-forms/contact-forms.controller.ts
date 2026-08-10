import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { ContactFormsService } from './contact-forms.service';
import { ListFormsDto } from './dto/list-forms.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReplyFormDto } from './dto/reply-form.dto';

@Controller('admin/marketing/contact-forms')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class ContactFormsController {
  constructor(private readonly svc: ContactFormsService) {}

  @Get('stats')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONTACT_FORMS_VIEW)
  stats() {
    return this.svc.getStats();
  }

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONTACT_FORMS_VIEW)
  list(@Query() dto: ListFormsDto) {
    return this.svc.list(dto);
  }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONTACT_FORMS_VIEW)
  get(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Patch(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONTACT_FORMS_MANAGE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Post(':id/reply')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONTACT_FORMS_REPLY)
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyFormDto,
    @Req() req: any,
  ) {
    return this.svc.reply(id, dto, req.user.id);
  }

  @Post(':id/spam')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONTACT_FORMS_MANAGE)
  spam(@Param('id') id: string, @Req() req: any) {
    return this.svc.markSpam(id, req.user.id);
  }
}
