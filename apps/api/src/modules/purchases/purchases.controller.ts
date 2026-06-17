import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser) {
    return this.purchasesService.findAll(user);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.purchasesService.summary(user);
  }

  @Get(':id')
  findOne(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(user, id);
  }
}
