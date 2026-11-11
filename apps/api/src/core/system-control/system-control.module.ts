import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, DiscoveryModule } from '@nestjs/core';
import { ErrorLogService } from './error-log.service';
import { SystemControlInterceptor } from './system-control.interceptor';
import { SystemControlService } from './system-control.service';

/**
 * Runtime controls for the admin panel: platform switches (maintenance,
 * signups, Nafaa AI), background job pause / run now, and the server error
 * log. Global so the exception filter and admin controllers can inject it.
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [ErrorLogService, SystemControlService, { provide: APP_INTERCEPTOR, useClass: SystemControlInterceptor }],
  exports: [ErrorLogService, SystemControlService],
})
export class SystemControlModule {}
