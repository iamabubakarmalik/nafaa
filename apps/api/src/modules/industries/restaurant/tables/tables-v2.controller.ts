import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { TablesV2Service } from './tables-v2.service';
import { ReserveTableDto, UpsertTableDto } from './dto/upsert-table.dto';

@ApiTags('Restaurant - Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/tables')
export class TablesV2Controller {
  constructor(private readonly service: TablesV2Service) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertTableDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('section') section?: string, @Query('shopId') shopId?: string) {
    return this.service.list(user, { status, section, shopId });
  }
  @Get('layout') layout(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) { return this.service.layout(user, shopId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertTableDto) { return this.service.update(user, id, dto); }
  @Post(':id/status') changeStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.changeStatus(user, id, body.status); }
  @Post(':id/reserve') reserve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReserveTableDto) { return this.service.reserve(user, id, dto); }
  @Post(':id/cancel-reservation') cancelReservation(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancelReservation(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
