import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeSizeChartsService } from './size-charts.service';
import { CreateSizeChartDto, UpdateSizeChartDto } from './dto/create-chart.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Shoe - Size Charts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
@Controller('shoe/size-charts')
export class ShoeSizeChartsController {
  constructor(private readonly service: ShoeSizeChartsService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateSizeChartDto) { return this.service.create(u, dto); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('brandId') brandId?: string,
    @Query('gender') gender?: string,
    @Query('categoryType') categoryType?: string,
    @Query('active') active?: string,
  ) {
    return this.service.list(u, {
      brandId, gender, categoryType,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSizeChartDto) { return this.service.update(u, id, dto); }
  /** Switches the chart off; charts are not deleted. */
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
