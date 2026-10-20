import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, ArrowRight, Sparkles } from 'lucide-react'

export default function Intro({ onFinish }) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      icon: <Sparkles size={48} className="text-brand-600" />,
      title: 'Khám phá mô hình 3D',
      desc: 'Hình sản phẩm lướt nhanh, tạo điểm nhấn đầu tiên.',
    },
    {
      icon: <Rocket size={48} className="text-brand-500" />,
      title: 'Chuyển vào trang chủ',
      desc: 'Duyệt sản phẩm, chọn biến thể và thêm vào giỏ hàng.',
    },
    {
      icon: <ArrowRight size={48} className="text-dark-600" />,
      title: 'Bắt đầu mua sắm',
      desc: 'Trải nghiệm mượt mà, responsive trên mọi thiết bị.',
    },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-4 animate-pulse">
            {steps[step].icon}
          </div>
          <h2 className="text-3xl font-bold text-dark-900">{steps[step].title}</h2>
          <p className="text-dark-600 max-w-sm">{steps[step].desc}</p>
          {step < steps.length - 1 ? (
            <ButtonVariant onClick={() => setStep((s) => s + 1)}>
              Tiếp <ArrowRight size={18} className="ml-2" />
            </ButtonVariant>
          ) : (
            <ButtonVariant onClick={onFinish} className="bg-brand-600">
              Vào trang chủ <Rocket size={18} className="ml-2" />
            </ButtonVariant>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-8 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step ? 'bg-brand-600' : 'bg-dark-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function ButtonVariant({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${className}`}
    >
      {children}
    </button>
  )
}
