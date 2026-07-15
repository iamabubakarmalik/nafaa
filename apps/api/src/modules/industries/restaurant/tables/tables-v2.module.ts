import { Module } from '@nestjs/common';
import { TablesV2Controller } from './tables-v2.controller';
import { TablesV2Service } from './tables-v2.service';

@Module({ controllers: [TablesV2Controller], providers: [TablesV2Service], exports: [TablesV2Service] })
export class TablesV2Module {}
