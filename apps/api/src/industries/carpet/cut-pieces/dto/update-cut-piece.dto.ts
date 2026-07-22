import { PartialType } from '@nestjs/swagger';
import { CreateCutPieceDto } from './create-cut-piece.dto';

export class UpdateCutPieceDto extends PartialType(CreateCutPieceDto) {}
