import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreditTransactionsService } from './credit-transactions.service';
import { CreateCreditTransactionDto } from './dto/create-transaction.dto';

@ApiTags('Hardware - Credit Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/credit-transactions')
export class CreditTransactionsController {
  constructor(private readonly service: CreditTransactionsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCreditTransactionDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('accountId') accountId?: string, @Query('type') type?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { accountId, type, from, to, search });
  }
  @Get('statement/:accountId') statement(@GetUser() user: AuthenticatedUser, @Param('accountId') accountId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.statement(user, accountId, from, to);
  }
  @Post(':id/reverse') reverse(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.removeReversal(user, id, body.reason);
  }
}
