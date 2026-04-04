import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react'
import { StructuredAssistantText } from './StructuredAssistantText'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? ''

const sendButtonClass = 'font-medium transition-colors inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed'

function UserBubble() {
  return (
    <MessagePrimitive.Root className="mb-3 flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantBubble() {
  return (
    <MessagePrimitive.Root className="mb-3 flex w-full min-w-0 justify-start">
      <div className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
        <MessagePrimitive.Parts components={{ Text: StructuredAssistantText }} />
      </div>
    </MessagePrimitive.Root>
  )
}

/** Thread + composer; must render under `AssistantRuntimeProvider`. */
export function AssistantThreadView() {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3">
        <ThreadPrimitive.Empty>
          <p className="py-8 text-center text-sm text-gray-500">
            Describe the invoice (customer, line items, quantities, prices). The assistant will propose a draft for you.
          </p>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserBubble,
            AssistantMessage: AssistantBubble,
          }}
        />
      </ThreadPrimitive.Viewport>
      <ThreadPrimitive.ScrollToBottom />
      <div className="border-t border-gray-200 p-2">
        <ComposerPrimitive.Root className="flex items-end gap-2">
          <ComposerPrimitive.Input
            placeholder="e.g. Invoice Acme Corp for 3× consulting at 150 each"
            rows={1}
            className="min-h-10 max-h-40 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
          <ComposerPrimitive.Send className={sendButtonClass}>
            Send
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  )
}

export function isAssistantConfigured(): boolean {
  return Boolean(supabaseUrl)
}
