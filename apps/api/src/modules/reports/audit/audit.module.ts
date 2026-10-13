import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, TenantTimezoneService],
})
export class AuditModule {}
