import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { QualityTestsService } from './quality-tests.service';
import { CreateQualityTestDto } from './dto/create-quality-test.dto';

/** Milk is tested when it is bought: the purchase rights apply. */
@ApiTags('Dairy - Quality Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/quality-tests')
export class QualityTestsController {
  constructor(private readonly service: QualityTestsService) {}

  @Post() @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateQualityTestDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('sourceType') sourceType?: string, @Query('sourceId') sourceId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('failed') failed?: string, @Query('search') search?: string) {
    return this.service.list(user, { sourceType, sourceId, from, to, search, failed: failed === 'true' ? true : failed === 'false' ? false : undefined });
  }
  @Get('summary') @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, { from, to }); }
  @Get(':id') @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
}
