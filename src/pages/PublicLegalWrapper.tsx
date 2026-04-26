import { Link } from 'react-router-dom'

export function PublicLegalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto w-full max-w-2xl pt-8 space-y-6">
        {children}
        <p className="text-center text-sm text-gray-600">
          <Link to="/" className="font-medium text-gray-900 hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  )
}
