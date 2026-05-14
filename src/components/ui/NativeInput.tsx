import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

const densityClass = {
  comfortable: 'px-3 py-2',
  compact: 'px-2 py-1.5',
} as const

interface NativeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  density?: 'comfortable' | 'compact'
  prefix?: ReactNode
  suffix?: ReactNode
  /** Applied to the outer wrapper (e.g. `flex-1 min-w-0` in flex rows) */
  wrapperClassName?: string
}

export const NativeInput = forwardRef<HTMLInputElement, NativeInputProps>(
  ({ label, error, id, className = '', density = 'comfortable', prefix, suffix, wrapperClassName = '', ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const pxPyClass = densityClass[density]
    const hasAffix = Boolean(prefix || suffix)
    const input = (
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full min-w-0 border bg-white text-base text-gray-900 placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
          pxPyClass,
          hasAffix ? 'border-0 rounded-none' : 'rounded-lg',
          hasAffix ? '' : (error ? 'border-red-500' : 'border-gray-300'),
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
    )
    const content = hasAffix ? (
      <div
        className={[
          'flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-white',
          'focus-within:ring-2 focus-within:ring-gray-900',
          error ? 'border-red-500' : 'border-gray-300',
        ].join(' ')}
      >
        {prefix ? (
          <span className={['inline-flex shrink-0 items-center border-r border-gray-300 bg-gray-50 text-base text-gray-600', pxPyClass].join(' ')}>
            {prefix}
          </span>
        ) : null}
        {input}
        {suffix ? (
          <span className={['inline-flex shrink-0 items-center border-l border-gray-300 bg-gray-50 text-base text-gray-600', pxPyClass].join(' ')}>
            {suffix}
          </span>
        ) : null}
      </div>
    ) : input
    if (!label) {
      return (
        <div className={['min-w-0', wrapperClassName].filter(Boolean).join(' ')}>
          {content}
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      )
    }
    return (
      <div className={['w-full min-w-0', wrapperClassName].filter(Boolean).join(' ')}>
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {content}
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </div>
    )
  }
)
NativeInput.displayName = 'NativeInput'
