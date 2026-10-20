import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../lib/format'
import { Users, AlertCircle, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'

const ROLES = ['CUSTOMER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']

export default function UsersTab() {
  const { isSuperAdmin, user: currentUser } = useAuth()
  const [data, setData] = useState({ users: [], total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('ADMIN')
  const [inviteToken, setInviteToken] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: '1', limit: '20' })
      if (search.trim()) params.set('q', search.trim())
      const result = await api.get(`/api/admin/users?${params.toString()}`)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const changeRole = async (target, role) => {
    setMessage(null)
    try {
      await api.patch(`/api/admin/users/${target.id}/role`, { role })
      setMessage({ type: 'success', text: `Đã đổi vai trò của ${target.email} thành ${role}.` })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const toggleStatus = async (target) => {
    setMessage(null)
    try {
      const next = target.status === 'active' ? 'disabled' : 'active'
      await api.post(`/api/admin/users/${target.id}/status`, { status: next })
      setMessage({ type: 'success', text: `Đã ${next === 'active' ? 'kích hoạt' : 'vô hiệu hoá'} tài khoản.` })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const createInvitation = async (e) => {
    e.preventDefault()
    setMessage(null)
    try {
      const result = await api.post('/api/admin/invitations', { email: inviteEmail.trim(), role: inviteRole })
      setInviteToken(result.invitationToken)
      setMessage({
        type: 'success',
        text: `Đã tạo lời mời cho ${result.email}. Gửi token qua kênh an toàn (hết hạn 7 ngày).`,
      })
      setInviteEmail('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h3 className="font-bold text-dark-900">Quản lý tài khoản ({data.total})</h3>
        <Input
          placeholder="Tìm theo email hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
          aria-label="Tìm tài khoản"
        />
      </div>

      {message && (
        <div role="status" className={`flex items-start gap-2 mb-4 p-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {isSuperAdmin && (
        <Card className="p-4 mb-6">
          <h4 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-600" /> Mời quản trị viên
          </h4>
          <form onSubmit={createInvitation} className="flex flex-wrap items-end gap-3">
            <div className="flex-grow min-w-[220px]">
              <label className="block text-xs text-dark-500 mb-1">Email</label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="admin@example.com" required />
            </div>
            <div className="w-40">
              <label className="block text-xs text-dark-500 mb-1">Vai trò</label>
              <select className="w-full h-10 rounded-xl border border-dark-200 bg-white px-3 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                {['ADMIN', 'SUPPORT'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Button type="submit"><Mail size={16} className="mr-1" /> Tạo lời mời</Button>
          </form>
          {inviteToken && (
            <div className="mt-3 p-3 rounded-lg bg-dark-50 text-xs break-all">
              <span className="font-medium text-dark-700">Token mời (hiển thị một lần): </span>
              <code className="text-brand-700">{inviteToken}</code>
              <p className="text-dark-500 mt-1">
                Đăng ký tại <code>/register?invite=&lt;token&gt;</code> để nhận vai trò.
              </p>
            </div>
          )}
        </Card>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data.users.length === 0 && (
        <EmptyState icon={Users} title="Không tìm thấy tài khoản" />
      )}

      {!loading && !error && data.users.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="px-3 py-3 font-medium text-dark-500">Email</th>
                <th className="px-3 py-3 font-medium text-dark-500">Tên</th>
                <th className="px-3 py-3 font-medium text-dark-500">Vai trò</th>
                <th className="px-3 py-3 font-medium text-dark-500">Đơn hàng</th>
                <th className="px-3 py-3 font-medium text-dark-500">Ngày tạo</th>
                <th className="px-3 py-3 font-medium text-dark-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-dark-50">
                  <td className="px-3 py-3 text-dark-800">{u.email}</td>
                  <td className="px-3 py-3 text-dark-600">{u.name}</td>
                  <td className="px-3 py-3">
                    {isSuperAdmin ? (
                      <select
                        className="text-xs bg-white border border-dark-200 rounded px-2 py-1"
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        aria-label={`Vai trò của ${u.email}`}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-dark-600">{u.role}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-dark-600">{u.orderCount}</td>
                  <td className="px-3 py-3 text-xs text-dark-500">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-3">
                    {isSuperAdmin && u.id !== currentUser?.id && (
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => toggleStatus(u)}>
                        {u.status === 'active' ? 'Vô hiệu hoá' : 'Kích hoạt'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
