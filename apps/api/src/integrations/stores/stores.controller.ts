/**
 * Merchant API for Nafaa Stores (`/api/stores`). Reads need
 * online_products.view, changes online_products.manage; the services add the
 * `website` add-on gate and owner/manager checks where noted in the contract.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { StoresService } from './stores.service';
import { StoreThemeService } from './store-theme.service';
import { StoreDomainsService } from './store-domains.service';
import { StoreAnalyticsService } from './store-analytics.service';
import { StoreShopifyImportService } from './store-shopify-import.service';

const VIEW = PERMISSIONS.ONLINE_PRODUCTS_VIEW;
const EDIT = PERMISSIONS.ONLINE_PRODUCTS_MANAGE;
type U = AuthenticatedUser;

@ApiTags('Nafaa Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(
    private readonly stores: StoresService,
    private readonly theme: StoreThemeService,
    private readonly domains: StoreDomainsService,
    private readonly analytics: StoreAnalyticsService,
    private readonly shopify: StoreShopifyImportService,
  ) {}

  // ─── fixed paths first, so `:id` never takes them ───
  @Get() @RequirePermissions(VIEW) list(@GetUser() u: U) { return this.stores.list(u); }
  @Get('slug-check') @RequirePermissions(VIEW) slugCheck(@Query('slug') slug: string) { return this.stores.slugCheck(slug ?? ''); }
  @Get('theme-schema') @RequirePermissions(VIEW) schema() { return this.theme.schema(); }
  @Get('policy-templates') @RequirePermissions(VIEW) templates(@GetUser() u: U) { return this.stores.policyTemplates(u); }
  @Get('pk-cities') @RequirePermissions(VIEW) cities() { return this.stores.cities(); }
  @Post() @RequirePermissions(EDIT) create(@GetUser() u: U, @Body() b: any) { return this.stores.create(u, b ?? {}); }

  // ─── store ───
  @Get(':id') @RequirePermissions(VIEW) get(@GetUser() u: U, @Param('id') id: string) { return this.stores.get(u, id); }
  @Patch(':id') @RequirePermissions(EDIT) update(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.update(u, id, b ?? {}); }
  @Post(':id/status') @HttpCode(200) @RequirePermissions(EDIT) status(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.setStatus(u, id, b ?? {}); }
  @Get(':id/home') @RequirePermissions(VIEW) home(@GetUser() u: U, @Param('id') id: string) { return this.stores.home(u, id); }
  @Post(':id/preview-token') @HttpCode(200) @RequirePermissions(VIEW) preview(@GetUser() u: U, @Param('id') id: string) { return this.stores.preview(u, id); }

  // ─── theme ───
  @Get(':id/theme') @RequirePermissions(VIEW) getTheme(@GetUser() u: U, @Param('id') id: string) { return this.theme.get(u, id); }
  @Put(':id/theme/draft') @RequirePermissions(EDIT) saveDraft(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.theme.saveDraft(u, id, b ?? {}); }
  @Post(':id/theme/publish') @HttpCode(200) @RequirePermissions(EDIT) publish(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.theme.publish(u, id, b ?? {}); }
  @Post(':id/theme/rollback') @HttpCode(200) @RequirePermissions(EDIT) rollback(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.theme.rollback(u, id, b ?? {}); }
  @Post(':id/theme/switch') @HttpCode(200) @RequirePermissions(EDIT) switchTheme(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.theme.switchTheme(u, id, b ?? {}); }

  // ─── pages ───
  @Get(':id/pages') @RequirePermissions(VIEW) pages(@GetUser() u: U, @Param('id') id: string) { return this.stores.pages(u, id); }
  @Post(':id/pages') @RequirePermissions(EDIT) createPage(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.createPage(u, id, b ?? {}); }
  @Get(':id/pages/:pageId') @RequirePermissions(VIEW) page(@GetUser() u: U, @Param('id') id: string, @Param('pageId') p: string) { return this.stores.page(u, id, p); }
  @Patch(':id/pages/:pageId') @RequirePermissions(EDIT) updatePage(@GetUser() u: U, @Param('id') id: string, @Param('pageId') p: string, @Body() b: any) { return this.stores.updatePage(u, id, p, b ?? {}); }
  @Delete(':id/pages/:pageId') @RequirePermissions(EDIT) archivePage(@GetUser() u: U, @Param('id') id: string, @Param('pageId') p: string) { return this.stores.archivePage(u, id, p); }

  // ─── menus ───
  @Get(':id/menus') @RequirePermissions(VIEW) menus(@GetUser() u: U, @Param('id') id: string) { return this.stores.menus(u, id); }
  @Put(':id/menus/:handle') @RequirePermissions(EDIT) saveMenu(@GetUser() u: U, @Param('id') id: string, @Param('handle') h: string, @Body() b: any) { return this.stores.saveMenu(u, id, h, b ?? {}); }
  @Delete(':id/menus/:handle') @RequirePermissions(EDIT) removeMenu(@GetUser() u: U, @Param('id') id: string, @Param('handle') h: string) { return this.stores.removeMenu(u, id, h); }

  // ─── blog ───
  @Get(':id/blog-posts') @RequirePermissions(VIEW) posts(@GetUser() u: U, @Param('id') id: string, @Query('blog') blog?: string) { return this.stores.posts(u, id, blog); }
  @Post(':id/blog-posts') @RequirePermissions(EDIT) createPost(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.createPost(u, id, b ?? {}); }
  @Get(':id/blog-posts/:postId') @RequirePermissions(VIEW) post(@GetUser() u: U, @Param('id') id: string, @Param('postId') p: string) { return this.stores.post(u, id, p); }
  @Patch(':id/blog-posts/:postId') @RequirePermissions(EDIT) updatePost(@GetUser() u: U, @Param('id') id: string, @Param('postId') p: string, @Body() b: any) { return this.stores.updatePost(u, id, p, b ?? {}); }
  @Delete(':id/blog-posts/:postId') @RequirePermissions(EDIT) archivePost(@GetUser() u: U, @Param('id') id: string, @Param('postId') p: string) { return this.stores.archivePost(u, id, p); }

  // ─── redirects ───
  @Get(':id/redirects') @RequirePermissions(VIEW) redirects(@GetUser() u: U, @Param('id') id: string, @Query() q: any) { return this.stores.redirects(u, id, q ?? {}); }
  @Post(':id/redirects') @RequirePermissions(EDIT) createRedirect(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.createRedirect(u, id, b ?? {}); }
  @Post(':id/redirects/bulk') @HttpCode(200) @RequirePermissions(EDIT) bulkRedirects(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.bulkRedirects(u, id, b ?? {}); }
  @Delete(':id/redirects/:redirectId') @RequirePermissions(EDIT) removeRedirect(@GetUser() u: U, @Param('id') id: string, @Param('redirectId') r: string) { return this.stores.removeRedirect(u, id, r); }

  // ─── policies ───
  @Get(':id/policies') @RequirePermissions(VIEW) policies(@GetUser() u: U, @Param('id') id: string) { return this.stores.policies(u, id); }
  @Put(':id/policies/:kind') @RequirePermissions(EDIT) savePolicy(@GetUser() u: U, @Param('id') id: string, @Param('kind') k: string, @Body() b: any) { return this.stores.savePolicy(u, id, k, b ?? {}); }

  // ─── collections ───
  @Get(':id/collections') @RequirePermissions(VIEW) collections(@GetUser() u: U, @Param('id') id: string) { return this.stores.collections(u, id); }
  @Post(':id/collections') @RequirePermissions(EDIT) createCollection(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.createCollection(u, id, b ?? {}); }
  @Post(':id/collections/reorder') @HttpCode(200) @RequirePermissions(EDIT) reorder(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.reorderCollections(u, id, b ?? {}); }
  @Post(':id/collections/preview-rules') @HttpCode(200) @RequirePermissions(VIEW) previewRules(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.previewRules(u, id, b ?? {}); }
  @Get(':id/collections/:cid') @RequirePermissions(VIEW) collection(@GetUser() u: U, @Param('id') id: string, @Param('cid') c: string) { return this.stores.collection(u, id, c); }
  @Patch(':id/collections/:cid') @RequirePermissions(EDIT) updateCollection(@GetUser() u: U, @Param('id') id: string, @Param('cid') c: string, @Body() b: any) { return this.stores.updateCollection(u, id, c, b ?? {}); }
  @Delete(':id/collections/:cid') @RequirePermissions(EDIT) archiveCollection(@GetUser() u: U, @Param('id') id: string, @Param('cid') c: string) { return this.stores.archiveCollection(u, id, c); }
  @Get(':id/collections/:cid/products') @RequirePermissions(VIEW) collectionProducts(@GetUser() u: U, @Param('id') id: string, @Param('cid') c: string, @Query() q: any) { return this.stores.collectionProducts(u, id, c, q ?? {}); }
  @Put(':id/collections/:cid/products') @RequirePermissions(EDIT) setCollectionProducts(@GetUser() u: U, @Param('id') id: string, @Param('cid') c: string, @Body() b: any) { return this.stores.setCollectionProducts(u, id, c, b ?? {}); }

  // ─── products on the website ───
  @Get(':id/products') @RequirePermissions(VIEW) products(@GetUser() u: U, @Param('id') id: string, @Query() q: any) { return this.stores.products(u, id, q ?? {}); }
  @Post(':id/products/bulk') @HttpCode(200) @RequirePermissions(EDIT) bulk(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.bulkProducts(u, id, b ?? {}); }
  @Get(':id/products/:productId') @RequirePermissions(VIEW) product(@GetUser() u: U, @Param('id') id: string, @Param('productId') p: string) { return this.stores.product(u, id, p); }
  @Patch(':id/products/:productId') @RequirePermissions(EDIT) updateProduct(@GetUser() u: U, @Param('id') id: string, @Param('productId') p: string, @Body() b: any) { return this.stores.updateProduct(u, id, p, b ?? {}); }

  // ─── domains ───
  @Get(':id/domains') @RequirePermissions(VIEW) domainList(@GetUser() u: U, @Param('id') id: string) { return this.domains.list(u, id); }
  @Post(':id/domains') @HttpCode(200) @RequirePermissions(EDIT) addDomain(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.domains.add(u, id, b ?? {}); }
  @Post(':id/domains/:domainId/verify') @HttpCode(200) @RequirePermissions(VIEW) verifyDomain(@GetUser() u: U, @Param('id') id: string, @Param('domainId') d: string) { return this.domains.verify(u, id, d); }
  @Post(':id/domains/:domainId/primary') @HttpCode(200) @RequirePermissions(EDIT) primary(@GetUser() u: U, @Param('id') id: string, @Param('domainId') d: string) { return this.domains.makePrimary(u, id, d); }
  @Delete(':id/domains/:domainId') @RequirePermissions(EDIT) removeDomain(@GetUser() u: U, @Param('id') id: string, @Param('domainId') d: string) { return this.domains.remove(u, id, d); }

  // ─── shipping, checkout, payments ───
  @Get(':id/shipping') @RequirePermissions(VIEW) shipping(@GetUser() u: U, @Param('id') id: string) { return this.stores.shipping(u, id); }
  @Put(':id/shipping') @RequirePermissions(EDIT) saveShipping(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.saveShipping(u, id, b ?? {}); }
  @Get(':id/checkout') @RequirePermissions(VIEW) checkout(@GetUser() u: U, @Param('id') id: string) { return this.stores.checkout(u, id); }
  @Patch(':id/checkout') @RequirePermissions(EDIT) saveCheckout(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.saveCheckout(u, id, b ?? {}); }
  @Get(':id/payments') @RequirePermissions(VIEW) payments(@GetUser() u: U, @Param('id') id: string) { return this.stores.paymentStatus(u, id); }

  // ─── coupons ───
  @Get(':id/coupons') @RequirePermissions(VIEW) coupons(@GetUser() u: U, @Param('id') id: string) { return this.stores.coupons(u, id); }
  @Put(':id/coupons') @RequirePermissions(EDIT) saveCoupons(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.stores.saveCoupons(u, id, b ?? {}); }

  // ─── analytics, customers ───
  @Get(':id/analytics') @RequirePermissions(VIEW) report(@GetUser() u: U, @Param('id') id: string, @Query('days') days?: string) { return this.analytics.report(u, id, days); }
  @Get(':id/customers') @RequirePermissions(VIEW) customers(@GetUser() u: U, @Param('id') id: string, @Query() q: any) { return this.stores.customers(u, id, q ?? {}); }

  // ─── Shopify migration ───
  @Get(':id/migrate/shopify') @RequirePermissions(VIEW) migrateInfo(@GetUser() u: U, @Param('id') id: string) { return this.shopify.info(u, id); }
  @Get(':id/migrate/shopify/status') @RequirePermissions(VIEW) migrateStatus(@GetUser() u: U, @Param('id') id: string) { return this.shopify.status(u, id); }
  @Post(':id/migrate/shopify') @HttpCode(200) @RequirePermissions(EDIT) migrate(@GetUser() u: U, @Param('id') id: string, @Body() b: any) { return this.shopify.start(u, id, b ?? {}); }
}
