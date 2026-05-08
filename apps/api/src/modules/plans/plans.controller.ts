import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PlansService } from './plans.service';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Public()
  @Get()
  listPublic() {
    return this.service.listPublic();
  }

  @Public()
  @Post('seed')
  seed() {
    return this.service.seedDefaultPlans();
  }
}
