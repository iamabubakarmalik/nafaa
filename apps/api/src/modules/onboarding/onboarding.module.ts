import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { LocationDetectorService } from './services/location-detector.service';
import { SampleDataService } from './services/sample-data.service';
import { OnboardingGuard } from './guards/onboarding.guard';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    LocationDetectorService,
    SampleDataService,
    OnboardingGuard,
  ],
  exports: [OnboardingService, OnboardingGuard, SampleDataService],
})
export class OnboardingModule {}
