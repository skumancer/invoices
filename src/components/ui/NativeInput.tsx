import { forwardRef, type InputHTMLAttributes } from 'react'

const comfortableClass = 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none text-sm text-gray-900 placeholder-gray-500'

const compactClass = 'px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none placeholder-gray-500'

interface NativeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  density?: 'comfortable' | 'compact'
  /** Applied to the outer wrapper (e.g. `flex-1 min-w-0` in flex rows) */
  wrapperClassName?: string
}

export const NativeInput = forwardRef<HTMLInputElement, NativeInputProps>(
  ({ label, error, id, className = '', density = 'comfortable', wrapperClassName = '', ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const densityCls = density === 'compact' ? compactClass : comfortableClass
    const input = (
      <input
        ref={ref}
        id={inputId}
        className={[densityCls, error ? 'border-red-500' : '', className].filter(Boolean).join(' ')}
        {...props}
      />
    )
    if (!label) {
      return (
        <div className={['min-w-0', wrapperClassName].filter(Boolean).join(' ')}>
          {input}
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      )
    }
    return (
      <div className={['w-full min-w-0', wrapperClassName].filter(Boolean).join(' ')}>
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {input}
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </div>
    )
  }
)
NativeInput.displayName = 'NativeInput'
