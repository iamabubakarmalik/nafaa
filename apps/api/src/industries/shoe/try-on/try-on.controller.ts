import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeTryOnService } from './try-on.service';
import { CreateTryOnDto } from './dto/create-tryon.dto';

@ApiTags('Shoe - Try-On Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/try-on')
export class ShoeTryOnController {
  constructor(private readonly service: ShoeTryOnService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateTryOnDto) { return this.service.create(u, dto); }
  @Get() list(@GetUser() u: AuthenticatedUser, @Query('status') status?: string, @Query('search') search?: string) {
    return this.service.list(u, { status, search });
  }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Post(':id/complete') complete(
    @GetUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { purchased: boolean; purchasedSize?: string },
  ) {
    return this.service.complete(u, id, body.purchased, body.purchasedSize);
  }
  @Post(':id/cancel') cancel(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(u, id); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
