import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ─── General Settings ───
  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  get(@GetUser() user: AuthenticatedUser) {
    return this.settingsService.get(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings (partial)' })
  update(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.update(user, dto);
  }

  @Post('reset/:section')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a section to defaults' })
  reset(
    @GetUser() user: AuthenticatedUser,
    @Param('section') section: string,
  ) {
    return this.settingsService.resetSection(user, section);
  }

  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify manager PIN' })
  verifyPin(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { pin: string },
  ) {
    return this.settingsService.verifyPin(user, body.pin);
  }

  // ─── Receipt Configuration ───
  @Get('receipt-config')
  @ApiOperation({ summary: 'Get receipt configuration' })
  getReceiptConfig(@GetUser() user: AuthenticatedUser) {
    return this.settingsService.getReceiptConfig(user);
  }

  @Patch('receipt-config')
  @ApiOperation({ summary: 'Update receipt configuration' })
  updateReceiptConfig(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: any,
  ) {
    return this.settingsService.updateReceiptConfig(user, dto);
  }
}