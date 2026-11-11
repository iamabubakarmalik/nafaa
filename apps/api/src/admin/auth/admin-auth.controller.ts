import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin - Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.service.login(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  /** New tokens for a signed-in admin, so the panel does not sign out when the short access token ends. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: { refreshToken?: string }, @Req() req: Request) {
    return this.service.refresh(body?.refreshToken, { userAgent: req.headers['user-agent'], ip: req.ip });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@GetUser() user: AuthenticatedUser) {
    return this.service.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { refreshToken?: string },
  ) {
    return this.service.logout(user.id, body.refreshToken);
  }

  @Public()
  @Get('invite')
  inviteInfo(@Query('token') token: string) {
    return this.service.inviteInfo(token);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@Body() body: { token: string; password: string }, @Req() req: Request) {
    return this.service.acceptInvite(body.token, body.password, { userAgent: req.headers['user-agent'], ip: req.ip });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  setupTwoFactor(@GetUser() user: AuthenticatedUser) {
    return this.service.setupTwoFactor(user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@GetUser() user: AuthenticatedUser, @Body() body: { code: string }) {
    return this.service.enableTwoFactor(user.id, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@GetUser() user: AuthenticatedUser, @Body() body: { code: string }) {
    return this.service.disableTwoFactor(user.id, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  sessions(@GetUser() user: AuthenticatedUser) {
    return this.service.mySessions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  endSession(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.endMySession(user.id, id);
  }
}
