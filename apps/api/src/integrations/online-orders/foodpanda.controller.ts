import { Body, Controller, Get, HttpException, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { FoodpandaService } from './foodpanda.service';

/**
 * Delivery Hero ka "POS plugin" — ye URLs wo khud bulata hai. Jawab bilkul
 * unke spec ki shakal me (@Res se seedha — global interceptor ka lifafa nahi),
 * aur sirf allowed codes: 200 / 202 / 400 / 401 / 404 / 500.
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('integrations/foodpanda/plugin')
export class FoodpandaPluginController {
  constructor(private readonly svc: FoodpandaService) {}

  private async run(res: Response, ok: number, fn: () => Promise<unknown>) {
    try {
      const body = await fn();
      res.status(ok);
      if (body === undefined) res.end(); else res.json(body);
    } catch (e: any) {
      const status = e instanceof HttpException ? e.getStatus() : 500;
      const r: any = e instanceof HttpException ? e.getResponse() : null;
      const allowed = [400, 401, 404].includes(status) ? status : 500;
      res.status(allowed).json({ reason: r?.reason ?? (allowed === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'), message: r?.message ?? e?.message ?? 'error' });
    }
  }

  @Post('order/:remoteId')
  order(@Param('remoteId') remoteId: string, @Req() req: Request, @Body() body: any, @Res() res: Response) {
    return this.run(res, 200, () => this.svc.dispatch(remoteId, req.headers.authorization, body));
  }

  @Put('remoteId/:remoteId/remoteOrder/:remoteOrderId/posOrderStatus')
  status(@Param('remoteId') remoteId: string, @Param('remoteOrderId') remoteOrderId: string, @Req() req: Request, @Body() body: any, @Res() res: Response) {
    return this.run(res, 200, async () => { await this.svc.posOrderStatus(remoteId, remoteOrderId, req.headers.authorization, body); return undefined; });
  }

  @Put('remoteId/:remoteId/availability')
  availability(@Param('remoteId') remoteId: string, @Req() req: Request, @Body() body: any, @Res() res: Response) {
    return this.run(res, 200, async () => { await this.svc.availability(remoteId, req.headers.authorization, body); return undefined; });
  }

  @Get('menuimport/:remoteId')
  menu(@Param('remoteId') remoteId: string, @Query() q: { vendorCode?: string; menuImportId?: string }, @Req() req: Request, @Res() res: Response) {
    return this.run(res, 202, async () => { await this.svc.menuImportRequest(remoteId, req.headers.authorization, q); return undefined; });
  }

  @Post('catalog-callback')
  catalogCallback(@Res() res: Response) {
    res.status(200).end();
  }
}

@ApiTags('Foodpanda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/foodpanda')
export class FoodpandaController {
  constructor(private readonly svc: FoodpandaService) {}

  @Get()
  overview(@GetUser() user: AuthenticatedUser) {
    return this.svc.overview(user);
  }

  @Post()
  save(@GetUser() user: AuthenticatedUser, @Body() body: any) {
    return this.svc.save(user, body ?? {});
  }

  @Patch(':id/active')
  active(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { active?: boolean }) {
    return this.svc.setActive(user, id, !!body?.active);
  }
}
