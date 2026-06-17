import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CarpetRollsService } from './carpet-rolls.service';
import { CreateCarpetRollDto } from './dto/create-carpet-roll.dto';
import { UpdateCarpetRollDto } from './dto/update-carpet-roll.dto';
import { QueryRollsDto } from './dto/query-rolls.dto';
import { CutRollDto } from './dto/cut-roll.dto';
import { AdjustRollDto } from './dto/adjust-roll.dto';

@ApiTags('Carpet Rolls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-rolls')
export class CarpetRollsController {
  constructor(private readonly service: CarpetRollsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCarpetRollDto) {
    return this.service.create(user, dto);
  }

  @Post('bulk-opening')
  bulkOpening(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { rolls: CreateCarpetRollDto[] },
  ) {
    return this.service.bulkOpening(user, body.rolls);
  }


  @Post('product-summary')
  productSummary(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { productIds?: string[] },
  ) {
    return this.service.productSummary(user, body?.productIds);
  }

  
  @Post('bulk-import-preview')
  bulkImportPreview(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { rows: any[]; shopId?: string },
  ) {
    return this.service.bulkImportPreview(user, body.rows, body.shopId);
  }

  @Post('bulk-import-apply')
  bulkImportApply(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { rows: any[]; shopId?: string },
  ) {
    return this.service.bulkImportApply(user, body.rows, body.shopId);
  }

    @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryRollsDto) {
    return this.service.findAll(user, query);
  }

  @Get('summary')
  summary(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.summary(user, shopId);
  }

  @Get('low-remaining')
  lowRemaining(
    @GetUser() user: AuthenticatedUser,
    @Query('threshold') threshold?: string,
  ) {
    return this.service.lowRemaining(user, threshold ? Number(threshold) : 10);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCarpetRollDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/cut')
  cut(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CutRollDto,
  ) {
    return this.service.cut(user, id, dto);
  }

  @Post(':id/adjust')
  adjust(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdjustRollDto,
  ) {
    return this.service.adjust(user, id, dto);
  }

  @Patch(':id/mark-damaged')
  markDamaged(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.markDamaged(user, id, body?.reason);
  }

  @Patch(':id/mark-finished')
  markFinished(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markFinished(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
