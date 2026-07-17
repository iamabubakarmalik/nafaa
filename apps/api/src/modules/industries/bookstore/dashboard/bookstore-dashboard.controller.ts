import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { BookstoreDashboardService } from './bookstore-dashboard.service';

@ApiTags('Bookstore - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/dashboard')
export class BookstoreDashboardController {
  constructor(private readonly service: BookstoreDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}
