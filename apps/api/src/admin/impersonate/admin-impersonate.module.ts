import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminImpersonateController } from './admin-impersonate.controller';
import { AdminImpersonateService } from './admin-impersonate.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AdminImpersonateController],
  providers: [AdminImpersonateService],
})
export class AdminImpersonateModule {}
