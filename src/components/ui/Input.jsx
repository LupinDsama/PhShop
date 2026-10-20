import React from 'react'
import { cn } from './utils'

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('text-sm font-medium text-dark-700', className)} {...props} />
))
Label.displayName = 'Label'
