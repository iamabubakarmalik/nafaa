import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { MarketplaceStorageController } from './marketplace-storage.controller';

@Global()
@Module({
  imports: [
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
  controllers: [StorageController, MarketplaceStorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
