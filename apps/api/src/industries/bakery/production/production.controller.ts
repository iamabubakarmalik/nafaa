import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ProductionService } from './production.service';

@ApiTags('Bakery - Production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/production')
export class ProductionController {
  constructor(private readonly service: ProductionService) {}

  @Post('plans') createPlan(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createPlan(user, dto); }
  @Get('plans') listPlans(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.listPlans(user, { status, from, to });
  }
  @Get('today') today(@GetUser() user: AuthenticatedUser) { return this.service.today(user); }
  @Get('plans/:id') getPlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getPlan(user, id); }
  @Patch('plans/:id') updatePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updatePlan(user, id, dto); }
  @Post('plans/:id/start') startPlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.startPlan(user, id); }
  @Post('plans/:id/complete') completePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.completePlan(user, id); }

  @Patch('items/:itemId') updateItem(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string, @Body() dto: any) { return this.service.updateItem(user, itemId, dto); }
  @Post('items/:itemId/start-baking') startBaking(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string, @Body() body: { bakingTempC?: number; ovenNumber?: string }) {
    return this.service.startItemBaking(user, itemId, body.bakingTempC, body.ovenNumber);
  }
  @Post('items/:itemId/complete') completeItem(@GetUser() user: AuthenticatedUser, @Param('itemId') itemId: string, @Body() body: any) {
    return this.service.completeItem(user, itemId, body);
  }
}
