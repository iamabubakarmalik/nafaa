import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

@ApiTags('Stock Adjustments')
@ApiBearerAuth()
@Controller('stock-adjustments')
export class StockAdjustmentsController {
  constructor(private readonly service: StockAdjustmentsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.service.create(user, dto);
  }
}
