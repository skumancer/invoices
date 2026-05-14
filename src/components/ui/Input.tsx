import { type InputHTMLAttributes, forwardRef } from 'react'
import { NativeInput } from './NativeInput'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', prefix, ...props }, ref) => {
    return (
      <NativeInput
        ref={ref}
        id={id}
        label={label}
        error={error}
        prefix={prefix}
        className={className}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
