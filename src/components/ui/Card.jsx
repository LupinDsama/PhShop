import { cn } from './utils'

export const Card = ({ className, children, ...props }) => (
  <div
    {...props}
    className={cn(
      'rounded-2xl border border-dark-100 bg-white shadow-sm transition-all hover:shadow-md',
      className
    )}
  >
    {children}
  </div>
)

export const CardHeader = ({ className, children, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ className, children, ...props }) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ className, children, ...props }) => (
  <p className={cn('text-sm text-dark-600', className)} {...props}>
    {children}
  </p>
)

export const CardContent = ({ className, children, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ className, children, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
    {children}
  </div>
)
