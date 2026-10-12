import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { AssignBarcodesDto, LabelConfigDto } from './dto/label-config.dto';
import { BarcodeLabelsService } from './barcode-labels.service';

@ApiTags('Barcode Labels')
@ApiBearerAuth()
@Controller('barcode-labels')
export class BarcodeLabelsController {
  constructor(private readonly service: BarcodeLabelsService) {}

  @Get('settings')
  getConfig(@GetUser() user: AuthenticatedUser) {
    return this.service.getConfig(user);
  }

  @Patch('settings')
  saveConfig(@GetUser() user: AuthenticatedUser, @Body() dto: LabelConfigDto) {
    return this.service.saveConfig(user, dto);
  }

  /** Fresh scanner-safe codes for products (and variants) that have none. */
  @Post('assign')
  assign(@GetUser() user: AuthenticatedUser, @Body() dto: AssignBarcodesDto) {
    return this.service.assign(user, dto);
  }
}
