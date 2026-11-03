import { Global, Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

/** Storage and cleanup for Idempotency-Key; the interceptor is registered in AppModule. */
@Global()
@Module({
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
