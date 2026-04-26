import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50',
  ghost: 'text-gray-700 hover:bg-gray-100 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
}

const sizeClasses: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={[
        'font-medium transition-colors inline-flex items-center justify-center gap-1',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    />
  )
)
Button.displayName = 'Button'
