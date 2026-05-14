import { forwardRef, type SelectHTMLAttributes } from 'react'

const sizeClass = {
  md: 'w-full h-10.5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none bg-white text-gray-900',
  sm: 'px-3 py-1.5 text-base font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none bg-white text-gray-700 w-auto min-w-0',
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  inputSize?: 'md' | 'sm'
  /** Outer wrapper (e.g. `flex-1 min-w-0` beside another control) */
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, id, className = '', inputSize = 'md', containerClassName = '', children, ...props }, ref) => {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const selectClass = [sizeClass[inputSize], error ? 'border-red-500' : '', className].filter(Boolean).join(' ')
  const containerBase = inputSize === 'sm' ? 'inline-flex min-w-0 items-center' : 'w-full min-w-0'
  return (
    <div className={[containerBase, containerClassName].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      ) : null}
      <select ref={ref} id={selectId} className={selectClass} {...props}>
        {children}
      </select>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
)
Select.displayName = 'Select'
