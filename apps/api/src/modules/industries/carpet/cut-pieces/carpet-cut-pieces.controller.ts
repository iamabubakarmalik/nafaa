import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CarpetCutPiecesService } from './carpet-cut-pieces.service';
import { CreateCutPieceDto } from './dto/create-cut-piece.dto';
import { UpdateCutPieceDto } from './dto/update-cut-piece.dto';
import { QueryCutPiecesDto } from './dto/query-cut-pieces.dto';

@ApiTags('Carpet Cut Pieces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-cut-pieces')
export class CarpetCutPiecesController {
  constructor(private readonly service: CarpetCutPiecesService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCutPieceDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryCutPiecesDto) {
    return this.service.findAll(user, query);
  }

  @Get('available')
  available(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.available(user, shopId);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCutPieceDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/mark-sold')
  markSold(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { saleItemId?: string },
  ) {
    return this.service.markSold(user, id, body?.saleItemId);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
