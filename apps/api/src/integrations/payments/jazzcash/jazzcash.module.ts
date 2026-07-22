import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../../prisma/prisma.module';
import { JazzCashController } from './jazzcash.controller';
import { JazzCashService } from './jazzcash.service';
import { CustomerAuthGuard } from '../../../marketplace/_shared/guards/customer-auth.guard';

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
  controllers: [JazzCashController],
  providers: [JazzCashService, CustomerAuthGuard],
  exports: [JazzCashService],
})
export class JazzCashModule {}
