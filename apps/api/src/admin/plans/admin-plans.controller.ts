import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminPlansService } from './admin-plans.service';
import { UpsertPlanDto } from './dto/upsert-plan.dto';
import { AdminArea } from '../access/admin-access.decorators';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

@ApiTags('Admin - Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('plans')
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly service: AdminPlansService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertPlanDto) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPlanDto) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
