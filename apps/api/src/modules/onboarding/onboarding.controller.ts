import {
  Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateStep1Dto } from './dto/update-step1.dto';
import { UpdateStep2Dto } from './dto/update-step2.dto';
import { UpdateStep3Dto } from './dto/update-step3.dto';
import { UpdateStep4Dto } from './dto/update-step4.dto';
import { UpdateStep5Dto } from './dto/update-step5.dto';
import { UpdateStep6Dto } from './dto/update-step6.dto';
import { UpdateStep7Dto } from './dto/update-step7.dto';
import { UpdateStep8Dto } from './dto/update-step8.dto';
import { SkipStepDto } from './dto/skip-step.dto';
import { OnboardingService } from './onboarding.service';
import { LocationDetectorService } from './services/location-detector.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly locationDetector: LocationDetectorService,
  ) {}

  @Get('options')
  @ApiOperation({ summary: 'Get all options + business templates + step labels' })
  getOptions() {
    return this.onboarding.getOptions();
  }

  @Get()
  @ApiOperation({ summary: 'Get current progress (auto-detects location on first call)' })
  async get(@GetUser() user: AuthenticatedUser, @Req() req: any) {
    const ip = this.locationDetector.extractIp(req);
    return this.onboarding.getOrCreate(user, ip);
  }

  @Get('business-config')
  getBusinessConfig(@GetUser() user: AuthenticatedUser) {
    return this.onboarding.getBusinessConfig(user);
  }

  @Patch('business-features')
  updateFeatures(@GetUser() user: AuthenticatedUser, @Body() body: { features: Record<string, boolean> }) {
    return this.onboarding.updateBusinessFeatures(user, body.features);
  }

  @Post('change-business-type')
  @HttpCode(HttpStatus.OK)
  changeType(@GetUser() user: AuthenticatedUser, @Body() body: { businessType: string }) {
    return this.onboarding.changeBusinessType(user, body.businessType);
  }

  @Patch('step/1') step1(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep1Dto) { return this.onboarding.updateStep1(u, dto); }
  @Patch('step/2') step2(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep2Dto) { return this.onboarding.updateStep2(u, dto); }
  @Patch('step/3') step3(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep3Dto) { return this.onboarding.updateStep3(u, dto); }
  @Patch('step/4') step4(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep4Dto) { return this.onboarding.updateStep4(u, dto); }
  @Patch('step/5') step5(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep5Dto) { return this.onboarding.updateStep5(u, dto); }
  @Patch('step/6') step6(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep6Dto) { return this.onboarding.updateStep6(u, dto); }
  @Patch('step/7') step7(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep7Dto) { return this.onboarding.updateStep7(u, dto); }
  @Patch('step/8') step8(@GetUser() u: AuthenticatedUser, @Body() dto: UpdateStep8Dto) { return this.onboarding.updateStep8(u, dto); }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  skip(@GetUser() user: AuthenticatedUser, @Body() dto: SkipStepDto) {
    return this.onboarding.skipStep(user, dto.step);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@GetUser() user: AuthenticatedUser) {
    return this.onboarding.complete(user);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  reset(@GetUser() user: AuthenticatedUser) {
    return this.onboarding.reset(user);
  }

  @Post('time-spent')
  @HttpCode(HttpStatus.OK)
  recordTime(@GetUser() user: AuthenticatedUser, @Body() body: { seconds: number }) {
    return this.onboarding.recordTimeSpent(user, body.seconds);
  }
}
