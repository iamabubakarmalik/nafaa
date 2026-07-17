import { Module } from '@nestjs/common';
import { ReorderRulesController } from './reorder-rules.controller';
import { ReorderRulesService } from './reorder-rules.service';

@Module({ controllers: [ReorderRulesController], providers: [ReorderRulesService], exports: [ReorderRulesService] })
export class ReorderRulesModule {}
