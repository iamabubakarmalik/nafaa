import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { EmergencyDeliveryController } from './emergency-delivery.controller';
import { EmergencyDeliveryService } from './emergency-delivery.service';

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
  controllers: [EmergencyDeliveryController],
  providers: [EmergencyDeliveryService, CustomerAuthGuard],
  exports: [EmergencyDeliveryService],
})
export class EmergencyDeliveryModule {}
