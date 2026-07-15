import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { SizeChartsService } from './size-charts.service';
import { UpsertSizeChartDto } from './dto/upsert-size-chart.dto';

@ApiTags('Garments - Size Charts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/size-charts')
export class SizeChartsController {
  constructor(private readonly service: SizeChartsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertSizeChartDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('categoryType') categoryType?: string, @Query('gender') gender?: string, @Query('active') active?: string) {
    return this.service.list(user, { categoryType, gender, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertSizeChartDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
