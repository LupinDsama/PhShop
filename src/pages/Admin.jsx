import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createRealtimeClient } from '../lib/realtime'
import api from '../lib/api'
import DashboardTab from './admin/DashboardTab'
import OrdersTab from './admin/OrdersTab'
import ProductsTab from './admin/ProductsTab'
import UsersTab from './admin/UsersTab'
import { AuditTab, CouponsTab } from './admin/SystemTabs'
import { ReviewsTab, MessagesTab } from './admin/ContentTabs'
import { Package, Truck, Settings, Users, Clock, ChevronDown, Radio, WifiOff, ScrollText, Ticket, Star, MessageSquare } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const TABS = [
  { key: 'dashboard', label: 'Tổng quan', icon: <Clock className="w-4 h-4" /> },
  { key: 'orders', label: 'Đơn hàng', icon: <Truck className="w-4 h-4" /> },
  { key: 'products', label: 'Sản phẩm', icon: <Package className="w-4 h-4" /> },
  { key: 'users', label: 'Khách hàng', icon: <Users className="w-4 h-4" /> },
  { key: 'coupons', label: 'Mã giảm giá', icon: <Ticket className="w-4 h-4" /> },
  { key: 'reviews', label: 'Đánh giá', icon: <Star className="w-4 h-4" /> },
  { key: 'messages', label: 'Tin nhắn', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'audit', label: 'Nhật ký', icon: <ScrollText className="w-4 h-4" /> },
]

export default function Admin() {
  const { user, isSuperAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [live, setLive] = useState('connecting')
  const [messages, setMessages] = useState([])
  const [settings, setSettings] = useState({ shopName: 'PhShop', supportEmail: 'support@phshop.example', region: 'VN' })
  const [settingsMsg, setSettingsMsg] = useState(null)

  useEffect(() => {
    api.get('/api/admin/settings').then((d) => {
      if (d?.settings) setSettings((s) => ({ ...s, ...d.settings }))
    }).catch(() => {})
  }, [])

  // Realtime: admin nhận thông báo khi có đơn mới / trạng thái đơn đổi
  useEffect(() => {
    const client = createRealtimeClient({
      onStatus: ({ status }) => setLive(status),
      onEvent: (payload) => {
        if (payload?.type === 'order.created') {
          setMessages((m) => [`Đơn hàng mới ${payload.orderId} — ${payload.total?.toLocaleString('vi-VN')} đ`, ...m].slice(0, 5))
        }
      },
      pollFn: async () => {},
    })
    return () => client.stop()
  }, [])

  const saveSettings = async (e) => {
    e.preventDefault()
    setSettingsMsg(null)
    try {
      await api.put('/api/admin/settings', settings)
      setSettingsMsg({ type: 'success', text: 'Đã lưu cấu hình.' })
    } catch (err) {
      setSettingsMsg({ type: 'error', text: err.message })
    }
  }

  const liveBadge = live === 'connected' ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
      <Radio size={12} className="animate-pulse" /> Realtime đang bật
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      <WifiOff size={12} /> Realtime đang kết nối lại
    </span>
  )

  return (
    <div className="section">
      <div className="container-page">
        <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-dark-900">Bảng điều khiển Admin</h2>
            <p className="text-dark-500">Quản lý cửa hàng mô hình in 3D · {user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {liveBadge}
            <Button asChild>
              <Link to="/products">Xem cửa hàng <ChevronDown size={18} className="rotate-[-90deg]" /></Link>
            </Button>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="mb-6 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className="px-4 py-2 rounded-xl bg-brand-50 text-brand-700 text-sm">{m}</div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-8 border-b border-dark-100 pb-4 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-brand-50 text-brand-600 shadow-sm border-brand-100'
                  : 'text-dark-500 hover:text-dark-700 hover:bg-dark-50'
              }`}
            >
              {t.icon} <span className="ml-2">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'audit' && <AuditTab />}

        {isSuperAdmin && (
          <Card className="p-6 mt-8">
            <h3 className="font-bold text-dark-900 mb-6 flex items-center gap-2">
              <Settings size={18} className="text-brand-600" /> Cấu hình hệ thống
            </h3>
            {settingsMsg && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${settingsMsg.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>
                {settingsMsg.text}
              </div>
            )}
            <form onSubmit={saveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-dark-700">Tên cửa hàng</label>
                <Input value={settings.shopName} onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-dark-700">Email hỗ trợ</label>
                <Input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-dark-700">Mã khu vực</label>
                <Input value={settings.region} onChange={(e) => setSettings({ ...settings, region: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Button type="submit">Lưu cấu hình</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
