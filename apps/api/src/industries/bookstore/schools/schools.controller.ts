import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { SchoolsService } from './schools.service';

/** Schools are customer records: reading needs customers.view, changes need customers.edit. */
@ApiTags('Bookstore - Schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/schools')
export class SchoolsController {
  constructor(private readonly service: SchoolsService) {}

  @Post() @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: unknown) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.service.list(user, { ...query, active: query.active === 'true' ? true : query.active === 'false' ? false : undefined });
  }

  @Get(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  /** Opens or finds the school's khata (a customer of the same name). */
  @Post(':id/khata') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  openKhata(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.openKhata(user, id); }

  /** Switches the school off; nothing is erased. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
