import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SignupSourceDto } from './dto/signup-source.dto';
import { JourneyCaptureService } from './journey-capture.service';

@ApiTags('Journey')
@ApiBearerAuth()
@Controller('journey')
export class JourneyController {
  constructor(private readonly journey: JourneyCaptureService) {}

  /** Called once by the web app right after signup with where the visitor came from. */
  @Post('signup-source')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record where a new shop came from (UTM, first touch, referrer)' })
  signupSource(@GetUser() user: AuthenticatedUser, @Body() dto: SignupSourceDto) {
    if (user.role !== 'OWNER') throw new ForbiddenException();
    return this.journey.recordSource(user.tenantId, dto);
  }
}
