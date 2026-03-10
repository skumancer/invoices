import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', prefix, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const inputEl = (
      <input
        ref={ref}
        id={inputId}
        className={[
          prefix ? 'rounded-r-lg border-l-0' : 'rounded-lg',
          'w-full px-3 py-2 border text-gray-900 placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
          error ? 'border-red-500' : 'border-gray-300',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
    )
    return (
      <div className="w-full min-w-0">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        {prefix ? (
          <div className="flex">
            <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm">
              {prefix}
            </span>
            {inputEl}
          </div>
        ) : (
          inputEl
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
