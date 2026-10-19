import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ModifiersService } from './modifiers.service';
import { AssignDishesDto, UpsertModifierGroupDto } from './dto/upsert-modifier-group.dto';

@ApiTags('Restaurant - Modifiers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/modifiers')
export class ModifiersController {
  constructor(private readonly service: ModifiersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertModifierGroupDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser) { return this.service.list(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertModifierGroupDto) { return this.service.update(user, id, dto); }
  /** Puts this group on exactly these dishes. */
  @Post(':id/dishes') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignDishesDto) { return this.service.assignDishes(user, id, dto.menuItemIds); }
  @Post(':id/toggle') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleActive(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
