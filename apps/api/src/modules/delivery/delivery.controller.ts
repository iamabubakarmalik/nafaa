import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeliveryService } from './delivery.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateZoneDto } from './dto/create-zone.dto';

@ApiTags('Delivery (Business)')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly svc: DeliveryService) {}

  private tid(req: Request) {
    return ((req as any).user?.tenantId) as string;
  }

  // ─── RIDERS ───
  @Get('riders')
  listRiders(
    @Req() req: Request,
    @Query('status') status?: any,
    @Query('shopId') shopId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listRiders(this.tid(req), {
      status, shopId, search, limit: +(limit ?? 20), offset: +(offset ?? 0),
    });
  }

  @Get('riders/:id')
  getRider(@Req() req: Request, @Param('id') id: string) {
    return this.svc.getRider(this.tid(req), id);
  }

  @Post('riders')
  @ApiOperation({ summary: 'Register a new rider' })
  createRider(@Req() req: Request, @Body() dto: CreateRiderDto) {
    return this.svc.createRider(this.tid(req), dto);
  }

  @Patch('riders/:id')
  updateRider(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateRiderDto) {
    return this.svc.updateRider(this.tid(req), id, dto);
  }

  @Delete('riders/:id')
  deleteRider(@Req() req: Request, @Param('id') id: string) {
    return this.svc.deleteRider(this.tid(req), id);
  }

  // ─── ASSIGNMENTS ───
  @Get('active')
  @ApiOperation({ summary: 'Active deliveries in progress' })
  listActive(@Req() req: Request) {
    return this.svc.listActiveDeliveries(this.tid(req));
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign order to rider (auto-picks nearest if riderId omitted)' })
  assign(@Req() req: Request, @Body() dto: AssignOrderDto) {
    return this.svc.assignOrder(this.tid(req), dto);
  }

  @Post('assignments/:id/unassign')
  @ApiOperation({ summary: 'Unassign / cancel a delivery assignment' })
  unassign(@Req() req: Request, @Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.svc.unassign(this.tid(req), id, body?.reason);
  }

  // ─── TRACKING ───
  @Get('riders/:id/track')
  trackRider(@Param('id') id: string) {
    return this.svc.trackRider(id);
  }

  // ─── ZONES ───
  @Get('zones')
  listZones(@Req() req: Request, @Query('shopId') shopId?: string) {
    return this.svc.listZones(this.tid(req), shopId);
  }

  @Post('zones')
  createZone(@Req() req: Request, @Body() dto: CreateZoneDto) {
    return this.svc.createZone(this.tid(req), dto);
  }

  @Patch('zones/:id')
  updateZone(@Req() req: Request, @Param('id') id: string, @Body() dto: Partial<CreateZoneDto>) {
    return this.svc.updateZone(this.tid(req), id, dto);
  }

  @Delete('zones/:id')
  deleteZone(@Req() req: Request, @Param('id') id: string) {
    return this.svc.deleteZone(this.tid(req), id);
  }

  // ─── STATS ───
  @Get('stats')
  stats(@Req() req: Request) {
    return this.svc.getDeliveryStats(this.tid(req));
  }
}
