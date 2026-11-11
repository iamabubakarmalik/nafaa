import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminBroadcastService } from './admin-broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Broadcast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('communications')
@Controller('admin/broadcast')
export class AdminBroadcastController {
  constructor(private readonly service: AdminBroadcastService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('targetType') targetType?: string,
    @Query('paged') paged?: string,
  ) {
    return this.service.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
      search,
      targetType: targetType || undefined,
      paged: paged === '1' || paged === 'true',
    });
  }

  @Post('send')
  send(@GetUser() user: AuthenticatedUser, @Body() dto: CreateBroadcastDto) {
    return this.service.send(user.id, dto);
  }
}
