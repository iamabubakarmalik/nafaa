import { Route, Routes } from 'react-router-dom';
import MarketplaceShell from '@layout/MarketplaceShell';
import { CustomerProtectedRoute } from './CustomerProtectedRoute';

import { HomePage } from '@features/home';
import { MarketLoginPage, MarketRegisterPage, VerifyOtpPage, GoogleSuccessPage, GoogleErrorPage } from '@features/auth';
import { CartPage } from '@features/cart';
import { CheckoutPage } from '@features/checkout';
import { OrdersListPage, OrderDetailPage } from '@features/orders';
import { ProductDetailPage } from '@features/products';
import { ProfilePage } from '@features/profile';
import AddressesPage from '@features/profile/pages/AddressesPage';
import { ShopsListPage, ShopDetailPage } from '@features/shops';
import { SearchPage } from '@features/search';
import { WishlistPage } from '@features/wishlist';
import { NotificationsPage } from '@features/notifications';
import { SupportPage } from '@features/support';
import { BargainListPage, BargainChatPage } from '@features/bargain';
import { GroupBuyListPage, GroupBuyDetailPage } from '@features/group-buy';
import { AuctionListPage, AuctionDetailPage } from '@features/auction';
import { LiveShopListPage, LiveShopDetailPage } from '@features/live-shop';

const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 text-center">
    <div className="text-6xl mb-4">🚧</div>
    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h2>
    <p className="text-slate-500">Coming soon</p>
  </div>
);

export function MarketplaceRouter() {
  return (
    <Routes>
      {/* ─── Fullscreen auth routes (no shell) ─── */}
      <Route path="/login" element={<MarketLoginPage />} />
      <Route path="/register" element={<MarketRegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/auth/google/success" element={<GoogleSuccessPage />} />
      <Route path="/auth/google/error" element={<GoogleErrorPage />} />

      {/* ─── Main shell with bottom nav ─── */}
      <Route element={<MarketplaceShell />}>
        {/* PUBLIC — no login required */}
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="shops" element={<ShopsListPage />} />
        <Route path="shops/:slug" element={<ShopDetailPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="group-buys" element={<GroupBuyListPage />} />
        <Route path="group-buys/:id" element={<GroupBuyDetailPage />} />
        <Route path="auctions" element={<AuctionListPage />} />
        <Route path="auctions/:id" element={<AuctionDetailPage />} />
        <Route path="live" element={<LiveShopListPage />} />
        <Route path="live/:id" element={<LiveShopDetailPage />} />

        {/* PROTECTED — login required */}
        <Route element={<CustomerProtectedRoute />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/addresses" element={<AddressesPage />} />
          <Route path="profile/reviews" element={<Placeholder title="⭐ My Reviews" />} />
          <Route path="profile/referrals" element={<Placeholder title="🎁 Referrals" />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="bargains" element={<BargainListPage />} />
          <Route path="bargains/:id" element={<BargainChatPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
