import { Route, Routes } from 'react-router-dom';
import MarketplaceShell from '../layout/MarketplaceShell';
import { CustomerProtectedRoute } from './CustomerProtectedRoute';

// Placeholder pages — these will be built out feature by feature.
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 text-center">
    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{title}</h2>
    <p className="text-slate-500">Coming soon — is section pe kaam ho raha hai.</p>
  </div>
);

export function MarketplaceRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Placeholder title="Customer Login" />} />
      <Route path="/register" element={<Placeholder title="Customer Register" />} />
      <Route path="/verify-otp" element={<Placeholder title="Verify OTP" />} />

      {/* Marketplace shell (bottom nav) — some public, some protected */}
      <Route element={<MarketplaceShell />}>
        <Route index element={<Placeholder title="🛍️ Marketplace Home" />} />
        <Route path="search" element={<Placeholder title="🔍 Search Products" />} />
        <Route path="shops" element={<Placeholder title="🏪 Nearby Shops" />} />
        <Route path="shops/:slug" element={<Placeholder title="🏪 Shop Storefront" />} />
        <Route path="products/:id" element={<Placeholder title="📦 Product Detail" />} />
        <Route path="cart" element={<Placeholder title="🛒 Cart" />} />

        {/* Protected — require customer login */}
        <Route element={<CustomerProtectedRoute />}>
          <Route path="checkout" element={<Placeholder title="💳 Checkout" />} />
          <Route path="orders" element={<Placeholder title="📦 My Orders" />} />
          <Route path="orders/:id" element={<Placeholder title="📦 Order Detail" />} />
          <Route path="profile" element={<Placeholder title="👤 Profile" />} />
          <Route path="profile/addresses" element={<Placeholder title="📍 Addresses" />} />
          <Route path="wishlist" element={<Placeholder title="❤️ Wishlist" />} />
          <Route path="notifications" element={<Placeholder title="🔔 Notifications" />} />
          <Route path="support" element={<Placeholder title="💬 Support" />} />
        </Route>
      </Route>
    </Routes>
  );
}
