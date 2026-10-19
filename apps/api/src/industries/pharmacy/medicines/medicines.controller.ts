import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { MedicinesService } from './medicines.service';
import { UpsertMedicineDto } from './dto/upsert-medicine.dto';

/**
 * Medicine details on top of a product. Reading stays open (the counter,
 * receipts and lists need it); saving or removing details edits the product.
 */
@ApiTags('Pharmacy - Medicines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/medicines')
export class MedicinesController {
  constructor(private readonly service: MedicinesService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMedicineDto) { return this.service.upsert(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query('scheduleClass') scheduleClass?: string, @Query('requiresColdChain') requiresColdChain?: string, @Query('requiresPrescription') requiresPrescription?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      scheduleClass,
      requiresColdChain: requiresColdChain === 'true' ? true : requiresColdChain === 'false' ? false : undefined,
      requiresPrescription: requiresPrescription === 'true' ? true : requiresPrescription === 'false' ? false : undefined,
      search,
    });
  }

  @Get('lookup') lookup(@GetUser() user: AuthenticatedUser) { return this.service.lookup(user); }

  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.byProductId(user, productId);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
