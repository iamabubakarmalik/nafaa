import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { QuickKeysService } from './quick-keys.service';
import { UpsertQuickKeyDto } from './dto/upsert-quick-key.dto';

@ApiTags('Retail - Quick Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/quick-keys')
export class QuickKeysController {
  constructor(private readonly service: QuickKeysService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) {
    return this.service.list(user, shopId);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertQuickKeyDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertQuickKeyDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post('reorder')
  reorder(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { items: { id: string; position: number }[] },
  ) {
    return this.service.reorder(user, body.items);
  }
}
