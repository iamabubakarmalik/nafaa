import { Module } from '@nestjs/common';
import { CarpetRollsModule } from './rolls/carpet-rolls.module';
import { CarpetCutPiecesModule } from './cut-pieces/carpet-cut-pieces.module';
import { CarpetReportsModule } from './reports/carpet-reports.module';

@Module({
  imports: [CarpetRollsModule, CarpetCutPiecesModule, CarpetReportsModule],
  exports: [CarpetRollsModule, CarpetCutPiecesModule, CarpetReportsModule],
})
export class CarpetModule {}
