import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import { NavLink } from './NavLink'

const navItems = [
  { to: '/invoices', label: 'Invoices' },
  { to: '/customers', label: 'Customers' },
  { to: '/items', label: 'Items' },
]

export function AppLayout() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile(user?.id)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // e.g. network error; still send user to login
    }
    navigate('/login', { replace: true })
  }

  const profileName = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(' ')
  const displayName = profileName || (user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Account')
  const email = user?.email ?? ''

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">Invoicing</h1>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 space-y-2">
          <p className="px-3 py-1 text-sm font-medium text-gray-900 truncate" title={displayName}>
            {displayName}
          </p>
          {email && displayName !== email && (
            <p className="px-3 py-0 text-xs text-gray-500 truncate" title={email}>
              {email}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            <NavLink to="/settings">Settings</NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <div className="md:pl-52 flex-1 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Invoicing</h1>
        </header>
        <main className="flex-1 p-4 pb-24 md:pb-4 md:px-6">
          <Outlet />
        </main>
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 safe-area-pb">
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 truncate flex-1 min-w-0" title={displayName}>
              {displayName || 'Account'}
            </p>
            <div className="flex gap-1 shrink-0">
              <NavLink to="/settings">Settings</NavLink>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Log out
              </button>
            </div>
          </div>
          <nav className="flex justify-around py-2">
            {navItems.map(({ to, label }) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
