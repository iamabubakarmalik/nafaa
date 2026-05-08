import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountsService } from './discounts.service';

@ApiTags('Discount Codes')
@ApiBearerAuth()
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly service: DiscountsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateDiscountDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id/toggle')
  toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.toggle(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Get('validate')
  validate(
    @GetUser() user: AuthenticatedUser,
    @Query('code') code: string,
    @Query('amount') amount: string,
  ) {
    return this.service.validate(user, code, Number(amount || 0));
  }
}
