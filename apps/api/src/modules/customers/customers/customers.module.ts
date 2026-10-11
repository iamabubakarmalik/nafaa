import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerDirectoryService } from './customer-directory.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerDirectoryService, TenantTimezoneService],
})
export class CustomersModule {}
