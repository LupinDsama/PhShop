import { AlertTriangle, Inbox, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './utils'

export function LoadingState({ label = 'Đang tải dữ liệu...', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-dark-500', className)}>
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
        <AlertTriangle size={24} />
      </div>
      <p className="text-sm text-dark-600 max-w-md">{message || 'Đã xảy ra lỗi. Vui lòng thử lại.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center text-dark-400">
        <Icon size={30} />
      </div>
      {title && <h3 className="text-lg font-bold text-dark-900">{title}</h3>}
      {description && <p className="text-sm text-dark-500 max-w-md">{description}</p>}
      {action}
    </div>
  )
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="w-9 h-9 rounded-xl border border-dark-200 flex items-center justify-center disabled:opacity-40 hover:bg-dark-50 transition"
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-dark-600 px-2">
        Trang {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="w-9 h-9 rounded-xl border border-dark-200 flex items-center justify-center disabled:opacity-40 hover:bg-dark-50 transition"
        aria-label="Trang sau"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
