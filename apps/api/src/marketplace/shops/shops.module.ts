import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { MarketplaceShopsController } from './shops.controller';
import { MarketplaceShopsService } from './shops.service';

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
  controllers: [MarketplaceShopsController],
  providers: [MarketplaceShopsService, CustomerAuthGuard],
  exports: [MarketplaceShopsService],
})
export class MarketplaceShopsModule {}
