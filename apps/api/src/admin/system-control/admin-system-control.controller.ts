import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { SystemControlService } from '../../core/system-control/system-control.service';
import { AdminSystemErrorsService } from './admin-system-errors.service';

const bool = (v: unknown, field: string): boolean => {
  if (typeof v !== 'boolean') throw new BadRequestException(`${field} must be true or false`);
  return v;
};

/** Platform switches, background jobs and the server error log. */
@ApiTags('Admin - System controls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('system')
@Controller('admin/system')
export class AdminSystemControlController {
  constructor(
    private readonly controls: SystemControlService,
    private readonly errors: AdminSystemErrorsService,
  ) {}

  @Get('controls')
  async getControls() {
    await this.controls.refresh();
    return this.controls.controls;
  }

  @Patch('maintenance')
  maintenance(@GetUser() user: AuthenticatedUser, @Body() body: { on?: unknown; message?: unknown; until?: unknown }) {
    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : null;
    const until = typeof body.until === 'string' && body.until && !Number.isNaN(Date.parse(body.until)) ? new Date(body.until).toISOString() : null;
    return this.controls.setMaintenance(user.id, { on: bool(body.on, 'on'), message, until });
  }

  @Patch('signups')
  signups(@GetUser() user: AuthenticatedUser, @Body() body: { open?: unknown }) {
    return this.controls.setSignups(user.id, bool(body.open, 'open'));
  }

  @Patch('ai')
  ai(@GetUser() user: AuthenticatedUser, @Body() body: { enabled?: unknown }) {
    return this.controls.setAi(user.id, bool(body.enabled, 'enabled'));
  }

  @Get('jobs')
  async jobs() {
    await this.controls.refresh();
    return this.controls.jobs();
  }

  @Patch('jobs/:key')
  async pauseJob(@GetUser() user: AuthenticatedUser, @Param('key') key: string, @Body() body: { paused?: unknown }) {
    if (!this.controls.jobs().some((j) => j.key === key)) throw new NotFoundException('Job not found');
    await this.controls.setJobPaused(user.id, key, bool(body.paused, 'paused'));
    return this.controls.jobs().find((j) => j.key === key);
  }

  @Post('jobs/:key/run')
  runJob(@Param('key') key: string) {
    const r = this.controls.runNow(key);
    if (!r.started) throw new BadRequestException(r.reason);
    return r;
  }

  @Get('errors')
  listErrors(@Query() q: { status?: string; source?: string; search?: string; sort?: string; page?: string; limit?: string }) {
    return this.errors.list(q);
  }

  @Get('errors/:id')
  getError(@Param('id') id: string) {
    return this.errors.get(id);
  }

  @Post('errors/resolve-all')
  resolveAll(@GetUser() user: AuthenticatedUser) {
    return this.errors.resolveAll(user.id);
  }

  @Post('errors/:id/resolve')
  resolve(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.errors.setResolved(id, user.id, true);
  }

  @Post('errors/:id/reopen')
  reopen(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.errors.setResolved(id, user.id, false);
  }
}
