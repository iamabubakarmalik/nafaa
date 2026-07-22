import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MetalStockService } from './metal-stock.service';

@ApiTags('Jewelry - Metal Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/metal-stock')
export class MetalStockController {
  constructor(private readonly service: MetalStockService) {}

  @Post() addEntry(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.addEntry(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      metalType: q.metalType, purity: q.purity, entryType: q.entryType,
      from: q.from, to: q.to, limit: q.limit ? Number(q.limit) : undefined,
    });
  }
  @Get('balance') balance(@GetUser() user: AuthenticatedUser) { return this.service.currentBalance(user); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, from, to);
  }
}
