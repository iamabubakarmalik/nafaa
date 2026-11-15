import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JourneyModule } from '../journey/journey.module';
import { PresenceInterceptor } from './presence.interceptor';

/** Global: tracks last activity of signed-in users (see PresenceInterceptor). */
@Module({
  imports: [JourneyModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: PresenceInterceptor }],
})
export class PresenceModule {}
