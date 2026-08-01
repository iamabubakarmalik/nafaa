import { Module } from '@nestjs/common';
import { ShoeSizeVariantsController } from './size-variants.controller';
import { ShoeSizeVariantsService } from './size-variants.service';
@Module({ controllers: [ShoeSizeVariantsController], providers: [ShoeSizeVariantsService], exports: [ShoeSizeVariantsService] })
export class ShoeSizeVariantsModule {}
