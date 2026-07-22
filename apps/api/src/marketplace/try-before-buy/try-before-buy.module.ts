import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { TryBeforeBuyController } from './try-before-buy.controller';
import { TryBeforeBuyService } from './try-before-buy.service';

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
  controllers: [TryBeforeBuyController],
  providers: [TryBeforeBuyService, CustomerAuthGuard],
  exports: [TryBeforeBuyService],
})
export class TryBeforeBuyModule {}
