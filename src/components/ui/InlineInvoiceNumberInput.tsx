import { forwardRef, type InputHTMLAttributes, useState } from 'react'

interface InlineInvoiceNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  prefixLabel: string
  suffixLabel: string
  digits?: number
  error?: string
}

export const InlineInvoiceNumberInput = forwardRef<HTMLInputElement, InlineInvoiceNumberInputProps>(
  ({ label, prefixLabel, suffixLabel, digits, error, className = '', style, ...props }, ref) => {
    const safeDigits = Math.max(1, digits ?? 1)
    const inputWidthCh = Math.max(12, safeDigits + 6)
    const [isFocused, setIsFocused] = useState(false)
    const raw =
      typeof props.value === 'number'
        ? String(props.value)
        : typeof props.value === 'string'
          ? props.value
          : ''
    const padded = raw && /^\d+$/.test(raw) ? raw.padStart(safeDigits, '0') : raw
    return (
      <div className="w-full min-w-0">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="flex items-stretch w-full relative">
          <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm whitespace-nowrap relative z-0">
            {prefixLabel}
          </span>
          <div className="relative flex-none shrink-0">
            <input
              ref={ref}
              style={{ width: `${inputWidthCh}ch`, minWidth: '12ch', ...style }}
              className={[
                'px-3 py-2 border placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
                error ? 'border-red-500' : 'border-gray-300',
                'border-l-0 border-r-0 rounded-none relative z-10 focus:z-10',
                !isFocused && padded ? 'text-transparent caret-gray-900' : 'text-gray-900',
                className,
              ].filter(Boolean).join(' ')}
              {...props}
              onFocus={(e) => {
                setIsFocused(true)
                props.onFocus?.(e)
              }}
              onBlur={(e) => {
                setIsFocused(false)
                props.onBlur?.(e)
              }}
            />
            {!isFocused && padded && (
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-gray-900 tabular-nums">
                {padded}
              </span>
            )}
          </div>
          <span className="inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-gray-50 text-gray-600 text-sm whitespace-nowrap relative z-0">
            {suffixLabel}
          </span>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

InlineInvoiceNumberInput.displayName = 'InlineInvoiceNumberInput'

