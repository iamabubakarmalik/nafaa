import { Module } from '@nestjs/common';
import { ReadingListsController } from './reading-lists.controller';
import { ReadingListsService } from './reading-lists.service';

@Module({ controllers: [ReadingListsController], providers: [ReadingListsService], exports: [ReadingListsService] })
export class ReadingListsModule {}
