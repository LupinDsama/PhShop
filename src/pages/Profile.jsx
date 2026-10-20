import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { formatDate } from '../lib/format'
import { User, Mail, Phone, LogOut, ShieldCheck, Monitor, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Profile() {
  const { user, logout, updateProfile, changePassword } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [error, setError] = useState(null)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (user) setProfile({ name: user.name || '', phone: user.phone || '' })
  }, [user])

  useEffect(() => {
    api.get('/api/auth/sessions').then((d) => setSessions(d.sessions || [])).catch(() => {})
  }, [])

  const handleProfile = async (e) => {
    e.preventDefault()
    setError(null)
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      await updateProfile({ name: profile.name.trim(), phone: profile.phone.trim() })
      setProfileMsg({ type: 'success', message: 'Đã cập nhật hồ sơ.' })
    } catch (err) {
      setProfileMsg({ type: 'error', message: err.message })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    setError(null)
    setPasswordMsg(null)
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' })
      return
    }
    setSavingPassword(true)
    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMsg({ type: 'success', message: 'Đã đổi mật khẩu. Các phiên khác đã được đăng xuất.' })
    } catch (err) {
      setPasswordMsg({ type: 'error', message: err.message })
    } finally {
      setSavingPassword(false)
    }
  }

  const revokeSession = async (id) => {
    try {
      await api.delete(`/api/auth/sessions/${id}`)
      const d = await api.get('/api/auth/sessions')
      setSessions(d.sessions || [])
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user) return null

  return (
    <div className="section">
      <div className="container-page">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-dark-900">Hồ sơ của tôi</h2>
          <p className="text-dark-500">Quản lý thông tin tài khoản, mật khẩu và phiên đăng nhập.</p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <Card className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl mb-3">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="text-lg font-bold text-dark-900">{user?.name || 'Khách hàng'}</div>
                <div className="text-sm text-dark-500 break-all text-center">{user?.email}</div>
                <span className="mt-2 text-xs font-semibold px-2 py-1 rounded-full bg-brand-50 text-brand-700">
                  {user?.role}
                </span>
              </div>

              <div className="space-y-3">
                <InfoRow icon={User} label="Họ tên" value={user?.name} />
                <InfoRow icon={Mail} label="Email" value={user?.email} />
                <InfoRow icon={Phone} label="Số điện thoại" value={user?.phone || 'Chưa cập nhật'} />
                <InfoRow icon={ShieldCheck} label="Xác minh email" value={user?.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'} />
              </div>

              <div className="mt-6 pt-6 border-t border-dark-100">
                <Button onClick={() => { logout(); navigate('/login') }} variant="outline" className="w-full text-red-600 hover:bg-red-50">
                  <LogOut size={18} className="mr-2" /> Đăng xuất
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-dark-900 mb-6">Cài đặt tài khoản</h3>
              {profileMsg && (
                <div role="status" className={`flex items-start gap-2 mb-4 p-3 rounded-xl text-sm ${
                  profileMsg.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
                }`}>
                  {profileMsg.type === 'success'
                    ? <CheckCircle2 size={16} className="mt-0.5" />
                    : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{profileMsg.message}</span>
                </div>
              )}
              <form onSubmit={handleProfile} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="profile-name" className="block text-sm font-medium text-dark-700">Họ tên</label>
                  <Input id="profile-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} minLength={2} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="profile-phone" className="block text-sm font-medium text-dark-700">Số điện thoại</label>
                  <Input id="profile-phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <Button type="submit" disabled={savingProfile} className="w-fit">
                  {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-dark-900 mb-6">Đổi mật khẩu</h3>
              {passwordMsg && (
                <div role="status" className={`flex items-start gap-2 mb-4 p-3 rounded-xl text-sm ${
                  passwordMsg.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
                }`}>
                  {passwordMsg.type === 'success'
                    ? <CheckCircle2 size={16} className="mt-0.5" />
                    : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{passwordMsg.message}</span>
                </div>
              )}
              <form onSubmit={handlePassword} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="pwd-current" className="block text-sm font-medium text-dark-700">Mật khẩu hiện tại</label>
                  <Input id="pwd-current" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pwd-new" className="block text-sm font-medium text-dark-700">Mật khẩu mới</label>
                  <Input id="pwd-new" type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pwd-confirm" className="block text-sm font-medium text-dark-700">Xác nhận mật khẩu mới</label>
                  <Input id="pwd-confirm" type="password" autoComplete="new-password" minLength={8} value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
                </div>
                <Button type="submit" disabled={savingPassword} className="w-fit">
                  {savingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Monitor size={18} className="text-brand-600" />
                <h3 className="font-bold text-dark-900">Phiên đăng nhập</h3>
              </div>
              {sessions.length === 0 ? (
                <p className="text-sm text-dark-500">Không có phiên nào.</p>
              ) : (
                <ul className="divide-y divide-dark-100">
                  {sessions.map((s) => (
                    <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-dark-900 truncate">{s.userAgent || 'Không rõ thiết bị'}</div>
                        <div className="text-xs text-dark-500">
                          Đăng nhập {formatDate(s.createdAt)} • {s.ip || 'IP ẩn'}
                        </div>
                      </div>
                      {s.active ? (
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => revokeSession(s.id)}>
                          Thu hồi
                        </Button>
                      ) : (
                        <span className="text-xs text-dark-400">Đã hết hạn</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50">
      <Icon size={18} className="text-dark-400 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-dark-900">{label}</div>
        <div className="text-xs text-dark-400 truncate">{value}</div>
      </div>
    </div>
  )
}
