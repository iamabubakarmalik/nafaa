import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { SchoolListsService } from './school-lists.service';

/** Reading lists stays open: the counter reads active sets. Changing a list is catalog work. */
@ApiTags('Bookstore - School Lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/school-lists')
export class SchoolListsController {
  constructor(private readonly service: SchoolListsService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: unknown) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) { return this.service.list(user, query); }

  @Get('for-pos') forPos(@GetUser() user: AuthenticatedUser) { return this.service.forPos(user); }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  @Post(':id/status') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status?: string }) { return this.service.updateStatus(user, id, String(body?.status ?? '')); }

  @Post(':id/duplicate') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  duplicate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { newSession?: string }) { return this.service.duplicate(user, id, String(body?.newSession ?? '')); }

  /** Archives the list; nothing is erased. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
