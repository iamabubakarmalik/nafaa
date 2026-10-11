/**
 *   GET /preferences/:key   the signed-in user's preference (null when unset)
 *   PUT /preferences/:key   save it
 */

import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PreferencesService } from './preferences.service';

@ApiTags('Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly svc: PreferencesService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Get my preference' })
  get(@GetUser() user: AuthenticatedUser, @Param('key') key: string) {
    return this.svc.get(user.id, key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Save my preference' })
  save(@GetUser() user: AuthenticatedUser, @Param('key') key: string, @Body() body: Record<string, unknown>) {
    return this.svc.save(user.id, key, body);
  }
}
