import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Shell from '@/layout/Shell';
import { ProtectedRoute } from './ProtectedRoute';
import { Loader2 } from 'lucide-react';

const PageLoader = () => (
  <div className="flex items-center justify-center h-96">
    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
  </div>
);

// ─── Auth pages ───
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const VerifyOtpPage = lazy(() => import('@/features/auth/pages/VerifyOtpPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const GoogleSuccessPage = lazy(() => import('@/features/auth/pages/GoogleSuccessPage'));
const GoogleErrorPage = lazy(() => import('@/features/auth/pages/GoogleErrorPage'));

// ─── Main pages ───
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const SearchPage = lazy(() => import('@/features/products/pages/SearchPage'));
const ShopsListPage = lazy(() => import('@/features/shops/pages/ShopsListPage'));
const ShopDetailPage = lazy(() => import('@/features/shops/pages/ShopDetailPage'));
const ProductDetailPage = lazy(() => import('@/features/products/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/features/cart/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/features/checkout/pages/CheckoutPage'));
const PaymentResultPage = lazy(() => import('@/features/checkout/pages/PaymentResultPage'));
const OrdersListPage = lazy(() => import('@/features/orders/pages/OrdersListPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/pages/OrderDetailPage'));

// ─── Profile ───
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('@/features/profile/pages/ProfileEditPage'));
const SecurityPage = lazy(() => import('@/features/profile/pages/SecurityPage'));
const AddressesPage = lazy(() => import('@/features/profile/pages/AddressesPage'));
const WalletPage = lazy(() => import('@/features/profile/pages/WalletPage'));
const WalletTopUpPage = lazy(() => import('@/features/profile/pages/WalletTopUpPage'));
const ReferralsPage = lazy(() => import('@/features/profile/pages/ReferralsPage'));
const SavedCardsPage = lazy(() => import('@/features/profile/pages/SavedCardsPage'));
const DataExportPage = lazy(() => import('@/features/profile/pages/DataExportPage'));
const NotificationPreferencesPage = lazy(() => import('@/features/notifications/pages/NotificationPreferencesPage'));
const MyReviewsPage = lazy(() => import('@/features/profile/pages/MyReviewsPage'));

// ─── Features ───
const WishlistPage = lazy(() => import('@/features/wishlist/pages/WishlistPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const SupportPage = lazy(() => import('@/features/support/pages/SupportPage'));
const BargainListPage = lazy(() => import('@/features/bargain/pages/BargainListPage'));
const BargainDetailPage = lazy(() => import('@/features/bargain/pages/BargainDetailPage'));
const GroupBuyListPage = lazy(() => import('@/features/group-buy/pages/GroupBuyListPage'));
const GroupBuyDetailPage = lazy(() => import('@/features/group-buy/pages/GroupBuyDetailPage'));
const AuctionListPage = lazy(() => import('@/features/auction/pages/AuctionListPage'));
const AuctionDetailPage = lazy(() => import('@/features/auction/pages/AuctionDetailPage'));
const LiveShopListPage = lazy(() => import('@/features/live-shop/pages/LiveShopListPage'));
const LiveShopDetailPage = lazy(() => import('@/features/live-shop/pages/LiveShopDetailPage'));
const AiAssistantPage = lazy(() => import('@/features/ai-assistant/pages/AiAssistantPage'));
const SplitPaymentPublicPage = lazy(() => import('@/features/split-payment/pages/SplitPaymentPublicPage'));
const PrayerModePage = lazy(() => import('@/features/prayer-mode/pages/PrayerModePage'));
const ComparePage = lazy(() => import('@/features/compare/pages/ComparePage'));
const ShopChatListPage = lazy(() => import('@/features/shop-chat/pages/ShopChatListPage'));
const ShopChatPage = lazy(() => import('@/features/shop-chat/pages/ShopChatPage'));

// ─── Legal ───
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'));
const AboutPage = lazy(() => import('@/pages/legal/AboutPage'));

// ─── Extras ───
const ScheduledOrdersPage = lazy(() => import('@/features/scheduled-orders/pages/ScheduledOrdersPage'));
const SubscriptionsListPage = lazy(() => import('@/features/subscriptions/pages/SubscriptionsListPage'));
const B2BPortalPage = lazy(() => import('@/features/b2b/pages/B2BPortalPage'));
const SustainabilityPage = lazy(() => import('@/features/sustainability/pages/SustainabilityPage'));
const WelcomeFlowPage = lazy(() => import('@/features/onboarding/pages/WelcomeFlowPage'));
const BundleDetailPage = lazy(() => import('@/features/bundles/pages/BundleDetailPage'));
const CategoryPage = lazy(() => import('@/features/categories/pages/CategoryPage'));
const AchievementsPage = lazy(() => import('@/features/achievements/pages/AchievementsPage'));
const FollowedShopsPage = lazy(() => import('@/features/followed-shops/pages/FollowedShopsPage'));
const RecentlyViewedPage = lazy(() => import('@/features/recently-viewed/pages/RecentlyViewedPage'));
const ReturnDetailPage = lazy(() => import('@/features/returns/pages/ReturnDetailPage'));
const BecomeSellerPage = lazy(() => import('@/pages/BecomeSellerPage'));
const LoyaltyPage = lazy(() => import('@/features/loyalty/pages/LoyaltyPage'));
const DealsPage = lazy(() => import('@/features/deals/pages/DealsPage'));
const GiftCardsPage = lazy(() => import('@/features/gift-cards/pages/GiftCardsPage'));

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ─── Auth (public) ─── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/google/success" element={<GoogleSuccessPage />} />
        <Route path="/auth/google/error" element={<GoogleErrorPage />} />
        <Route path="/auth/google/callback" element={<GoogleSuccessPage />} />

        <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />

        {/* ─── Public standalone ─── */}
        <Route path="/split/:token" element={<SplitPaymentPublicPage />} />
        <Route path="/orders/:orderId/payment-result" element={<PaymentResultPage />} />
        <Route path="/welcome" element={<WelcomeFlowPage />} />

        {/* ─── Main app (Shell layout) ─── */}
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/shops" element={<ShopsListPage />} />
          <Route path="/shops/:slugOrId" element={<ShopDetailPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/bundles/:id" element={<BundleDetailPage />} />

          {/* Discovery */}
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/group-buys" element={<GroupBuyListPage />} />
          <Route path="/group-buys/:id" element={<GroupBuyDetailPage />} />
          <Route path="/auctions" element={<AuctionListPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="/live" element={<LiveShopListPage />} />
          <Route path="/live/:id" element={<LiveShopDetailPage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/b2b" element={<B2BPortalPage />} />
          <Route path="/sell" element={<BecomeSellerPage />} />

          {/* Legal */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Protected — Cart & Checkout */}
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />

          {/* Protected — Orders */}
          <Route path="/orders" element={<ProtectedRoute><OrdersListPage /></ProtectedRoute>} />
          <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="/returns/:returnId" element={<ProtectedRoute><ReturnDetailPage /></ProtectedRoute>} />

          {/* Protected — Profile */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
          <Route path="/profile/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
          <Route path="/profile/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
          <Route path="/profile/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
          <Route path="/profile/wallet/top-up" element={<ProtectedRoute><WalletTopUpPage /></ProtectedRoute>} />
          <Route path="/profile/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
          <Route path="/profile/cards" element={<ProtectedRoute><SavedCardsPage /></ProtectedRoute>} />
          <Route path="/profile/data-export" element={<ProtectedRoute><DataExportPage /></ProtectedRoute>} />
          <Route path="/profile/notifications" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
          <Route path="/profile/prayer-mode" element={<ProtectedRoute><PrayerModePage /></ProtectedRoute>} />
          <Route path="/profile/followed-shops" element={<ProtectedRoute><FollowedShopsPage /></ProtectedRoute>} />
          <Route path="/profile/recently-viewed" element={<ProtectedRoute><RecentlyViewedPage /></ProtectedRoute>} />
          <Route path="/profile/loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
          <Route path="/profile/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
          <Route path="/profile/scheduled-orders" element={<ProtectedRoute><ScheduledOrdersPage /></ProtectedRoute>} />
          <Route path="/profile/subscriptions" element={<ProtectedRoute><SubscriptionsListPage /></ProtectedRoute>} />
          <Route path="/profile/sustainability" element={<ProtectedRoute><SustainabilityPage /></ProtectedRoute>} />
          <Route path="/profile/reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />

          {/* Protected — Others */}
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/bargain" element={<ProtectedRoute><BargainListPage /></ProtectedRoute>} />
          <Route path="/bargain/:id" element={<ProtectedRoute><BargainDetailPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><ShopChatListPage /></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><ShopChatPage /></ProtectedRoute>} />
          <Route path="/gift-cards" element={<ProtectedRoute><GiftCardsPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
