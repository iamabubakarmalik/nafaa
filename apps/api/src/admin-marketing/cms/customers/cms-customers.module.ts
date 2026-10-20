import { Module } from '@nestjs/common';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsCustomersController } from './cms-customers.controller';
import { CmsCustomersService } from './cms-customers.service';

/** Customers and testimonials with consent rules (API-CONTRACT 8.8). */
@Module({
  imports: [CmsPublicCoreModule],
  controllers: [CmsCustomersController],
  providers: [CmsCustomersService],
  exports: [CmsCustomersService],
})
export class CmsCustomersModule {}
