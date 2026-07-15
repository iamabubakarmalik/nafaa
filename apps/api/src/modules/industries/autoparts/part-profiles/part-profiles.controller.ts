import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { PartProfilesService } from './part-profiles.service';
import { UpsertPartProfileDto } from './dto/upsert-part-profile.dto';

@ApiTags('Auto Parts - Part Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/part-profiles')
export class PartProfilesController {
  constructor(private readonly service: PartProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertPartProfileDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('condition') condition?: string, @Query('brand') brand?: string, @Query('fastMoving') fastMoving?: string, @Query('critical') critical?: string, @Query('search') search?: string, @Query('makeId') makeId?: string, @Query('modelId') modelId?: string) {
    return this.service.list(user, {
      category, condition, brand, search, makeId, modelId,
      fastMoving: fastMoving === 'true' ? true : undefined,
      critical: critical === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get('by-part-number/:partNumber') byPartNumber(@GetUser() user: AuthenticatedUser, @Param('partNumber') partNumber: string) { return this.service.findByPartNumber(user, partNumber); }
  @Get('compatible/:makeId/:modelId') compatible(@GetUser() user: AuthenticatedUser, @Param('makeId') makeId: string, @Param('modelId') modelId: string, @Query('year') year?: string) {
    return this.service.findCompatible(user, makeId, modelId, year ? parseInt(year) : undefined);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
