import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
        <p className="text-gray-600">The page you’re looking for doesn’t exist or has been moved.</p>
        <Link to="/">
          <Button>Go to home</Button>
        </Link>
      </div>
    </div>
  )
}
