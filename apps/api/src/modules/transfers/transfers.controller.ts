import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransfersService } from './transfers.service';

@ApiTags('Stock Transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTransferDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id/receive')
  receive(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.receive(user, id);
  }

  @Patch(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(user, id);
  }
}
