import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailService } from '../../email/email.service';
import { SmsService } from '../../sms/sms.service';
import { UpsertSmsTemplateDto } from '../../sms/dto/send-sms.dto';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminCommunicationsService } from './admin-communications.service';
import { BulkSendDto } from './dto/bulk-send.dto';

@ApiTags('Admin - Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/communications')
export class AdminCommunicationsController {
  constructor(
    private readonly service: AdminCommunicationsService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  @Get('email/stats')
  emailStats() {
    return this.emailService.stats();
  }

  @Get('email/logs')
  emailLogs(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailService.listLogs({
      tenantId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Post('email/retry/:id')
  retryEmail(@Param('id') id: string) {
    return this.emailService.retryFailed(id);
  }

  @Get('sms/stats')
  smsStats() {
    return this.smsService.stats();
  }

  @Get('sms/logs')
  smsLogs(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.smsService.listLogs({
      tenantId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Post('sms/retry/:id')
  retrySms(@Param('id') id: string) {
    return this.smsService.retryFailed(id);
  }

  // SMS Templates CRUD
  @Get('sms/templates')
  listSmsTemplates() {
    return this.smsService.listTemplates();
  }

  @Post('sms/templates')
  createSmsTemplate(@Body() dto: UpsertSmsTemplateDto) {
    return this.smsService.createTemplate(dto);
  }

  @Patch('sms/templates/:id')
  updateSmsTemplate(@Param('id') id: string, @Body() dto: Partial<UpsertSmsTemplateDto>) {
    return this.smsService.updateTemplate(id, dto);
  }

  @Delete('sms/templates/:id')
  deleteSmsTemplate(@Param('id') id: string) {
    return this.smsService.deleteTemplate(id);
  }

  @Post('sms/templates/seed-defaults')
  seedSmsDefaults() {
    return this.smsService.seedDefaultTemplates();
  }

  // Bulk send
  @Post('bulk-send')
  bulkSend(@Body() dto: BulkSendDto) {
    return this.service.bulkSend(dto);
  }

  // Test send
  @Post('test/email')
  testEmail(@Body() body: { toEmail: string; templateSlug?: string }) {
    return this.service.testEmail(body.toEmail, body.templateSlug);
  }

  @Post('test/sms')
  testSms(@Body() body: { toPhone: string; templateSlug?: string }) {
    return this.service.testSms(body.toPhone, body.templateSlug);
  }
}
