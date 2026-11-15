import { Global, Module } from '@nestjs/common';
import { JourneyCaptureService } from './journey-capture.service';
import { JourneyController } from './journey.controller';

/**
 * Merchant journey capture (signup platform and source, last seen per app).
 * Global so the auth flow and the presence interceptor can record without
 * importing it; it is imported once by PresenceModule.
 */
@Global()
@Module({
  controllers: [JourneyController],
  providers: [JourneyCaptureService],
  exports: [JourneyCaptureService],
})
export class JourneyModule {}
