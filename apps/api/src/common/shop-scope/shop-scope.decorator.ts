import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { ShopScope } from './shop-scope.types';
import { SHOP_SCOPE_REQUEST_KEY } from './shop-scope.constants';

/**
 * Injects the request's resolved {@link ShopScope}.
 *
 * The heavy lifting (role locking, tenant validation) happens once in
 * ShopScopeInterceptor; this just hands the result to the controller.
 */
export const CurrentShop = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ShopScope => {
    const request = ctx.switchToHttp().getRequest();
    return request[SHOP_SCOPE_REQUEST_KEY] ?? new ShopScope(null, true);
  },
);
