import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { LiveAnimalsService } from './live-animals.service';
import { AddMedicalRecordDto, SellAnimalDto, UpdateAnimalStatusDto, UpsertLiveAnimalDto } from './dto/upsert-live-animal.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Pet Shop - Live Animals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('petshop/live-animals')
export class LiveAnimalsController {
  constructor(private readonly service: LiveAnimalsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertLiveAnimalDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('species') species?: string,
    @Query('status') status?: string,
    @Query('breed') breed?: string,
    @Query('featured') featured?: string,
    @Query('vaccinated') vaccinated?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      species, status, breed, search,
      featured: bool(featured), vaccinated: bool(vaccinated),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('long-stay') longStay(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.longStay(user, days ? Number(days) : 60);
  }
  @Get('health-alerts') health(@GetUser() user: AuthenticatedUser) { return this.service.healthAlerts(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertLiveAnimalDto) { return this.service.update(user, id, dto); }
  @Post(':id/reserve') reserve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { customerName?: string }) {
    return this.service.reserve(user, id, body?.customerName);
  }
  @Post(':id/unreserve') unreserve(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.unreserve(user, id); }
  @Post(':id/sell') sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SellAnimalDto) { return this.service.sell(user, id, dto); }
  @Post(':id/medical-record') medical(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddMedicalRecordDto) {
    return this.service.addMedicalRecord(user, id, dto);
  }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAnimalStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
