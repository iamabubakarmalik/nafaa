import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminPlatformDiscountsService } from './admin-platform-discounts.service';
import { UpsertPlatformDiscountDto } from './dto/upsert-discount.dto';

@ApiTags('Admin - Platform Discounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/platform-discounts')
export class AdminPlatformDiscountsController {
  constructor(private readonly service: AdminPlatformDiscountsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpsertPlatformDiscountDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<UpsertPlatformDiscountDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
