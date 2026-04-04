import { Link, Outlet, useNavigate } from 'react-router-dom'
import { AssistantModalPrimitive } from '@assistant-ui/react'
import { useAuth } from '../../contexts/useAuth'
import { useProfileContext } from '../../contexts/useProfileContext'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { pageTitleClassName } from '../ui/typography'
import { NavLink } from './NavLink'
import { AssistantLauncherButton, AssistantModalRoot, useNarrowViewport } from './AssistantModal'

const navItems = [
  { to: '/invoices', label: 'Invoices' },
  { to: '/customers', label: 'Customers' },
  { to: '/items', label: 'Items' },
]

export function AppLayout() {
  const narrow = useNarrowViewport()
  const { user, signOut } = useAuth()
  const { profile, error: profileError } = useProfileContext()
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
  const staleSession = profileError && !profile

  if (staleSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-900">Your session is no longer valid.</p>
            <p className="mt-1 text-sm text-gray-500">Please sign in again.</p>
            <Button type="button" onClick={handleSignOut} className="mt-4" fullWidth>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AssistantModalRoot>
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 print:bg-white">
        <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-gray-200 print:hidden">
          <div className="p-4 border-b border-gray-100">
            <h1 className={pageTitleClassName}>Send Invoices Online</h1>
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
        <div className="md:pl-52 flex-1 flex flex-col min-h-screen print:pl-0">
          <header className="sticky top-0 z-10 flex flex-row items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden print:hidden">
            <h1 className={`${pageTitleClassName} min-w-0 flex-1`}>Send Invoices Online</h1>
            {narrow && (
              <AssistantModalPrimitive.Trigger asChild>
                <AssistantLauncherButton />
              </AssistantModalPrimitive.Trigger>
            )}
          </header>
          <main className="flex-1 flex flex-col min-h-0 min-w-0 p-4 max-md:pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:pb-4 md:px-6 print:py-6 print:px-6 print:pb-6">
            <div className="flex flex-1 min-h-0 min-w-0 flex-col">
              <Outlet />
            </div>
            <footer className="mt-auto shrink-0 pt-6 border-t border-gray-100 print:hidden">
              <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <Link to="/privacy" className="hover:text-gray-800 underline">
                  Privacy
                </Link>
                <Link to="/terms" className="hover:text-gray-800 underline">
                  Terms
                </Link>
              </nav>
            </footer>
          </main>
          <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 safe-area-pb print:hidden">
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
          {!narrow && (
            <AssistantModalPrimitive.Anchor className="fixed bottom-8 right-8 z-30 hidden md:block">
              <AssistantModalPrimitive.Trigger asChild>
                <AssistantLauncherButton />
              </AssistantModalPrimitive.Trigger>
            </AssistantModalPrimitive.Anchor>
          )}
        </div>
      </div>
    </AssistantModalRoot>
  )
}
