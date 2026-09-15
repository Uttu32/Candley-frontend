/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { HomePage } from '../pages/HomePage'
import { ShopPage } from '../pages/ShopPage'
import { ProductPage } from '../pages/ProductPage'
import { CartPage } from '../pages/CartPage'
import { CheckoutPage } from '../pages/CheckoutPage'
import { AccountPage } from '../pages/AccountPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminProductsPage } from '../pages/admin/AdminProductsPage'
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage'
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage'
import { AdminCouponsPage } from '../pages/admin/AdminCouponsPage'
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { CandleLoader } from '../components/common/CandleLoader'
import { ProtectedRoute } from '../components/common/ProtectedRoute'

const StorefrontLayout = lazy(() => import('../layouts/StorefrontLayout').then((mod) => ({ default: mod.StorefrontLayout })))
const AdminLayout = lazy(() => import('../layouts/AdminLayout').then((mod) => ({ default: mod.AdminLayout })))
const AboutPage = lazy(() => import('../pages/AboutPage'))

const AppShell = () => (
  <Suspense fallback={<CandleLoader />}>
    <Outlet />
  </Suspense>
)

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        element: <StorefrontLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/shop', element: <ShopPage /> },
          { path: '/about', element: <AboutPage /> },
          { path: '/candles', element: <ShopPage /> },
          { path: '/diffusers', element: <ShopPage /> },
          { path: '/room-sprays', element: <ShopPage /> },
          { path: '/gift-sets', element: <ShopPage /> },
          { path: '/category/:slug', element: <ShopPage /> },
          { path: '/collection/:slug', element: <ShopPage /> },
          { path: '/product/:slug', element: <ProductPage /> },
          { path: '/search', element: <ShopPage /> },
          { path: '/cart', element: <CartPage /> },
          { path: '/checkout', element: <CheckoutPage /> },
          { path: '/account', element: <AccountPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/account/orders', element: <AccountPage /> },
          { path: '/account/wishlist', element: <AccountPage /> },
          { path: '/account/settings', element: <AccountPage /> },
        ],
      },
      { path: '/admin/login', element: <AdminLoginPage /> },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} redirectTo="/admin/login" />,
        children: [
          {
            element: <AdminLayout />,
            path: '/admin',
            children: [
              { index: true, element: <Navigate to="/admin/dashboard" replace /> },
              { path: 'dashboard', element: <AdminDashboardPage /> },
              { path: 'products', element: <AdminProductsPage /> },
              { path: 'orders', element: <AdminOrdersPage /> },
              { path: 'customers', element: <AdminCustomersPage /> },
              { path: 'coupons', element: <AdminCouponsPage /> },
              { path: 'settings', element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
