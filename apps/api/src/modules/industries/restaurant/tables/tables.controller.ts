import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';

@ApiTags('Industry: Restaurant - Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('industries/restaurant/tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) {
    return this.service.list(user, shopId);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTableDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTableDto>,
  ) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: TableStatus; saleId?: string },
  ) {
    return this.service.updateStatus(user, id, body.status, body.saleId);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
