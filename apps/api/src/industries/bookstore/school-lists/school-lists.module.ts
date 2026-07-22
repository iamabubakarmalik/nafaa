import { Module } from '@nestjs/common';
import { SchoolListsController } from './school-lists.controller';
import { SchoolListsService } from './school-lists.service';

@Module({ controllers: [SchoolListsController], providers: [SchoolListsService], exports: [SchoolListsService] })
export class SchoolListsModule {}
