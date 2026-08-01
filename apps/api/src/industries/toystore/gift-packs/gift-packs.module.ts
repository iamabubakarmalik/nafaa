import { Module } from '@nestjs/common';
import { GiftPacksController } from './gift-packs.controller';
import { GiftPacksService } from './gift-packs.service';

@Module({ controllers: [GiftPacksController], providers: [GiftPacksService], exports: [GiftPacksService] })
export class GiftPacksModule {}
