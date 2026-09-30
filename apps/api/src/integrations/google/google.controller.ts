import { Body, Controller, Get, Module, Param, Patch, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { GoogleService, GoogleSettings } from './google.service';

@ApiTags('Google')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('google')
export class GoogleController {
  constructor(private readonly svc: GoogleService) {}

  @Get()
  overview(@GetUser() user: AuthenticatedUser) {
    return this.svc.overview(user);
  }

  @Patch()
  update(@GetUser() user: AuthenticatedUser, @Body() body: Partial<GoogleSettings> & { enable?: boolean; rotate?: boolean }) {
    return this.svc.update(user, body ?? {});
  }

  @Get('review')
  review(@GetUser() user: AuthenticatedUser) {
    return this.svc.review(user.tenantId);
  }
}

/** Merchant Center yahan se roz parhta hai (token = khufia link) */
@ApiTags('Google (public feed)')
@Public()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('integrations/google/feed')
export class GoogleFeedController {
  constructor(private readonly svc: GoogleService) {}

  // @Res se seedha bhejte hain — global ResponseInterceptor XML/TSV ko JSON me na lapete
  @Get(':token/products.xml')
  async products(@Param('token') token: string, @Res() res: Response) {
    const body = await this.svc.productFeed(token);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.send(body);
  }

  @Get(':token/local-inventory.txt')
  async local(@Param('token') token: string, @Res() res: Response) {
    const body = await this.svc.localInventory(token);
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.send(body);
  }
}

@Module({ imports: [PrismaModule], controllers: [GoogleController, GoogleFeedController], providers: [GoogleService] })
export class GoogleModule {}
