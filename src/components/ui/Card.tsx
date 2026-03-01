import { type HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['bg-white border border-gray-200 rounded-xl shadow-sm', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={['px-4 py-3 border-b border-gray-100', className].filter(Boolean).join(' ')} {...props} />
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={['p-4', className].filter(Boolean).join(' ')} {...props} />
}
