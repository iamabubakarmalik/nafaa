import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CashRegisterService } from './cash-register.service';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CashTransactionDto } from './dto/cash-transaction.dto';

@ApiTags('Cash Register')
@ApiBearerAuth()
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly service: CashRegisterService) {}

  @Get('current')
  current(@GetUser() user: AuthenticatedUser) {
    return this.service.getCurrent(user);
  }

  @Post('open')
  open(@GetUser() user: AuthenticatedUser, @Body() dto: OpenRegisterDto) {
    return this.service.open(user, dto);
  }

  @Post('transaction')
  transaction(@GetUser() user: AuthenticatedUser, @Body() dto: CashTransactionDto) {
    return this.service.addTransaction(user, dto);
  }

  @Post('close')
  close(@GetUser() user: AuthenticatedUser, @Body() dto: CloseRegisterDto) {
    return this.service.close(user, dto);
  }

  @Get('history')
  history(@GetUser() user: AuthenticatedUser) {
    return this.service.history(user);
  }
}
