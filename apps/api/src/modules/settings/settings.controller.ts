import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards,
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
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  get(@GetUser() user: AuthenticatedUser) {
    return this.settings.get(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings (partial)' })
  update(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(user, dto);
  }

  @Post('reset/:section')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a section to defaults' })
  reset(@GetUser() user: AuthenticatedUser, @Param('section') section: string) {
    return this.settings.resetSection(user, section);
  }

  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify manager PIN' })
  verifyPin(@GetUser() user: AuthenticatedUser, @Body() body: { pin: string }) {
    return this.settings.verifyPin(user, body.pin);
  }
}
