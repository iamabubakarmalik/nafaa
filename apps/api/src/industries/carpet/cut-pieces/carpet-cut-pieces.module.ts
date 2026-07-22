import { Module } from '@nestjs/common';
import { CarpetCutPiecesController } from './carpet-cut-pieces.controller';
import { CarpetCutPiecesService } from './carpet-cut-pieces.service';

@Module({
  controllers: [CarpetCutPiecesController],
  providers: [CarpetCutPiecesService],
  exports: [CarpetCutPiecesService],
})
export class CarpetCutPiecesModule {}
