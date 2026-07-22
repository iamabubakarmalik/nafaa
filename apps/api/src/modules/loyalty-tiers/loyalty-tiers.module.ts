import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../../marketplace/_shared/guards/customer-auth.guard';
import { LoyaltyTiersController } from './loyalty-tiers.controller';
import { LoyaltyTiersService } from './loyalty-tiers.service';

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
  controllers: [LoyaltyTiersController],
  providers: [LoyaltyTiersService, CustomerAuthGuard],
  exports: [LoyaltyTiersService],
})
export class LoyaltyTiersModule {}
