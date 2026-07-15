import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MenuItemsService } from './menu-items.service';
import { UpsertMenuItemDto } from './dto/upsert-menu-item.dto';

@ApiTags('Restaurant - Menu Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/menu-items')
export class MenuItemsController {
  constructor(private readonly service: MenuItemsService) {}

  @Post()
  upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMenuItemDto) {
    return this.service.upsert(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('available') available?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('chefSpecial') chefSpecial?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      available: available === 'true' ? true : available === 'false' ? false : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      chefSpecial: chefSpecial === 'true' ? true : undefined,
      search,
    });
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/modifiers')
  attach(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { modifierGroupIds: string[] }) {
    return this.service.attachModifiers(user, id, body.modifierGroupIds);
  }

  @Post(':id/toggle-available')
  toggleAvailable(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleAvailable(user, id); }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
