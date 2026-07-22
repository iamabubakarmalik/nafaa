import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../../../marketplace/_shared/guards/customer-auth.guard';
import { GetCustomer } from '../../../marketplace/_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../../../marketplace/auth/interfaces/customer-jwt.interface';
import { EasypaisaService } from './easypaisa.service';
import { InitiateEasypaisaDto } from './dto/initiate-easypaisa.dto';
import { VerifyEasypaisaDto } from './dto/verify-easypaisa.dto';

@ApiTags('Integrations / Easypaisa')
@Controller('integrations/payments/easypaisa')
export class EasypaisaController {
  constructor(private readonly svc: EasypaisaService) {}

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('initiate')
  @ApiOperation({ summary: 'Initiate Easypaisa (MA=mobile account, OTC=voucher)' })
  initiate(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: InitiateEasypaisaDto) {
    return this.svc.initiate(dto, c.id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('verify')
  @ApiOperation({ summary: 'Verify Easypaisa transaction' })
  verify(@Body() dto: VerifyEasypaisaDto) {
    return this.svc.verify(dto);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Easypaisa webhook' })
  webhook(@Body() body: any) {
    return this.svc.handleWebhook(body);
  }
}
