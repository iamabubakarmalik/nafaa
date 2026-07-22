import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { SmsModule } from '../../modules/sms/sms.module';
import { EmailModule } from '../../modules/email/email.module';
import { MarketplaceAuthController } from './auth.controller';
import { MarketplaceAuthService } from './auth.service';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';

@Module({
  imports: [
    PrismaModule,
    SmsModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret:
          c.get<string>('MARKETPLACE_JWT_SECRET') ||
          c.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [MarketplaceAuthController],
  providers: [MarketplaceAuthService, CustomerAuthGuard],
  exports: [MarketplaceAuthService, JwtModule],
})
export class MarketplaceAuthModule {}
