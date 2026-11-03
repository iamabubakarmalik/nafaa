import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminDeletionRequestsService } from './admin-deletion-requests.service';

class ProcessDeletionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Admin - Deletion requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/deletion-requests')
export class AdminDeletionRequestsController {
  constructor(private readonly service: AdminDeletionRequestsService) {}

  /** status: pending (in grace + due), in_grace, due, processed, cancelled, all */
  @Get()
  list(@Query('status') status?: string, @Query('kind') kind?: string) {
    return this.service.list({ status, kind });
  }

  /** :id is "user:<userId>" or "tenant:<tenantId>" */
  @Post(':id/process')
  process(@GetUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: ProcessDeletionDto) {
    return this.service.process(admin.id, id, dto?.note);
  }
}
