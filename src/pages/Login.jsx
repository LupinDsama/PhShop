import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Phone, Lock, User } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = { email, name: email.split('@')[0] }
    login(user)
    navigate('/')
  }

  return (
    <div className="section min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="container-page">
        <Card className="max-w-md mx-auto shadow-xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">P</div>
              <h2 className="text-2xl font-bold text-dark-900">{mode === 'login' ? 'Chào mừng quay lại' : 'Tạo tài khoản mới'}</h2>
              <p className="text-dark-500 text-sm mt-2">
                {mode === 'login' ? 'Đăng nhập để tiếp tục mua sắm.' : 'Điền thông tin để tạo tài khoản.'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Email</label>
                <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-700">Mật khẩu</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full py-3 text-lg font-bold shadow-lg">
                {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-dark-500">
              Chưa có tài khoản?{' '}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-brand-600 font-medium hover:underline">
                {mode === 'login' ? 'Đăng ký ngay' : 'Đã có tài khoản, đăng nhập'}
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
