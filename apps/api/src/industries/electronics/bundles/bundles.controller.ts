import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BundlesService } from './bundles.service';
import { UpsertBundleDto } from './dto/upsert-bundle.dto';

@ApiTags('Electronics - Bundles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/bundles')
export class BundlesController {
  constructor(private readonly service: BundlesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBundleDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('featured') featured?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
      search,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertBundleDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
