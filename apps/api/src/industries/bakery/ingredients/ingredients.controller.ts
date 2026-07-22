import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { IngredientsService } from './ingredients.service';

@ApiTags('Bakery - Ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/ingredients')
export class IngredientsController {
  constructor(private readonly service: IngredientsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('lowStock') lowStock?: string, @Query('critical') critical?: string, @Query('search') search?: string, @Query('active') active?: string) {
    return this.service.list(user, {
      category, search,
      lowStock: lowStock === 'true' ? true : undefined,
      critical: critical === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : true,
    });
  }
  @Get('low-stock') lowStock(@GetUser() user: AuthenticatedUser) { return this.service.lowStockAlert(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/transactions') transactions(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.transactions(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }

  @Post(':id/purchase') purchase(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) { return this.service.recordPurchase(user, id, body); }
  @Post(':id/consume') consume(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) { return this.service.recordConsumption(user, id, body); }
  @Post(':id/waste') waste(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) { return this.service.recordWaste(user, id, body); }
  @Post(':id/adjust') adjust(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) { return this.service.adjustStock(user, id, body); }
}
