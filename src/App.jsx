import React from 'react'
import { createBrowserRouter, Outlet, RouterProvider, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Intro from './components/intro/Intro'

import Home from './pages/Home'
import About from './pages/About'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Wishlist from './pages/Wishlist'
import Login from './pages/Login'
import Register from './pages/Register'
import Checkout from './pages/Checkout'
import Order from './pages/Order'
import Contact from './pages/Contact'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

// Tách lazy để giảm bundle ban đầu (admin chỉ tải khi vào /admin)
const Admin = React.lazy(() => import('./pages/Admin'))

function ScrollToTop({ children }) {
  const location = useLocation()
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])
  return children
}

function FullPageLoader() {
  return (
    <div className="section flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3 text-dark-500">
        <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm">Đang tải dữ liệu...</p>
      </div>
    </div>
  )
}

/** Chặn trang yêu cầu đăng nhập. */
function RequireAuth({ children }) {
  const { isAuthenticated, isReady } = useAuth()
  const location = useLocation()
  if (!isReady) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

/** Chặn trang quản trị — quyền được kiểm tra lại ở backend. */
function RequireAdmin({ children }) {
  const { isAdmin, isReady } = useAuth()
  if (!isReady) return <FullPageLoader />
  if (!isAdmin) {
    return (
      <div className="section flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl border border-dark-100 shadow-sm p-12">
          <h2 className="text-2xl font-bold text-dark-900 mb-2">Bạn không có quyền truy cập</h2>
          <p className="text-dark-500 mb-6">Chỉ quản trị mới có thể vào trang quản trị.</p>
          <a href="/" className="text-brand-600 font-medium hover:underline">Về trang chủ</a>
        </div>
      </div>
    )
  }
  return children
}

function Layout() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-4 pb-12">
          <ScrollToTop>
            <Outlet />
          </ScrollToTop>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'products', element: <Products /> },
      { path: 'products/:slug', element: <ProductDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'wishlist', element: <Wishlist /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'checkout', element: <RequireAuth><Checkout /></RequireAuth> },
      { path: 'order', element: <RequireAuth><Order /></RequireAuth> },
      { path: 'order/:orderId', element: <RequireAuth><Order /></RequireAuth> },
      { path: 'admin', element: <RequireAdmin><React.Suspense fallback={<FullPageLoader />}><Admin /></React.Suspense></RequireAdmin> },
      { path: 'contact', element: <Contact /> },
      { path: 'profile', element: <RequireAuth><Profile /></RequireAuth> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  const [showIntro, setShowIntro] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      if (!sessionStorage.getItem('phshop-intro-seen')) {
        sessionStorage.setItem('phshop-intro-seen', '1')
        setShowIntro(true)
      }
    }
  }, [])

  if (showIntro) return <Intro onFinish={() => setShowIntro(false)} />
  return <RouterProvider router={router} />
}
