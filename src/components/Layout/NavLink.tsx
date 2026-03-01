import { NavLink as RouterNavLink } from 'react-router-dom'

interface NavLinkProps {
  to: string
  children: React.ReactNode
  icon?: React.ReactNode
}

export function NavLink({ to, children, icon }: NavLinkProps) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        ].join(' ')
      }
    >
      {icon}
      {children}
    </RouterNavLink>
  )
}
