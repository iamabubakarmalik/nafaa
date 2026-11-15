/**
 * Nafaa Live Support: chat between shops and the Nafaa team, with Nafaa AI as
 * the first responder, calls and screen share (WebRTC over the app socket),
 * and the admin inbox. Contract: support.types.ts.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UploadsModule } from '../uploads/uploads.module';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportService } from './support.service';
import { SupportAdminService } from './support-admin.service';
import { SupportSettingsService } from './support-settings.service';
import { SupportAiService } from './support-ai.service';
import { SupportGateway } from './support.gateway';
import { SupportHub } from './support.hub';
import { SupportProactiveService } from './support-proactive.service';

@Module({
  imports: [JwtModule.register({}), UploadsModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportHub, SupportSettingsService, SupportAiService, SupportService, SupportAdminService, SupportProactiveService, SupportGateway],
  exports: [SupportService, SupportHub],
})
export class SupportModule {}
