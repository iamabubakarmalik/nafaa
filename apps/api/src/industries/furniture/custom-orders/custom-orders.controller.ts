import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CustomOrdersService } from './custom-orders.service';
import {
  ApproveOrderDto, AssignCarpenterDto, CreateCustomOrderDto, RecordPaymentDto, UpdateOrderStatusDto, UpdateProgressDto,
} from './dto/create-custom-order.dto';

/** Made-to-order work is a job: reading needs jobs view, changing it jobs manage; taking money is counter work. */
@ApiTags('Furniture - Custom Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/custom-orders')
export class CustomOrdersController {
  constructor(private readonly service: CustomOrdersService) {}

  @Post() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCustomOrderDto) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('carpenterId') carpenterId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { status, customerId, carpenterId, from, to, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get('summary') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @Get('overdue') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  overdue(@GetUser() user: AuthenticatedUser) { return this.service.overdue(user); }

  @Get(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/approve') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ApproveOrderDto) { return this.service.approve(user, id, dto.finalPrice); }

  /** Advance or later payment: money into the drawer and onto the khata. */
  @Post(':id/payment') @RequirePermissions(PERMISSIONS.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordPaymentDto) { return this.service.recordPayment(user, id, dto); }

  @Post(':id/assign-carpenter') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignCarpenterDto) {
    return this.service.assignCarpenter(user, id, dto.carpenterId, dto.workshopLocation);
  }

  @Post(':id/progress') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  progress(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateProgressDto) { return this.service.updateProgress(user, id, dto); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateCustomOrderDto) { return this.service.update(user, id, dto); }

  /** Marking it delivered writes the order's bill; unpaid rest goes on the khata. */
  @Patch(':id/status') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.service.updateStatus(user, id, dto); }

  /** Older screens: cancels the order (nothing is deleted). */
  @Delete(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
