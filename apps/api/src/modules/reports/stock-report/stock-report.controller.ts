import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { StockReportService } from './stock-report.service';

@ApiTags('Stock Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports/stock')
export class StockReportController {
  constructor(private readonly service: StockReportService) {}

  @Get()
  generate(
    @GetUser() user: AuthenticatedUser,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('stockStatus') stockStatus?: 'all' | 'in' | 'low' | 'out',
    @Query('isActive') isActive?: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.generate(user, {
      categoryId,
      brandId,
      stockStatus,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      shopId,
    });
  }

  @Get(':productId/detail')
  getProductDetail(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.service.getProductDetail(user, productId);
  }

}
