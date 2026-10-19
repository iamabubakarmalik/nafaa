import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantOrderMode } from '@prisma/client';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { HappyHoursService } from './happy-hours.service';
import { UpsertHappyHourDto } from './dto/upsert-happy-hour.dto';

const MODES = Object.values(RestaurantOrderMode) as string[];
const modeOf = (m?: string) => {
  if (!m) return undefined;
  if (!MODES.includes(m)) throw new BadRequestException('Order ka tareeqa sahi nahi');
  return m as RestaurantOrderMode;
};

@ApiTags('Restaurant - Happy Hours')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/happy-hours')
export class HappyHoursController {
  constructor(private readonly service: HappyHoursService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertHappyHourDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string) { return this.service.list(user, active === 'true'); }
  @Get('active-now') activeNow(@GetUser() user: AuthenticatedUser, @Query('mode') mode?: string) { return this.service.findActiveNow(user, modeOf(mode)); }
  /**
   * Happy-hour discount for a cart right now: `items=productId:qty,…` at
   * menu prices, optionally for one order mode.
   */
  @Get('quote') quote(@GetUser() user: AuthenticatedUser, @Query('items') items?: string, @Query('mode') mode?: string) {
    const list = (items ?? '').split(',').filter(Boolean).slice(0, 200).map((x) => {
      const [productId, qty] = x.split(':');
      return { productId: productId.trim(), quantity: Math.max(Number(qty) || 1, 0) };
    }).filter((i) => i.productId && i.quantity > 0);
    return this.service.quote(user, list, modeOf(mode));
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertHappyHourDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggle(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
