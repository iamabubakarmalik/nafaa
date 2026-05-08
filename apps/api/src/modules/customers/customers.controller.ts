import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(user, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query() query: QueryCustomersDto,
  ) {
    return this.customersService.findAll(user, query);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(user, id);
  }
}
