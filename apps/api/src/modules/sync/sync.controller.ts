import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { SyncPullQueryDto } from './dto/sync-pull.dto';
import { SyncService } from './sync.service';

@ApiTags('Sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** Offline download for the apps: a manifest, then paged entities in updatedAt order. */
  @Get('pull')
  // A first download of a large catalog is many pages in a row (the default limit is 60 a minute).
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @ApiOperation({ summary: 'Offline sync: manifest or one page of products, stock, customers, sales or live ids' })
  pull(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: SyncPullQueryDto) {
    return this.sync.pull(user, shop, q);
  }
}
