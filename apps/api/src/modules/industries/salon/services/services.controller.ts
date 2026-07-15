import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ServicesService } from './services.service';
import { UpsertServiceDto } from './dto/upsert-service.dto';

@ApiTags('Salon - Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertServiceDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('forGender') forGender?: string, @Query('search') search?: string, @Query('featured') featured?: string, @Query('popular') popular?: string) {
    return this.service.list(user, {
      category, forGender, search,
      featured: featured === 'true' ? true : undefined,
      popular: popular === 'true' ? true : undefined,
    });
  }
  @Get('by-category') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertServiceDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
