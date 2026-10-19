import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateEquipmentDto, MaintenanceDto, UpdateEquipmentDto } from './dto/equipment.dto';
import { EquipmentService } from './equipment.service';

const P = PERMISSIONS;

/** Machines are the gym's assets: reading and changing them follow products.view / products.edit. */
@ApiTags('Gym - Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Post() @RequirePermissions(P.PRODUCTS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateEquipmentDto) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(P.PRODUCTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('status') status?: string, @Query('search') search?: string) {
    return this.service.list(user, { category, status, search });
  }

  @Get('summary') @RequirePermissions(P.PRODUCTS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @Get(':id') @RequirePermissions(P.PRODUCTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) { return this.service.update(user, id, dto); }

  @Post(':id/maintenance') @RequirePermissions(P.PRODUCTS_EDIT)
  maintenance(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: MaintenanceDto) {
    return this.service.recordMaintenance(user, shop, id, dto);
  }

  /** Marks the machine as retired; nothing is deleted. */
  @Delete(':id') @RequirePermissions(P.PRODUCTS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
