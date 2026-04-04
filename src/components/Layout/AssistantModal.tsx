import {
  type ButtonHTMLAttributes,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AssistantModalPrimitive, AssistantRuntimeProvider } from '@assistant-ui/react'
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { pageTitleClassName } from '../ui/typography'
import { AssistantThreadView, isAssistantConfigured } from '../InvoiceAssistant/AssistantChatPanel'
import { supabase } from '../../lib/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? ''

const authFetch: typeof fetch = async (input, init) => {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers)
  if (anonKey) headers.set('apikey', anonKey)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(input, { ...init, headers })
}

const assistantLauncherButtonClassName = 'relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white shadow-md transition-transform hover:bg-blue-700 hover:scale-110 active:scale-90 md:size-14'

/**
 * Launcher styled like the [assistant-ui modal sample](https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/docs/samples/assistant-modal.tsx):
 * bot + chevron swap on open, hover/active scale.
 */
export const AssistantLauncherButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { 'data-state'?: 'open' | 'closed' }
>(function AssistantLauncherButton({ className, 'data-state': state, ...rest }, ref) {
  const open = state === 'open'
  return (
    <button
      ref={ref}
      type="button"
      className={`${assistantLauncherButtonClassName} ${className}`}
      aria-label={open ? 'Close invoice assistant' : 'Open invoice assistant'}
      aria-expanded={open}
      {...rest}
    >
      <Lightbulb
        data-state={state}
        className="absolute size-6 transition-all data-[state=closed]:rotate-0 data-[state=open]:rotate-90 data-[state=closed]:scale-100 data-[state=open]:scale-0"
        strokeWidth={2}
        aria-hidden
      />
      <ChevronDown
        data-state={state}
        className="absolute size-6 transition-all data-[state=closed]:-rotate-90 data-[state=open]:rotate-0 data-[state=closed]:scale-0 data-[state=open]:scale-100"
        strokeWidth={2}
        aria-hidden
      />
      <span className="sr-only">{open ? 'Close assistant' : 'Open assistant'}</span>
    </button>
  )
})

const narrowQuery = '(max-width: 767px)'

/** Matches Tailwind `md` breakpoint (mobile layout + header assistant). */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(narrowQuery).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(narrowQuery)
    setNarrow(mq.matches)
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}

/**
 * Popover panel: mobile enters from the header launcher (`origin-top-right`); desktop from the FAB
 * (`origin-bottom-right`) with slide + zoom.
 */
const assistantPopoverContentClass =
  [
    'flex flex-col overflow-clip rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-lg outline-none',
    'h-[min(25rem,70dvh)] w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] max-md:h-[min(40rem,calc(100dvh-9rem))]',
    'md:h-[min(34rem,85dvh)] md:w-[26rem] md:max-w-[26rem]',
    'data-[state=closed]:animate-out data-[state=open]:animate-in',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'max-md:origin-top-right',
    'md:origin-bottom-right',
    'max-md:data-[state=open]:slide-in-from-top-8 max-md:data-[state=open]:slide-in-from-right-8',
    'max-md:data-[state=closed]:slide-out-to-top-8 max-md:data-[state=closed]:slide-out-to-right-8',
    'md:data-[state=open]:slide-in-from-bottom-8 md:data-[state=open]:slide-in-from-right-8',
    'md:data-[state=closed]:slide-out-to-bottom-8 md:data-[state=closed]:slide-out-to-right-8',
  ].join(' ')

const AssistantModalContext = createContext<() => void>(() => { })

/** Close the assistant popover from any descendant component. */
export function useCloseAssistant(): () => void {
  return useContext(AssistantModalContext)
}

/**
 * Hosts `AssistantRuntimeProvider` + `AssistantModalPrimitive` (see
 * [assistant-ui modal sample](https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/docs/samples/assistant-modal.tsx)).
 */
export function AssistantModalRoot({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const narrow = useNarrowViewport()

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: `${supabaseUrl}/functions/v1/ai-create-invoice`,
        fetch: authFetch,
        credentials: 'omit',
      }),
    [],
  )

  const runtime = useChatRuntime({ transport })

  const close = useMemo(() => () => setOpen(false), [])

  return (
    <AssistantModalContext value={close}>
      <AssistantRuntimeProvider runtime={runtime}>
        <AssistantModalPrimitive.Root open={open} onOpenChange={setOpen} unstable_openOnRunStart={false}>
          {children}
          <AssistantModalPrimitive.Content
            side={narrow ? 'bottom' : 'top'}
            align="end"
            sideOffset={narrow ? 12 : 16}
            avoidCollisions
            collisionPadding={narrow ? { top: 4, bottom: 88, left: 10, right: 10 } : 12}
            dissmissOnInteractOutside
            className={`${assistantPopoverContentClass} z-[100]`}
          >
            <div className="flex shrink-0 items-center border-b border-gray-200 px-4 py-3">
              <h2 className={pageTitleClassName}>Invoice Assistant</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-2 md:px-4 md:pb-4">
              {!isAssistantConfigured() ? (
                <p className="text-sm text-red-600">
                  Missing VITE_SUPABASE_URL. The assistant cannot reach your project.
                </p>
              ) : (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <AssistantThreadView />
                </div>
              )}
            </div>
          </AssistantModalPrimitive.Content>
        </AssistantModalPrimitive.Root>
      </AssistantRuntimeProvider>
    </AssistantModalContext>
  )
}
