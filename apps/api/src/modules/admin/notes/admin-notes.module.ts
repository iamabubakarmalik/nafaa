import { Module } from '@nestjs/common';
import { AdminNotesController } from './admin-notes.controller';
import { AdminNotesService } from './admin-notes.service';

@Module({
  controllers: [AdminNotesController],
  providers: [AdminNotesService],
})
export class AdminNotesModule {}
