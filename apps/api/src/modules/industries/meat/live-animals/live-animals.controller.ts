import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { LiveAnimalsService } from './live-animals.service';

@ApiTags('Meat - Live Animals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/live-animals')
export class LiveAnimalsController {
  constructor(private readonly service: LiveAnimalsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('animalType') animalType?: string, @Query('isSlaughtered') isSlaughtered?: string, @Query('isSold') isSold?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      animalType, search,
      isSlaughtered: isSlaughtered === 'true' ? true : isSlaughtered === 'false' ? false : undefined,
      isSold: isSold === 'true' ? true : isSold === 'false' ? false : undefined,
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/feed-cost') addFeed(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { days: number; costPerDay: number }) {
    return this.service.addFeedCost(user, id, body.days, body.costPerDay);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
