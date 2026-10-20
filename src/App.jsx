import React from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Intro from './components/intro/Intro'

import Home from './pages/Home'
import About from './pages/About'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Login from './pages/Login'
import Register from './pages/Register'
import Checkout from './pages/Checkout'
import Order from './pages/Order'
import Admin from './pages/Admin'
import Contact from './pages/Contact'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow pt-4 pb-12"><Outlet /></main>
          <Footer />
        </div>
      </AuthProvider>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'products', element: <Products /> },
      { path: 'products/:slug', element: <ProductDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'order', element: <Order /> },
      { path: 'admin', element: <Admin /> },
      { path: 'contact', element: <Contact /> },
    ],
  },
  {
    path: '/intro',
    element: <Intro onFinish={() => {}} />,
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
