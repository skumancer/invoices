import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type MouseEvent,
  forwardRef,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { AssistantModalPrimitive, AssistantRuntimeProvider } from '@assistant-ui/react'
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { createPortal } from 'react-dom'
import { pageTitleClassName } from '../ui/typography'
import { isAssistantConfigured } from '../InvoiceAssistant/assistantConfig'
import { AssistantThreadView } from '../InvoiceAssistant/AssistantChatPanel'
import { supabase } from '../../lib/supabase'
import { AssistantModalContext } from './assistantModalContext'
import { useNarrowViewport } from './useNarrowViewport'
import { getPlatform, isNativePlatform } from '../../lib/platform/capacitor'

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

const MOBILE_ASSISTANT_MAX_HEIGHT_REM = 40

/**
 * On narrow viewports, cap popover height to the visual viewport and lift it by the occluded
 * keyboard inset so the composer stays visible when the field is auto-focused.
 */
function useAssistantMobileVisualViewportStyle(
  open: boolean,
  narrow: boolean,
): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined)

  useLayoutEffect(() => {
    if (!narrow || !open) return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const remPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const heightCapPx = MOBILE_ASSISTANT_MAX_HEIGHT_REM * remPx
      const verticalGutterPx = 24
      const keyboardInsetPx = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      const maxHeight = Math.min(heightCapPx, Math.max(0, vv.height - verticalGutterPx))
      setStyle({
        maxHeight,
        marginBottom: keyboardInsetPx,
      })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [narrow, open])

  if (!narrow || !open) return undefined
  return style
}

function AssistantPanelBody({ open }: { open: boolean }) {
  return (
    <>
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
            <AssistantThreadView open={open} />
          </div>
        )}
      </div>
    </>
  )
}

function AssistantNativeSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/30 md:hidden"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Invoice Assistant"
    >
      <div className="flex h-[min(40rem,calc(100dvh-9rem))] min-h-0 flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl">
        <AssistantPanelBody open={open} />
      </div>
    </div>,
    document.body,
  )
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

/**
 * Hosts `AssistantRuntimeProvider` + `AssistantModalPrimitive` (see
 * [assistant-ui modal sample](https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/docs/samples/assistant-modal.tsx)).
 */
export function AssistantModalRoot({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const narrow = useNarrowViewport()
  const nativeIOS = isNativePlatform() && getPlatform() === 'ios'
  const mobileViewportStyle = useAssistantMobileVisualViewportStyle(open, narrow)

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
          {nativeIOS && narrow ? (
            <AssistantNativeSheet open={open} onClose={close} />
          ) : (
            <AssistantModalPrimitive.Content
              side={narrow ? 'bottom' : 'top'}
              align="end"
              sideOffset={narrow ? 12 : 16}
              avoidCollisions
              collisionPadding={narrow ? { top: 4, bottom: 88, left: 10, right: 10 } : 12}
              dissmissOnInteractOutside
              className={`${assistantPopoverContentClass} z-[100]`}
              style={mobileViewportStyle}
            >
              <AssistantPanelBody open={open} />
            </AssistantModalPrimitive.Content>
          )}
        </AssistantModalPrimitive.Root>
      </AssistantRuntimeProvider>
    </AssistantModalContext>
  )
}
