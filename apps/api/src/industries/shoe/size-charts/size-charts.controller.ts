import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeSizeChartsService } from './size-charts.service';
import { CreateSizeChartDto } from './dto/create-chart.dto';

@ApiTags('Shoe - Size Charts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/size-charts')
export class ShoeSizeChartsController {
  constructor(private readonly service: ShoeSizeChartsService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateSizeChartDto) { return this.service.create(u, dto); }
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
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<CreateSizeChartDto>) { return this.service.update(u, id, dto); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
