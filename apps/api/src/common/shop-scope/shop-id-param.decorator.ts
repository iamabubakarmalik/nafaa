import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { SHOP_SCOPE_REQUEST_KEY } from './shop-scope.constants';
import { ALL_SHOPS, ShopScope } from './shop-scope.types';

/**
 * Drop-in replacement for `@Query('shopId')` on endpoints that already filter
 * by a branch id.
 *
 * An explicit `?shopId=` still wins — report drill-downs pass one deliberately.
 * Otherwise it falls back to the branch the user is currently viewing, which is
 * what makes those older endpoints follow the shop switcher.
 *
 * Why a decorator rather than rewriting `req.query` in the interceptor: the
 * global ValidationPipe runs with `forbidNonWhitelisted`, so an injected
 * `shopId` on a route whose query DTO has no such field fails the whole request
 * with "property shopId should not exist". Reading it here touches nothing the
 * pipe validates.
 *
 * Returns `undefined` for the consolidated "All Shops" view, so callers keep
 * their existing `shopId ? { shopId } : {}` logic unchanged.
 */
export const ShopIdParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();

    const raw = request?.query?.shopId;
    const explicit = Array.isArray(raw) ? raw[0] : raw;
    if (typeof explicit === 'string' && explicit.trim() && explicit !== ALL_SHOPS) {
      return explicit.trim();
    }

    const scope: ShopScope | undefined = request?.[SHOP_SCOPE_REQUEST_KEY];
    return scope?.shopId ?? undefined;
  },
);
