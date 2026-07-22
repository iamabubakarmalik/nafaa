import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { VoiceSearchController } from './voice-search.controller';
import { VoiceSearchService } from './voice-search.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('MARKETPLACE_JWT_SECRET') || c.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [VoiceSearchController],
  providers: [VoiceSearchService, CustomerAuthGuard],
  exports: [VoiceSearchService],
})
export class VoiceSearchModule {}
