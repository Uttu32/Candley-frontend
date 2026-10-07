/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { lazy, Suspense, type ComponentType } from 'react'
import { CandleLoader } from '../components/common/CandleLoader'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { RouteError } from '../components/common/Feedback'
import { adminRoles } from '../types'
import { StorefrontLayout } from '../layouts/StorefrontLayout'
import { HomePage } from '../pages/HomePage'

/** Lazily loads a named export so each page becomes its own chunk. */
const page = <T, K extends keyof T>(loader: () => Promise<T>, name: K) =>
  lazy(() => loader().then((module) => ({ default: module[name] as unknown as ComponentType })))

const ShopPage = page(() => import('../pages/ShopPage'), 'ShopPage')
const ProductPage = page(() => import('../pages/ProductPage'), 'ProductPage')
const CartPage = page(() => import('../pages/CartPage'), 'CartPage')
const CheckoutPage = page(() => import('../pages/CheckoutPage'), 'CheckoutPage')
const LoginPage = page(() => import('../pages/LoginPage'), 'LoginPage')
const RegisterPage = page(() => import('../pages/RegisterPage'), 'RegisterPage')
const ForgotPasswordPage = page(() => import('../pages/PasswordPages'), 'ForgotPasswordPage')
const ResetPasswordPage = page(() => import('../pages/PasswordPages'), 'ResetPasswordPage')
const NotFoundPage = page(() => import('../pages/NotFoundPage'), 'NotFoundPage')
const AboutPage = lazy(() => import('../pages/AboutPage'))
const AccountLayout = page(() => import('../pages/account/AccountLayout'), 'AccountLayout')
const ProfilePage = page(() => import('../pages/account/AccountPages'), 'ProfilePage')
const AddressesPage = page(() => import('../pages/account/AccountPages'), 'AddressesPage')
const WishlistPage = page(() => import('../pages/account/AccountPages'), 'WishlistPage')
const PasswordSettingsPage = page(() => import('../pages/account/AccountPages'), 'PasswordSettingsPage')
const OrdersPage = page(() => import('../pages/account/OrderPages'), 'OrdersPage')
const OrderDetailPage = page(() => import('../pages/account/OrderPages'), 'OrderDetailPage')
const AdminLayout = page(() => import('../layouts/AdminLayout'), 'AdminLayout')
const AdminDashboardPage = page(() => import('../pages/admin/AdminDashboardPage'), 'AdminDashboardPage')
const AdminProductsPage = page(() => import('../pages/admin/AdminProductsPage'), 'AdminProductsPage')
const AdminProductEditorPage = page(() => import('../pages/admin/AdminProductEditorPage'), 'AdminProductEditorPage')
const AdminHeroPage = page(() => import('../pages/admin/AdminHeroPage'), 'AdminHeroPage')
const AdminOrdersPage = page(() => import('../pages/admin/AdminOrdersPage'), 'AdminOrdersPage')
const AdminOrderDetailPage = page(() => import('../pages/admin/AdminOrdersPage'), 'AdminOrderDetailPage')
const AdminInventoryPage = page(() => import('../pages/admin/AdminCatalogPages'), 'AdminInventoryPage')
const AdminCategoriesPage = page(() => import('../pages/admin/AdminCatalogPages'), 'AdminCategoriesPage')
const AdminCustomersPage = page(() => import('../pages/admin/AdminCatalogPages'), 'AdminCustomersPage')
const AdminCouponsPage = page(() => import('../pages/admin/AdminSettingsPages'), 'AdminCouponsPage')
const AdminSettingsPage = page(() => import('../pages/admin/AdminSettingsPages'), 'AdminSettingsPage')

const Lazy = () => (
  <Suspense fallback={<CandleLoader />}>
    <Outlet />
  </Suspense>
)

export const routes: RouteObject[] = [
  {
    element: <Lazy />,
    errorElement: <RouteError />,
    children: [
      {
        element: <StorefrontLayout />,
        errorElement: <RouteError />,
        children: [
          {
            element: <Lazy />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/shop', element: <ShopPage /> },
              { path: '/search', element: <ShopPage /> },
              { path: '/candles', element: <ShopPage /> },
              { path: '/diffusers', element: <ShopPage /> },
              { path: '/room-sprays', element: <ShopPage /> },
              { path: '/gift-sets', element: <ShopPage /> },
              { path: '/category/:slug', element: <ShopPage /> },
              { path: '/collection/:slug', element: <ShopPage /> },
              { path: '/product/:slug', element: <ProductPage /> },
              { path: '/about', element: <AboutPage /> },
              { path: '/cart', element: <CartPage /> },
              { path: '/login', element: <LoginPage /> },
              { path: '/register', element: <RegisterPage /> },
              { path: '/forgot-password', element: <ForgotPasswordPage /> },
              { path: '/reset-password', element: <ResetPasswordPage /> },
              {
                element: <ProtectedRoute />,
                children: [
                  { path: '/checkout', element: <CheckoutPage /> },
                  {
                    path: '/account',
                    element: <AccountLayout />,
                    children: [
                      { index: true, element: <ProfilePage /> },
                      { path: 'orders', element: <OrdersPage /> },
                      { path: 'orders/:id', element: <OrderDetailPage /> },
                      { path: 'addresses', element: <AddressesPage /> },
                      { path: 'wishlist', element: <WishlistPage /> },
                      { path: 'settings', element: <PasswordSettingsPage /> },
                    ],
                  },
                ],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
      // Admins use the shared login; the old URL keeps working.
      { path: '/admin/login', element: <Navigate to="/login?next=/admin/dashboard" replace /> },
      {
        element: <ProtectedRoute allowedRoles={adminRoles} />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            errorElement: <RouteError />,
            children: [
              { index: true, element: <Navigate to="/admin/dashboard" replace /> },
              { path: 'dashboard', element: <AdminDashboardPage /> },
              { path: 'orders', element: <AdminOrdersPage /> },
              { path: 'orders/:id', element: <AdminOrderDetailPage /> },
              { path: 'products', element: <AdminProductsPage /> },
              { path: 'products/new', element: <AdminProductEditorPage /> },
              { path: 'products/:id/edit', element: <AdminProductEditorPage /> },
              { path: 'inventory', element: <AdminInventoryPage /> },
              { path: 'categories', element: <AdminCategoriesPage /> },
              { path: 'cms/hero', element: <AdminHeroPage /> },
              { path: 'customers', element: <AdminCustomersPage /> },
              { path: 'coupons', element: <AdminCouponsPage /> },
              { path: 'settings', element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
