import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { QuotesService } from './quotes.service';

@ApiTags('Service Business - Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/send') send(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.send(user, id); }
  @Post(':id/accept') accept(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.accept(user, id); }
  @Post(':id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.reject(user, id, body.reason); }
  @Post(':id/convert') convert(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.convertToJob(user, id); }
}
