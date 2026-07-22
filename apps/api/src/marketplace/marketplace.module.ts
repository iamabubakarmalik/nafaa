import { Module } from '@nestjs/common';
import { MarketplaceAuthModule } from './auth/auth.module';
import { MarketplaceHomeModule } from './home/home.module';
import { MarketplaceShopsModule } from './shops/shops.module';
import { MarketplaceProductsModule } from './products/products.module';
import { MarketplaceCartModule } from './cart/cart.module';
import { MarketplaceCheckoutModule } from './checkout/checkout.module';
import { MarketplaceOrdersModule } from './orders/orders.module';
import { MarketplaceProfileModule } from './profile/profile.module';
import { MarketplaceWishlistModule } from './wishlist/wishlist.module';
import { MarketplaceReviewsModule } from './reviews/reviews.module';
import { MarketplaceNotificationsModule } from './notifications/notifications.module';
import { MarketplaceSupportModule } from './support/support.module';

@Module({
  imports: [
    MarketplaceAuthModule,
    MarketplaceHomeModule,
    MarketplaceShopsModule,
    MarketplaceProductsModule,
    MarketplaceCartModule,
    MarketplaceCheckoutModule,
    MarketplaceOrdersModule,
    MarketplaceProfileModule,
    MarketplaceWishlistModule,
    MarketplaceReviewsModule,
    MarketplaceNotificationsModule,
    MarketplaceSupportModule,
  ],
})
export class MarketplaceModule {}
