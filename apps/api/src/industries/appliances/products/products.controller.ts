import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceProductsService } from './products.service';
import { UpsertApplianceProductDto } from './dto/upsert-product.dto';

@ApiTags('Appliances - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/products')
export class ApplianceProductsController {
  constructor(private readonly service: ApplianceProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertApplianceProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('brandId') brandId?: string, @Query('categoryType') categoryType?: string, @Query('energyRating') energyRating?: string, @Query('requiresInstallation') req?: string, @Query('featured') featured?: string, @Query('bestSeller') bestSeller?: string, @Query('newArrival') newArrival?: string, @Query('isInverter') isInverter?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      brandId, categoryType, energyRating, search,
      requiresInstallation: req === 'true' ? true : req === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      isInverter: isInverter === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
