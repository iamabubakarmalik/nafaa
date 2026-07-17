import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ReadingListsService } from './reading-lists.service';

@ApiTags('Bookstore - Reading Lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/reading-lists')
export class ReadingListsController {
  constructor(private readonly service: ReadingListsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.listByCustomer(user, customerId); }
  @Post(':listId/items') addItem(@GetUser() user: AuthenticatedUser, @Param('listId') listId: string, @Body() dto: any) { return this.service.addItem(user, listId, dto); }
  @Delete(':listId/items/:itemId') removeItem(@GetUser() user: AuthenticatedUser, @Param('listId') listId: string, @Param('itemId') itemId: string) { return this.service.removeItem(user, listId, itemId); }
  @Post('items/:itemId/mark-read') markRead(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string) { return this.service.markAsRead(user, itemId); }
}
