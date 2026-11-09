import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PostInput, SocialService } from './social.service';
import { AiRequest, SocialAiService } from './social-ai.service';
import type { PlanIdea } from './social-math';

/**
 * Social media studio (web /online-store/social, mobile /online/social).
 * Reading needs online_orders.view and every write online_orders.manage,
 * like the other online store growth pages (permission-routes). Nafaa AI
 * calls count against the shop's daily Nafaa AI limit.
 */
@ApiTags('Social media studio')
@ApiBearerAuth()
@Controller('online-store/social')
export class SocialController {
  constructor(private readonly service: SocialService, private readonly ai: SocialAiService) {}

  @Get('posts')
  list(@GetUser() user: AuthenticatedUser, @Query() q: { from?: string; to?: string; status?: string; platform?: string; search?: string; undated?: string }) {
    return this.service.list(user, q ?? {});
  }

  @Get('due')
  @ApiOperation({ summary: 'Posts to do now (reminders, mobile list)' })
  due(@GetUser() user: AuthenticatedUser) {
    return this.service.due(user);
  }

  @Get('posts/:id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Post('posts')
  create(@GetUser() user: AuthenticatedUser, @Body() body: PostInput) {
    return this.service.create(user, body ?? {});
  }

  @Patch('posts/:id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: PostInput) {
    return this.service.update(user, id, body ?? {});
  }

  @Delete('posts/:id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post('posts/:id/posted')
  @ApiOperation({ summary: 'Mark posted (optional post links per platform) or undo' })
  posted(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { urls?: Record<string, string>; undo?: boolean }) {
    return this.service.markPosted(user, id, body ?? {});
  }

  @Post('ai')
  @ApiOperation({ summary: 'Nafaa AI: captions, hashtags, reel script or a 7/30-day plan' })
  generate(@GetUser() user: AuthenticatedUser, @Body() body: AiRequest) {
    return this.ai.generate(user, body ?? {});
  }

  @Post('plan/apply')
  @ApiOperation({ summary: 'Save a content plan as calendar posts' })
  applyPlan(@GetUser() user: AuthenticatedUser, @Body() body: { ideas?: PlanIdea[]; status?: string }) {
    return this.service.applyPlan(user, body ?? {});
  }

  @Get('products')
  products(@GetUser() user: AuthenticatedUser, @Query() q: { search?: string; ids?: string }) {
    return this.service.products(user, q ?? {});
  }

  @Get('brand')
  brand(@GetUser() user: AuthenticatedUser) {
    return this.service.brand(user);
  }

  @Put('brand')
  saveBrand(@GetUser() user: AuthenticatedUser, @Body() body: { colors?: { primary?: string; accent?: string; text?: string }; handle?: string | null }) {
    return this.service.saveBrand(user, body ?? {});
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @Query() q: { from?: string; to?: string }) {
    return this.service.analytics(user, q ?? {});
  }
}
