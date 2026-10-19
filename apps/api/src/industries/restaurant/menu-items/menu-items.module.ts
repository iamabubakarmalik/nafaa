import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RecipesModule } from '../recipes/recipes.module';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuBoardService } from './menu-board.service';

@Module({
  imports: [RecipesModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService, MenuBoardService, TenantTimezoneService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
