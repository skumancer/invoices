import { useEffect, useMemo, useState } from 'react'
import { parsePartialJson } from 'ai'
import { MessagePartPrimitive, useMessagePartText } from '@assistant-ui/react'
import { assistantResponseSchema } from '../../lib/invoice-assistant-schema'
import { InvoiceDraftCard } from './InvoiceDraftCard'

function streamingReplyHint(text: string): string | null {
  const m = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/)
  if (!m) return null
  try {
    return JSON.parse(`"${m[1]}"`) as string
  } catch {
    return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
  }
}

/**
 * Renders assistant messages as structured JSON: `reply` text plus optional `InvoiceDraftCard`.
 * User bubbles use the default text renderer (see AssistantPage).
 */
export function StructuredAssistantText() {
  const { text, status } = useMessagePartText()
  const isRunning = status.type === 'running'

  const [partialValue, setPartialValue] = useState<unknown>(undefined)

  useEffect(() => {
    if (!isRunning) return
    let cancelled = false
    void parsePartialJson(text).then((r) => {
      if (cancelled || r.state === 'failed-parse' || r.state === 'undefined-input') return
      setPartialValue(r.value)
    })
    return () => {
      cancelled = true
    }
  }, [text, isRunning])

  useEffect(() => {
    if (isRunning) return
    const id = requestAnimationFrame(() => setPartialValue(undefined))
    return () => cancelAnimationFrame(id)
  }, [isRunning])

  const parsed = useMemo(() => {
    if (isRunning) return null
    try {
      return assistantResponseSchema.safeParse(JSON.parse(text))
    } catch {
      return null
    }
  }, [text, isRunning])

  const runningReply = useMemo(() => {
    if (!isRunning) return null
    if (partialValue && typeof partialValue === 'object' && partialValue !== null) {
      const r = (partialValue as Record<string, unknown>).reply
      if (typeof r === 'string' && r.length > 0) return r
    }
    return streamingReplyHint(text)
  }, [isRunning, partialValue, text])

  if (isRunning) {
    return (
      <p className="whitespace-pre-line text-gray-800">
        {runningReply ?? (
          <span className="text-gray-500">Generating your invoice...</span>
        )}
        <MessagePartPrimitive.InProgress>
          <span className="font-sans text-gray-400">{' \u25CF'}</span>
        </MessagePartPrimitive.InProgress>
      </p>
    )
  }

  if (parsed?.success) {
    return (
      <div className="space-y-2">
        <p className="whitespace-pre-line text-gray-900">{parsed.data.reply}</p>
        {parsed.data.draft ? <InvoiceDraftCard draft={parsed.data.draft} /> : null}
      </div>
    )
  }

  return (
    <p className="whitespace-pre-line text-amber-900">
      {text || 'Empty response'}
      <span className="mt-1 block text-xs text-amber-800">Could not create an invoice.</span>
    </p>
  )
}
