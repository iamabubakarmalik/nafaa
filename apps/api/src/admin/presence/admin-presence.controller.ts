import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminPresenceService } from './admin-presence.service';

@ApiTags('Admin - Live')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('users')
@Controller('admin/presence')
export class AdminPresenceController {
  constructor(private readonly service: AdminPresenceService) {}

  @Get('live')
  live() {
    return this.service.live();
  }
}
