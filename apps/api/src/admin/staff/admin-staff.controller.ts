import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea, AdminPermission } from '../access/admin-access.decorators';
import { AdminStaffService } from './admin-staff.service';

@ApiTags('Admin - Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('staff')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly service: AdminStaffService) {}

  @Get('catalog')
  catalog() {
    return this.service.catalog();
  }

  @Get('roles')
  roles() {
    return this.service.roles();
  }

  @Post('roles')
  createRole(@Body() dto: { name: string; description?: string; permissions: string[] }) {
    return this.service.createRole(dto);
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: { name?: string; description?: string; permissions?: string[] }) {
    return this.service.updateRole(id, dto);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.service.deleteRole(id);
  }

  @Get('members')
  members() {
    return this.service.members();
  }

  @Post('members')
  invite(@Body() dto: { email: string; fullName: string; roleId: string; extraPermissions?: string[] }, @GetUser() user: AuthenticatedUser) {
    return this.service.invite(dto, user.id);
  }

  @Post('members/:id/resend-invite')
  resendInvite(@Param('id') id: string) {
    return this.service.resendInvite(id);
  }

  @Patch('members/:id')
  updateMember(@Param('id') id: string, @Body() dto: { roleId?: string; extraPermissions?: string[]; status?: 'ACTIVE' | 'DISABLED' }, @GetUser() user: AuthenticatedUser) {
    return this.service.updateMember(id, dto, user.id);
  }

  @Delete('members/:id')
  removeMember(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.service.removeMember(id, user.id);
  }

  /** Sessions of any admin user (super admins included), by user id. */
  @Get('users/:userId/sessions')
  sessions(@Param('userId') userId: string) {
    return this.service.sessions(userId);
  }

  @Delete('users/:userId/sessions/:sessionId')
  endSession(@Param('userId') userId: string, @Param('sessionId') sessionId: string) {
    return this.service.endSession(userId, sessionId);
  }

  @Post('users/:userId/sessions/end-all')
  endAllSessions(@Param('userId') userId: string) {
    return this.service.endAllSessions(userId);
  }

  @Get('audit')
  @AdminPermission('audit.view')
  audit(
    @Query('actorId') actorId?: string,
    @Query('search') search?: string,
    @Query('method') method?: string,
    @Query('failed') failed?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const date = (v?: string) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v) : undefined);
    return this.service.audit({
      actorId: actorId || undefined,
      search: search?.trim() || undefined,
      method: method && ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'].includes(method) ? method : undefined,
      failed: failed === '1' || failed === 'true',
      from: date(from),
      to: date(to),
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
}
