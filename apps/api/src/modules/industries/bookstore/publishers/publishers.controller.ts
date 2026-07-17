import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { PublishersService } from './publishers.service';
import { UpsertPublisherDto } from './dto/upsert-publisher.dto';

@ApiTags('Bookstore - Publishers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/publishers')
export class PublishersController {
  constructor(private readonly service: PublishersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertPublisherDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('active') active?: string, @Query('country') country?: string) {
    return this.service.list(user, { search, country, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Post('seed-pakistani') seed(@GetUser() user: AuthenticatedUser) { return this.service.seedPakistaniPublishers(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPublisherDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
