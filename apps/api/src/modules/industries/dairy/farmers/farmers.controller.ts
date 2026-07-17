import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { FarmersService } from './farmers.service';
import { UpsertFarmerDto } from './dto/upsert-farmer.dto';

@ApiTags('Dairy - Farmers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/farmers')
export class FarmersController {
  constructor(private readonly service: FarmersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertFarmerDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('village') village?: string, @Query('active') active?: string) {
    return this.service.list(user, {
      search, village,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertFarmerDto) { return this.service.update(user, id, dto); }
  @Post(':id/payments') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.recordPayment(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
