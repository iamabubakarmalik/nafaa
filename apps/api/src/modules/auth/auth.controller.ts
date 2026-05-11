import {
  Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteGoogleSignupDto } from './dto/complete-google-signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleMobileDto } from './dto/google-mobile.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new shop' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email/password login' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetUser() user: AuthenticatedUser, @Body() dto: RefreshDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@GetUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  updateProfile(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { fullName?: string; phone?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(user.id, body);
  }

  // ===== PASSWORD MANAGEMENT =====
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set password (for Google-only users)' })
  setPassword(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: SetPasswordDto,
  ) {
    return this.authService.setPassword(user.id, dto.newPassword);
  }

  // ===== EMAIL VERIFICATION =====
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify-email/send')
  @HttpCode(HttpStatus.OK)
  sendVerifyEmail(@GetUser() user: AuthenticatedUser) {
    return this.authService.sendVerifyEmailOtp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify-email/confirm')
  @HttpCode(HttpStatus.OK)
  confirmVerifyEmail(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: VerifyEmailDto,
  ) {
    return this.authService.confirmVerifyEmail(user.id, dto.code);
  }

  // ===== GOOGLE OAUTH (Web — browser redirect) =====
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth flow (web)' })
  googleAuth() {
    // Passport redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback (web)' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:5173';

    try {
      const result = await this.authService.googleAuth(req.user);

      // New user — needs shopName
      if ('needsShopName' in result) {
        const paramsObj: Record<string, string> = {
          tempToken: result.tempToken ?? '',
          email: result.email ?? '',
          fullName: result.fullName ?? '',
        };
        if (result.avatarUrl) paramsObj.avatarUrl = result.avatarUrl;

        const params = new URLSearchParams(paramsObj);
        return res.redirect(`${appUrl}/auth/google/complete-signup#${params.toString()}`);
      }

      // Existing user — full login response
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isNewUser: String(result.isNewUser),
      });
      res.redirect(`${appUrl}/auth/google/success#${params.toString()}`);
    } catch (e: any) {
      const msg = e?.message || 'Google login fail ho gaya';
      res.redirect(`${appUrl}/auth/google/error?message=${encodeURIComponent(msg)}`);
    }
  }

  @Public()
  @Post('google/complete-signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete Google signup with shopName' })
  completeGoogleSignup(@Body() dto: CompleteGoogleSignupDto) {
    return this.authService.completeGoogleSignup(dto.tempToken, dto.shopName);
  }

  // ===== GOOGLE MOBILE (Native SDK ID token) =====
  @Public()
  @Post('google/mobile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mobile Google sign-in (idToken from native SDK)' })
  googleMobile(@Body() dto: GoogleMobileDto) {
    return this.authService.googleMobile(dto.idToken, dto.shopName);
  }

  // ===== GOOGLE DISCONNECT =====
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('google/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect Google account (requires password set)' })
  disconnectGoogle(@GetUser() user: AuthenticatedUser) {
    return this.authService.disconnectGoogle(user.id);
  }
}
