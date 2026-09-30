import { Body, Controller, Get, Module, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { TaxAuthorityService } from './tax-authority.service';

@ApiTags('Tax authority (PRA / SRB / KPRA)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-authority')
export class TaxAuthorityController {
  constructor(private readonly svc: TaxAuthorityService) {}

  @Get()
  overview(@GetUser() user: AuthenticatedUser) {
    return this.svc.overview(user);
  }

  @Get('pos')
  @ApiOperation({ summary: 'POS ke liye: on hai ya nahi' })
  pos(@GetUser() user: AuthenticatedUser) {
    return this.svc.posStatus(user.tenantId);
  }

  @Put()
  save(@GetUser() user: AuthenticatedUser, @Body() body: any) {
    return this.svc.save(user, body ?? {});
  }

  @Post('test')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  test(@GetUser() user: AuthenticatedUser) {
    return this.svc.test(user);
  }

  @Post('sales/:saleId/submit')
  @ApiOperation({ summary: 'Sale authority ko (bill chhapne se pehle) — dobara bulane par wahi number' })
  submit(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.svc.submitSale(user.tenantId, saleId);
  }

  @Get('sales/:saleId')
  status(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.svc.saleStatus(user.tenantId, saleId);
  }
}

@Module({ imports: [PrismaModule], controllers: [TaxAuthorityController], providers: [TaxAuthorityService] })
export class TaxAuthorityModule {}
