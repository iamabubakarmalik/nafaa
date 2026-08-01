import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { WeddingContractsService } from './wedding-contracts.service';
import { CreateWeddingContractDto, RecordWeddingPaymentDto, UpdateContractStatusDto } from './dto/create-contract.dto';

@ApiTags('Florist - Wedding Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('florist/wedding-contracts')
export class WeddingContractsController {
  constructor(private readonly service: WeddingContractsService) {}

  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateWeddingContractDto) { return this.service.create(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('search') search?: string,
  ) { return this.service.list(u, { status, upcoming: upcoming === 'true', search }); }
  @Get('upcoming') upcoming(@GetUser() u: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.upcomingWeddings(u, days ? Number(days) : 30);
  }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<CreateWeddingContractDto>) { return this.service.update(u, id, dto); }
  @Patch(':id/status') status(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateContractStatusDto) { return this.service.updateStatus(u, id, dto); }
  @Post(':id/payment') payment(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordWeddingPaymentDto) { return this.service.recordPayment(u, id, dto); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
