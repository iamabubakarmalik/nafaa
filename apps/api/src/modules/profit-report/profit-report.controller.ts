import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ProfitReportService } from './profit-report.service';

@ApiTags('Profit Report')
@ApiBearerAuth()
@Controller('profit-report')
export class ProfitReportController {
  constructor(private readonly service: ProfitReportService) {}

  @Get('by-product')
  byProduct(@GetUser() user: AuthenticatedUser) {
    return this.service.byProduct(user);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }
}
