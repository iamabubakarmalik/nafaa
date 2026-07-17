import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { KarigarsService } from './karigars.service';

@ApiTags('Jewelry - Karigars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/karigars')
export class KarigarsController {
  constructor(private readonly service: KarigarsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      skillLevel: q.skillLevel, search: q.search,
      isActive: q.isActive === 'true' ? true : q.isActive === 'false' ? false : undefined,
      isInHouse: q.isInHouse === 'true' ? true : q.isInHouse === 'false' ? false : undefined,
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/issue-metal') issueMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { grams: number }) {
    return this.service.issueMetal(user, id, body.grams);
  }
  @Post(':id/receive-metal') receiveMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { receivedGrams: number; wastageGrams: number }) {
    return this.service.receiveMetal(user, id, body.receivedGrams, body.wastageGrams);
  }
  @Post(':id/record-order') recordOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { earnings: number }) {
    return this.service.recordOrder(user, id, body.earnings);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
