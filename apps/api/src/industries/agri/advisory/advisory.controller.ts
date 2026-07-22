import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AdvisoryService } from './advisory.service';

@ApiTags('Agri - Crop Advisory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/advisory')
export class AdvisoryController {
  constructor(private readonly service: AdvisoryService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      farmerId: q.farmerId, cropName: q.cropName, season: q.season,
      completed: q.completed === 'true' ? true : q.completed === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markComplete(user, id); }
}
