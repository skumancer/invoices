import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoiceLineRow } from './InvoiceLineRow'

describe('InvoiceLineRow', () => {
  it('renders line number and field values', () => {
    render(
      <InvoiceLineRow
        lineNumber={2}
        description="Widget"
        quantity={3}
        unitPrice={10.5}
        onDescriptionChange={vi.fn()}
        onQuantityChange={vi.fn()}
        onUnitPriceChange={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    expect(screen.getByPlaceholderText('Description')).toHaveValue('Widget')
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10.5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove line 2' })).toBeInTheDocument()
  })

  it('calls onDescriptionChange when description is edited', async () => {
    const user = userEvent.setup()
    const onDescriptionChange = vi.fn()

    render(
      <InvoiceLineRow
        lineNumber={1}
        description=""
        quantity={1}
        unitPrice={0}
        onDescriptionChange={onDescriptionChange}
        onQuantityChange={vi.fn()}
        onUnitPriceChange={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('Description'), 'A')

    expect(onDescriptionChange).toHaveBeenLastCalledWith('A')
  })

  it('calls onRemove when remove is clicked', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    render(
      <InvoiceLineRow
        lineNumber={4}
        description=""
        quantity={1}
        unitPrice={0}
        onDescriptionChange={vi.fn()}
        onQuantityChange={vi.fn()}
        onUnitPriceChange={vi.fn()}
        onRemove={onRemove}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Remove line 4' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
