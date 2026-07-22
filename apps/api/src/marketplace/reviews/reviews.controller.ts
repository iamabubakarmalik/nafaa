import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListMyReviewsDto } from './dto/list-my-reviews.dto';

@ApiTags('Marketplace / Reviews')
@Controller('marketplace/reviews')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceReviewsController {
  constructor(private readonly svc: MarketplaceReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review (product / shop / rider / order)' })
  create(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: CreateReviewDto) {
    return this.svc.createReview(c.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my reviews with type filter' })
  my(@GetCustomer() c: AuthenticatedCustomer, @Query() dto: ListMyReviewsDto) {
    return this.svc.myReviews(c.id, dto);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Delivered orders still awaiting review (last 30 days)' })
  pending(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getPendingReviews(c.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single review by id (public)' })
  get(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.getReview(id, c.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit my review (within 30 days)' })
  update(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.svc.updateReview(c.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete my review' })
  delete(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.deleteReview(c.id, id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote helpful / unhelpful on a review' })
  vote(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() body: { isHelpful: boolean },
  ) {
    return this.svc.voteReview(c.id, id, body.isHelpful);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report a review for moderation' })
  report(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.svc.reportReview(c.id, id, body.reason);
  }
}
