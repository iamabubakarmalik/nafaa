import { Module } from '@nestjs/common';
import { QuickKeysController } from './quick-keys.controller';
import { QuickKeysService } from './quick-keys.service';

@Module({
  controllers: [QuickKeysController],
  providers: [QuickKeysService],
  exports: [QuickKeysService],
})
export class QuickKeysModule {}
