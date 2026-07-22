import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { MarketplaceSupportController } from './support.controller';
import { MarketplaceSupportService } from './support.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret:
          c.get<string>('MARKETPLACE_JWT_SECRET') ||
          c.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [MarketplaceSupportController],
  providers: [MarketplaceSupportService, CustomerAuthGuard],
  exports: [MarketplaceSupportService],
})
export class MarketplaceSupportModule {}
