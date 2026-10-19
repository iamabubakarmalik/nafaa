import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/measurement.dto';

const P = PERMISSIONS;

/** A member's progress record: reading follows customers.view, writing customers.edit. */
@ApiTags('Gym - Body Measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/measurements')
export class MeasurementsController {
  constructor(private readonly service: MeasurementsService) {}

  @Post() @RequirePermissions(P.CUSTOMERS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateMeasurementDto) { return this.service.create(user, dto); }
  @Get('by-member/:memberId') @RequirePermissions(P.CUSTOMERS_VIEW) list(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.list(user, memberId); }
  @Get('progress/:memberId') @RequirePermissions(P.CUSTOMERS_VIEW) progress(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.progress(user, memberId); }
  @Delete(':id') @RequirePermissions(P.CUSTOMERS_EDIT) remove() { return this.service.remove(); }
}
