import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminImpersonateService } from './admin-impersonate.service';

@ApiTags('Admin - Impersonate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/impersonate')
export class AdminImpersonateController {
  constructor(private readonly service: AdminImpersonateService) {}

  @Post(':tenantId')
  impersonate(
    @GetUser() user: AuthenticatedUser,
    @Param('tenantId') tenantId: string,
  ) {
    return this.service.impersonate(user.id, tenantId);
  }
}
