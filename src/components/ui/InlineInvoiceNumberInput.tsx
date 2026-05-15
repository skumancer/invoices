import { forwardRef, type InputHTMLAttributes, useState } from 'react'

const pxPyClass = 'px-3 py-2'

interface InlineInvoiceNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  prefixLabel: string
  suffixLabel: string
  digits?: number
  error?: string
}

export const InlineInvoiceNumberInput = forwardRef<HTMLInputElement, InlineInvoiceNumberInputProps>(
  ({ label, prefixLabel, suffixLabel, digits, error, className = '', style, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
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
    const hasPrefix = Boolean(prefixLabel)
    const hasSuffix = Boolean(suffixLabel)
    const hasAffix = hasPrefix || hasSuffix

    const input = (
      <input
        ref={ref}
        id={inputId}
        style={hasAffix ? { width: `${inputWidthCh}ch`, minWidth: '12ch', ...style } : style}
        className={[
          hasAffix ? 'min-w-0 max-w-full' : 'w-full min-w-0',
          'border bg-white text-base placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
          pxPyClass,
          hasAffix ? 'border-0 rounded-none' : 'rounded-lg',
          hasAffix ? '' : (error ? 'border-red-500' : 'border-gray-300'),
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
    )

    const inputCell = (
      <div className={hasAffix ? 'relative shrink-0 min-w-0' : 'relative w-full min-w-0'}>
        {input}
        {!isFocused && padded ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-base text-gray-900 tabular-nums">
            {padded}
          </span>
        ) : null}
      </div>
    )

    const content = hasAffix ? (
      <div
        className={[
          'inline-flex w-max max-w-full min-w-0 items-stretch overflow-hidden rounded-lg border bg-white',
          'focus-within:ring-2 focus-within:ring-gray-900',
          error ? 'border-red-500' : 'border-gray-300',
        ].join(' ')}
      >
        {hasPrefix ? (
          <span
            className={[
              'inline-flex shrink-0 items-center whitespace-nowrap border-r border-gray-300 bg-gray-50 text-base text-gray-600',
              pxPyClass,
            ].join(' ')}
          >
            {prefixLabel}
          </span>
        ) : null}
        {inputCell}
        {hasSuffix ? (
          <span
            className={[
              'inline-flex shrink-0 items-center whitespace-nowrap border-l border-gray-300 bg-gray-50 text-base text-gray-600',
              pxPyClass,
            ].join(' ')}
          >
            {suffixLabel}
          </span>
        ) : null}
      </div>
    ) : (
      inputCell
    )

    return (
      <div className="w-full min-w-0">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {content}
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </div>
    )
  }
)

InlineInvoiceNumberInput.displayName = 'InlineInvoiceNumberInput'
