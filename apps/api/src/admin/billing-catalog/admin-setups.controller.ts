import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminSetupsService } from './admin-setups.service';

/** Setup and activation services shops bought, for the team to deliver. */
@ApiTags('Admin - Setup requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('tenants')
@Controller('admin/setups')
export class AdminSetupsController {
  constructor(private readonly setups: AdminSetupsService) {}

  @Get()
  list(@Query() q: { status?: string; page?: string; limit?: string }) {
    return this.setups.list(q);
  }

  @Post(':id/done')
  done(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.setups.markDone(id, user.email, typeof body?.note === 'string' ? body.note : undefined);
  }
}
