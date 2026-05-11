import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe,
  Patch, Post, UseGuards,
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
import { SkipStepDto } from './dto/skip-step.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('options')
  @ApiOperation({ summary: 'Get static options (cities, business types, etc.)' })
  getOptions() {
    return this.onboarding.getOptions();
  }

  @Get()
  @ApiOperation({ summary: 'Get current onboarding progress' })
  get(@GetUser() user: AuthenticatedUser) {
    return this.onboarding.getOrCreate(user);
  }

  @Patch('step/1')
  @ApiOperation({ summary: 'Update business info (Step 1)' })
  step1(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateStep1Dto) {
    return this.onboarding.updateStep1(user, dto);
  }

  @Patch('step/2')
  @ApiOperation({ summary: 'Update owner profile (Step 2)' })
  step2(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateStep2Dto) {
    return this.onboarding.updateStep2(user, dto);
  }

  @Patch('step/3')
  @ApiOperation({ summary: 'Update shop details (Step 3)' })
  step3(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateStep3Dto) {
    return this.onboarding.updateStep3(user, dto);
  }

  @Patch('step/4')
  @ApiOperation({ summary: 'Update preferences (Step 4)' })
  step4(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateStep4Dto) {
    return this.onboarding.updateStep4(user, dto);
  }

  @Patch('step/5')
  @ApiOperation({ summary: 'Add first products (Step 5)' })
  step5(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateStep5Dto) {
    return this.onboarding.updateStep5(user, dto);
  }

  @Patch('step/6')
  @ApiOperation({ summary: 'Add team members & finish (Step 6)' })
  step6(@GetUser() user: AuthenticatedUser, @Body() dto: UpdateStep6Dto) {
    return this.onboarding.updateStep6(user, dto);
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip a step (only steps 5 & 6)' })
  skip(@GetUser() user: AuthenticatedUser, @Body() dto: SkipStepDto) {
    return this.onboarding.skipStep(user, dto.step);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  complete(@GetUser() user: AuthenticatedUser) {
    return this.onboarding.complete(user);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset onboarding (owner only)' })
  reset(@GetUser() user: AuthenticatedUser) {
    return this.onboarding.reset(user);
  }
}
