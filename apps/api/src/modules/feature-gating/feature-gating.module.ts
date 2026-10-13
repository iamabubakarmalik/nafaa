import { Global, Module } from '@nestjs/common';
import { FeatureGatingController } from './feature-gating.controller';
import { FeatureGatingService } from './feature-gating.service';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';

@Global()
@Module({
  controllers: [FeatureGatingController],
  providers: [FeatureGatingService, TenantTimezoneService],
  exports: [FeatureGatingService],
})
export class FeatureGatingModule {}
