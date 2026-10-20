import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ReadingListsService } from './reading-lists.service';

/** Reading lists are customer records. */
@ApiTags('Bookstore - Reading Lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/reading-lists')
export class ReadingListsController {
  constructor(private readonly service: ReadingListsService) {}

  @Post() @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get('by-customer/:customerId') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.listByCustomer(user, customerId); }
  @Post(':listId/items') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) addItem(@GetUser() user: AuthenticatedUser, @Param('listId') listId: string, @Body() dto: any) { return this.service.addItem(user, listId, dto); }
  @Delete(':listId/items/:itemId') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) removeItem(@GetUser() user: AuthenticatedUser, @Param('listId') listId: string, @Param('itemId') itemId: string) { return this.service.removeItem(user, listId, itemId); }
  @Post('items/:itemId/mark-read') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) markRead(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string) { return this.service.markAsRead(user, itemId); }
}
