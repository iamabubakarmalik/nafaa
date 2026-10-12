import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ShopIdParam } from '../../../common/shop-scope';
import { QuickKeysService } from './quick-keys.service';
import { ReorderQuickKeysDto, UpdateQuickKeyDto, UpsertQuickKeyDto } from './dto/upsert-quick-key.dto';

/**
 * POS quick keys for every industry (path kept under `retail/` for existing
 * callers). Reading is open so every counter can load them; changing the
 * shared POS grid needs products.edit.
 */
@ApiTags('POS Quick Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/quick-keys')
export class QuickKeysController {
  constructor(private readonly service: QuickKeysService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string, @Query('manage') manage?: string) {
    return this.service.list(user, shopId, manage === '1' || manage === 'true');
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertQuickKeyDto) {
    return this.service.create(user, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post('reorder')
  reorder(@GetUser() user: AuthenticatedUser, @Body() dto: ReorderQuickKeysDto) {
    return this.service.reorder(user, dto.items);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateQuickKeyDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
