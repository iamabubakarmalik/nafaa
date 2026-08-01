import { Module } from '@nestjs/common';
import { ShoeTryOnController } from './try-on.controller';
import { ShoeTryOnService } from './try-on.service';
@Module({ controllers: [ShoeTryOnController], providers: [ShoeTryOnService], exports: [ShoeTryOnService] })
export class ShoeTryOnModule {}
