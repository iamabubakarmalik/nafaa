import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { MarketplaceAuthService } from './auth.service';
import { AuthenticatedCustomer } from './interfaces/customer-jwt.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Marketplace / Auth')
@Controller('marketplace/auth')
export class MarketplaceAuthController {
  constructor(private readonly svc: MarketplaceAuthService) {}

  // ─── OTP FLOW ───
  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone (login / register / verify / reset)' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.svc.sendOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP — for LOGIN and REGISTER returns tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.svc.verifyOtp(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // ─── PASSWORD FLOW ───
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register customer with password (phone must be verified beforehand)' })
  register(@Body() dto: RegisterCustomerDto, @Req() req: Request) {
    return this.svc.registerWithPassword(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with phone/email + password' })
  login(@Body() dto: LoginCustomerDto, @Req() req: Request) {
    return this.svc.loginWithPassword(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // ─── SOCIAL ───
  @Public()
  @Post('social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google / Facebook / Apple' })
  social(@Body() dto: SocialLoginDto, @Req() req: Request) {
    return this.svc.socialLogin(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // ─── TOKENS ───
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.svc.refresh(dto.refreshToken);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: RefreshTokenDto) {
    return this.svc.logout(c.sub, dto.refreshToken);
  }

  // ─── PROFILE ───
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.me(c.sub);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  updateProfile(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: UpdateCustomerProfileDto) {
    return this.svc.updateProfile(c.sub, dto);
  }

  // ─── PASSWORD ───
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('password/set')
  @HttpCode(HttpStatus.OK)
  setPassword(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: SetPasswordDto) {
    return this.svc.setPassword(c.sub, dto.newPassword);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  changePassword(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(c.sub, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password after verified RESET_PASSWORD OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.svc.resetPasswordWithOtp(dto.phone, dto.code, dto.newPassword);
  }

  // ─── SESSIONS / SECURITY ───
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  sessions(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.listSessions(c.sub);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  revokeSession(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.revokeSession(c.sub, id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('login-history')
  history(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.loginHistory(c.sub, 30);
  }

  // ─── DELETE ACCOUNT ───
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@GetCustomer() c: AuthenticatedCustomer, @Body() body: { reason?: string }) {
    return this.svc.deleteAccount(c.sub, body?.reason);
  }
}
