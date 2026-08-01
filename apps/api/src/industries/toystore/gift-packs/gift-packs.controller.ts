import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GiftPacksService } from './gift-packs.service';
import { UpsertGiftPackDto } from './dto/upsert-gift-pack.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Toy Store - Gift Packs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toystore/gift-packs')
export class GiftPacksController {
  constructor(private readonly service: GiftPacksService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertGiftPackDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('active') active?: string,
    @Query('featured') featured?: string,
    @Query('seasonal') seasonal?: string,
    @Query('ageGroup') ageGroup?: string,
    @Query('gender') gender?: string,
    @Query('occasion') occasion?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      ageGroup, gender, occasion, search,
      active: bool(active), featured: bool(featured), seasonal: bool(seasonal),
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertGiftPackDto) { return this.service.update(user, id, dto); }
  @Post(':id/duplicate') duplicate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.duplicate(user, id); }
  @Post(':id/record-sale') sale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { quantity?: number }) {
    return this.service.recordSale(user, id, body?.quantity ?? 1);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
