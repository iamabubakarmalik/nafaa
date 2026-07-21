import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { FreshnessService } from './freshness.service';

@ApiTags('Bakery - Freshness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/freshness')
export class FreshnessController {
  constructor(private readonly service: FreshnessService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('productId') productId?: string) { return this.service.list(user, { status, productId }); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Post('run-expiry-check') runCheck(@GetUser() user: AuthenticatedUser) { return this.service.runExpiryCheck(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/sale') sale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { qty: number }) { return this.service.recordSale(user, id, body.qty); }
  @Post(':id/discard') discard(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { qty: number; reason: string }) { return this.service.discard(user, id, body.qty, body.reason); }
  @Post(':id/discount') discount(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { qty: number }) { return this.service.discount(user, id, body.qty); }
}
