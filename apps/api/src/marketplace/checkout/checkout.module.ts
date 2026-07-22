import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { MarketplaceCartModule } from '../cart/cart.module';
import { MarketplaceCheckoutController } from './checkout.controller';
import { MarketplaceCheckoutService } from './checkout.service';

@Module({
  imports: [
    PrismaModule,
    MarketplaceCartModule,
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
  controllers: [MarketplaceCheckoutController],
  providers: [MarketplaceCheckoutService, CustomerAuthGuard],
  exports: [MarketplaceCheckoutService],
})
export class MarketplaceCheckoutModule {}
