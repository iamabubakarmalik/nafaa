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
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminNotesService } from './admin-notes.service';
import { UpsertNoteDto } from './dto/upsert-note.dto';

@ApiTags('Admin - Tenant Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/notes')
export class AdminNotesController {
  constructor(private readonly service: AdminNotesService) {}

  @Get('tenant/:tenantId')
  list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertNoteDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertNoteDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
