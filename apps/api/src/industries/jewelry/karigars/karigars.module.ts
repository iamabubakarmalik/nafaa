import { Module } from '@nestjs/common';
import { KarigarsController } from './karigars.controller';
import { KarigarsService } from './karigars.service';

@Module({ controllers: [KarigarsController], providers: [KarigarsService], exports: [KarigarsService] })
export class KarigarsModule {}
