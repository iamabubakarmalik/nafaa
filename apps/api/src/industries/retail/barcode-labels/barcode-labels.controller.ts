import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BarcodeLabelsService } from './barcode-labels.service';
import { CreateBarcodeBatchDto } from './dto/create-batch.dto';

@ApiTags('Retail - Barcode Labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/barcode-labels')
export class BarcodeLabelsController {
  constructor(private readonly service: BarcodeLabelsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateBarcodeBatchDto) {
    return this.service.create(user, dto);
  }

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Post(':id/mark-printed')
  markPrinted(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markPrinted(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
