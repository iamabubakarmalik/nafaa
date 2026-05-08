import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminBroadcastService } from './admin-broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';

@ApiTags('Admin - Broadcast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/broadcast')
export class AdminBroadcastController {
  constructor(private readonly service: AdminBroadcastService) {}

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Post('send')
  send(@GetUser() user: AuthenticatedUser, @Body() dto: CreateBroadcastDto) {
    return this.service.send(user.id, dto);
  }
}
