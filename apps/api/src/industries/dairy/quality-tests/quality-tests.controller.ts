import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { QualityTestsService } from './quality-tests.service';

@ApiTags('Dairy - Quality Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/quality-tests')
export class QualityTestsController {
  constructor(private readonly service: QualityTestsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('sourceType') sourceType?: string, @Query('sourceId') sourceId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('failed') failed?: string) {
    return this.service.list(user, { sourceType, sourceId, from, to, failed: failed === 'true' });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
}
