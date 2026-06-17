import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopsService } from './shops.service';

@ApiTags('Shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.list(user);
  }

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.overview(user);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.shopsService.update(user, id, dto);
  }

  @Patch(':id/toggle')
  toggleActive(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.toggleActive(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.remove(user, id);
  }
}
