import { Module } from '@nestjs/common';
import { AdminJourneyModule } from '../journey/admin-journey.module';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminTenantsService } from './admin-tenants.service';

@Module({
  imports: [AdminJourneyModule],
  controllers: [AdminTenantsController],
  providers: [AdminTenantsService],
})
export class AdminTenantsModule {}
