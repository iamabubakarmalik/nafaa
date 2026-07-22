import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@ApiTags('Retail - Combos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/combos')
export class CombosController {
  constructor(private readonly service: CombosService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateComboDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('featured') featured?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user, {
      status,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateComboDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post(':id/toggle-featured')
  toggleFeatured(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.toggleFeatured(user, id);
  }
}
