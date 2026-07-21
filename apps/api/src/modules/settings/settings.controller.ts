import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch,
  Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateReceiptConfigDto } from './dto/update-receipt-config.dto';
import { RemovePinDto, SetPinDto, VerifyPinDto } from './dto/verify-pin.dto';
import { TestIntegrationDto, UpsertIntegrationDto } from './dto/integration.dto';
import { DataExportDto, DeleteTenantDto, TransferOwnershipDto } from './dto/danger-zone.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  // ═══ CORE ═══
  @Get() @ApiOperation({ summary: 'Get all settings + tenant + plan + notification prefs' })
  get(@GetUser() u: AuthenticatedUser) { return this.svc.core.get(u); }

  @Patch() @ApiOperation({ summary: 'Update settings (partial)' })
  update(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.svc.core.update(u, dto);
  }

  @Post('reset/:section') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a section to defaults' })
  reset(@GetUser() u: AuthenticatedUser, @Param('section') section: string) {
    return this.svc.core.resetSection(u, section);
  }

  // ═══ RECEIPT CONFIG ═══
  @Get('receipt-config')
  getReceiptConfig(@GetUser() u: AuthenticatedUser) {
    return this.svc.core.getReceiptConfig(u);
  }

  @Patch('receipt-config')
  updateReceiptConfig(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateReceiptConfigDto) {
    return this.svc.core.updateReceiptConfig(u, dto);
  }

  // ═══ SECURITY / PIN ═══
  @Post('security/verify-pin') @HttpCode(HttpStatus.OK)
  verifyPin(@GetUser() u: AuthenticatedUser, @Body() dto: VerifyPinDto) {
    return this.svc.security.verifyPin(u, dto.pin);
  }

  @Post('security/set-pin') @HttpCode(HttpStatus.OK)
  setPin(@GetUser() u: AuthenticatedUser, @Body() dto: SetPinDto) {
    return this.svc.security.setPin(u, dto.pin);
  }

  @Post('security/remove-pin') @HttpCode(HttpStatus.OK)
  removePin(@GetUser() u: AuthenticatedUser, @Body() dto: RemovePinDto) {
    return this.svc.security.removePin(u, dto.currentPin);
  }

  @Get('security/score')
  securityScore(@GetUser() u: AuthenticatedUser) {
    return this.svc.security.securityScore(u);
  }

  @Get('security/sessions')
  listSessions(@GetUser() u: AuthenticatedUser) {
    return this.svc.security.listAllSessions(u);
  }

  @Delete('security/sessions/:id')
  revokeSession(@GetUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.security.revokeSession(u, id);
  }

  @Get('security/login-history')
  loginHistory(@GetUser() u: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.svc.security.loginHistory(u, limit ? Number(limit) : undefined);
  }

  @Get('security/activity-log')
  activityLog(
    @GetUser() u: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.svc.security.activityLog(u, {
      limit: limit ? Number(limit) : undefined, action, userId,
    });
  }

  // ═══ INTEGRATIONS (FBR / Daraz / FoodPanda etc.) ═══
  @Get('integrations')
  listIntegrations(@GetUser() u: AuthenticatedUser) {
    return this.svc.integrations.list(u);
  }

  @Get('integrations/:type')
  getIntegration(@GetUser() u: AuthenticatedUser, @Param('type') type: string) {
    return this.svc.integrations.getOne(u, type);
  }

  @Patch('integrations')
  upsertIntegration(@GetUser() u: AuthenticatedUser, @Body() dto: UpsertIntegrationDto) {
    return this.svc.integrations.upsert(u, dto);
  }

  @Post('integrations/:type/disable') @HttpCode(HttpStatus.OK)
  disableIntegration(@GetUser() u: AuthenticatedUser, @Param('type') type: string) {
    return this.svc.integrations.disable(u, type);
  }

  @Delete('integrations/:type')
  removeIntegration(@GetUser() u: AuthenticatedUser, @Param('type') type: string) {
    return this.svc.integrations.remove(u, type);
  }

  @Post('integrations/test') @HttpCode(HttpStatus.OK)
  testIntegration(@GetUser() u: AuthenticatedUser, @Body() dto: TestIntegrationDto) {
    return this.svc.integrations.testConnection(u, dto.type);
  }

  // ═══ NOTIFICATION PREFERENCES ═══
  @Get('notifications/preferences')
  getNotifPref(@GetUser() u: AuthenticatedUser) {
    return this.svc.notifications.get(u);
  }

  @Patch('notifications/preferences')
  updateNotifPref(@GetUser() u: AuthenticatedUser, @Body() dto: any) {
    return this.svc.notifications.update(u, dto);
  }

  @Post('notifications/test') @HttpCode(HttpStatus.OK)
  testNotif(@GetUser() u: AuthenticatedUser, @Body() body: { channel: 'email' | 'sms' | 'push' }) {
    return this.svc.notifications.sendTest(u, body.channel);
  }

  // ═══ BACKUP / EXPORT ═══
  @Get('backup/stats')
  backupStats(@GetUser() u: AuthenticatedUser) {
    return this.svc.backup.stats(u);
  }

  @Post('backup/export') @HttpCode(HttpStatus.OK)
  exportData(@GetUser() u: AuthenticatedUser, @Body() dto: DataExportDto) {
    return this.svc.backup.exportData(u, dto.entities);
  }

  // ═══ DANGER ZONE ═══
  @Post('danger/transfer-ownership') @HttpCode(HttpStatus.OK)
  transferOwnership(@GetUser() u: AuthenticatedUser, @Body() dto: TransferOwnershipDto) {
    return this.svc.danger.transferOwnership(u, dto.newOwnerUserId, dto.currentPassword);
  }

  @Post('danger/delete-tenant') @HttpCode(HttpStatus.OK)
  deleteTenant(@GetUser() u: AuthenticatedUser, @Body() dto: DeleteTenantDto) {
    return this.svc.danger.deleteTenant(u, dto.confirmation, dto.currentPassword);
  }

  @Post('danger/cancel-deletion') @HttpCode(HttpStatus.OK)
  cancelDeletion(@GetUser() u: AuthenticatedUser) {
    return this.svc.danger.cancelDeletion(u);
  }
}
