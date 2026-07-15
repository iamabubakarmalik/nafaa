import { Module } from '@nestjs/common';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';

@Module({ controllers: [MenuItemsController], providers: [MenuItemsService], exports: [MenuItemsService] })
export class MenuItemsModule {}
