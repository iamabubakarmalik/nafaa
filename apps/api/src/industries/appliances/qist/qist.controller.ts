import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { QistGuarantorService } from './qist.service';
import { QistGuarantorDto } from './dto/guarantor.dto';

@ApiTags('Appliances - Qist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/qist-plans')
export class QistGuarantorController {
  constructor(private readonly service: QistGuarantorService) {}

  /** Sets the plan's guarantor; same right as making the plan. */
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Put(':id/guarantor') set(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: QistGuarantorDto) { return this.service.set(user, id, dto); }
}
