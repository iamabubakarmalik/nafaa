import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly svc: PromotionsService) {}
  private tid(req: Request) { return (req as any).user?.tenantId as string; }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post() create(@Req() r: Request, @Body() dto: CreatePromotionDto) { return this.svc.create(this.tid(r), dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get()
  list(@Req() r: Request, @Query() q: any) {
    return this.svc.list(this.tid(r), { status: q.status, type: q.type, search: q.search, limit: +(q.limit ?? 20), offset: +(q.offset ?? 0) });
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get(':id') get(@Req() r: Request, @Param('id') id: string) { return this.svc.findOne(this.tid(r), id); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Patch(':id') update(@Req() r: Request, @Param('id') id: string, @Body() dto: UpdatePromotionDto) { return this.svc.update(this.tid(r), id, dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Delete(':id') remove(@Req() r: Request, @Param('id') id: string) { return this.svc.remove(this.tid(r), id); }

  @Public() @Post('validate-coupon')
  validate(@Body() dto: ValidateCouponDto, @Req() r: Request) {
    const cid = (r as any).customer?.id;
    return this.svc.validateCoupon(dto, cid);
  }

  @Public() @Get('marketplace/active')
  active(@Query('city') city?: string) { return this.svc.listActiveForMarketplace(city); }

  @Public() @Get('marketplace/flash-sales')
  flash() { return this.svc.listFlashSales(); }
}
