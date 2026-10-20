import React, { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const Button = forwardRef(({ className, variant = 'primary', size = 'md', disabled, asChild = false, children, ...props }, ref) => {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500 shadow-sm',
    secondary: 'bg-dark-800 text-white hover:bg-dark-700 focus:ring-dark-600',
    outline: 'border border-dark-700 bg-transparent text-dark-900 hover:bg-dark-100 focus:ring-dark-500',
    ghost: 'text-dark-600 hover:bg-dark-100 focus:ring-dark-400',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  const classes = cn(base, variants[variant], sizes[size], className)

  // asChild: giao props cho phần tử con (React.Fragment không nhận disabled).
  if (asChild) {
    const child = React.Children.only(children)
    return React.cloneElement(child, {
      ...props,
      ref,
      className: cn(classes, child.props.className),
      ...(disabled ? { 'aria-disabled': 'true' } : {}),
    })
  }

  return (
    <button ref={ref} disabled={disabled} className={classes} {...props}>
      {children}
    </button>
  )
})
