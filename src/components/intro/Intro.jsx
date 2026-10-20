import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, X, ArrowRight, Image, Palette } from 'lucide-react'

const steps = [
  {
    title: 'Mô hình in 3D',
    desc: 'Hình sản phẩm lướt nhanh, tạo điểm nhấn đầu tiên.',
    icon: <Image size={40} className="text-brand-600" />,
  },
  {
    title: 'Thiết kế tối giản',
    desc: 'Giao diện sạch sẽ, dễ sử dụng trên mọi thiết bị.',
    icon: <Palette size={40} className="text-brand-500" />,
  },
  {
    title: 'Bắt đầu mua sắm',
    desc: 'Duyệt sản phẩm, chọn biến thể và đặt hàng trong vài giây.',
    icon: <Rocket size={40} className="text-dark-600" />,
  },
]

export default function Intro({ onFinish }) {
  const [step, setStep] = useState(0)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < steps.length - 1) setStep((s) => s + 1)
      else onFinish()
    }, 1200)
    return () => clearTimeout(timer)
  }, [step, onFinish])

  const next = () => {
    if (step < steps.length - 1) setStep((s) => s + 1)
    else onFinish()
  }

  const skip = () => {
    setSkipped(true)
    onFinish()
  }

  return (
    <AnimatePresence>
      {!skipped && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center font-sans">
          <div className="absolute top-6 right-6">
            <button
              onClick={skip}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-100 text-dark-600 text-xs font-medium hover:bg-dark-200 transition"
            >
              <X size={14} /> Bỏ qua
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 rounded-3xl bg-brand-50 flex items-center justify-center mb-4 animate-pulse shadow-lg">
              {steps[step].icon}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-900 tracking-tight">
              {steps[step].title}
            </h2>
            <p className="text-dark-500 text-lg max-w-md mx-auto leading-relaxed">
              {steps[step].desc}
            </p>
            <button
              onClick={next}
              className={`inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-medium transition-all ${
                step === steps.length - 1
                  ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-500/30'
                  : 'bg-dark-100 text-dark-700 hover:bg-dark-200'
              }`}
            >
              {step === steps.length - 1 ? 'Vào trang chủ' : 'Tiếp'} <ArrowRight size={16} className="ml-2" />
            </button>
          </motion.div>

          <div className="absolute bottom-8 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i === step ? 'bg-brand-600 w-8' : 'bg-dark-200 w-2'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
