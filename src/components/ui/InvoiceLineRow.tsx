import { Button } from './Button'
import { NativeInput } from './NativeInput'
import { CircleX } from 'lucide-react'

export interface InvoiceLineRowProps {
  lineNumber: number
  description: string
  quantity: number | ''
  unitPrice: number | ''
  onDescriptionChange: (value: string) => void
  onQuantityChange: (value: number | '') => void
  onUnitPriceChange: (value: number | '') => void
  onRemove: () => void
}

export function InvoiceLineRow({
  lineNumber,
  description,
  quantity,
  unitPrice,
  onDescriptionChange,
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
}: InvoiceLineRowProps) {
  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,4fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-stretch gap-x-2">
      <div className="flex min-w-0 items-stretch gap-1">
        <span
          className="flex w-6 shrink-0 items-center justify-center text-sm font-medium tabular-nums text-gray-500"
          aria-hidden
        >
          {lineNumber}
        </span>
        <NativeInput
          density="compact"
          wrapperClassName="min-w-0 flex-1"
          className="w-full min-w-0"
          placeholder="Description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <NativeInput
        density="compact"
        type="number"
        min={0}
        step={1}
        wrapperClassName="min-w-0"
        className="w-full min-w-0"
        value={quantity}
        onChange={(e) => {
          const next = e.target.value
          onQuantityChange(next === '' ? '' : Number(next))
        }}
      />
      <div className="flex min-w-0 items-stretch overflow-hidden rounded border border-gray-300 text-sm">
        <span className="inline-flex shrink-0 items-center border-r border-gray-300 bg-gray-50 py-1.5 pl-2 pr-1 text-sm text-gray-600">
          $
        </span>
        <input
          type="number"
          min={0}
          step={0.01}
          className="min-w-0 w-full border-0 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={unitPrice}
          onChange={(e) => {
            const next = e.target.value
            onUnitPriceChange(next === '' ? '' : Number(next))
          }}
        />
      </div>
      <div className="flex min-w-0 items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={onRemove}
          aria-label={`Remove line ${lineNumber}`}
        >
          <CircleX className="h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
