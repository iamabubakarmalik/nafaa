import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EasypaisaController } from './easypaisa.controller';
import { EasypaisaService } from './easypaisa.service';
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
  controllers: [EasypaisaController],
  providers: [EasypaisaService, CustomerAuthGuard],
  exports: [EasypaisaService],
})
export class EasypaisaModule {}
