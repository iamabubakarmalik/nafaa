import { Global, Module } from '@nestjs/common';
import { FeatureGatingController } from './feature-gating.controller';
import { FeatureGatingService } from './feature-gating.service';

@Global()
@Module({
  controllers: [FeatureGatingController],
  providers: [FeatureGatingService],
  exports: [FeatureGatingService],
})
export class FeatureGatingModule {}
