import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RecipesService } from './recipes.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';

@ApiTags('Restaurant - Recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRecipeDto) { return this.service.upsert(user, dto); }
  @Get('by-menu-item/:menuItemId') getByMenu(@GetUser() user: AuthenticatedUser, @Param('menuItemId') menuItemId: string) { return this.service.getByMenuItem(user, menuItemId); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
