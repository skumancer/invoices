import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useInvoiceItem, useInvoiceItems } from '../hooks/useInvoiceItems'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { PageScroll } from '../components/Layout/PageScroll'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  unit_price: z.coerce.number().min(0, 'Must be ≥ 0'),
})

type FormData = z.infer<typeof schema>

export function ItemFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { item, isLoading: loadingItem } = useInvoiceItem(id ?? null)
  const { create, update } = useInvoiceItems()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { name: '', description: '', unit_price: 0 },
  })

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description ?? '',
        unit_price: Number(item.unit_price),
      })
    }
  }, [item, reset])

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    if (!user) return
    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        unit_price: data.unit_price,
        user_id: user.id,
      }
      if (id) {
        await update(id, payload)
        navigate('/items')
      } else {
        await create(payload)
        navigate('/items')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (id && loadingItem) return <LoadingText />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScroll>
        <div className="mx-auto w-full max-w-2xl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <PageHeading>{id ? 'Edit item' : 'New item'}</PageHeading>
              <Link to="/items">
                <Button variant="ghost" size="sm">Cancel</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((data) => onSubmit(data as FormData))} className="space-y-4">
                {submitError ? <InlineAlert variant="error">{submitError}</InlineAlert> : null}
                <Input label="Name" error={errors.name?.message} {...register('name')} />
                <Input label="Description" {...register('description')} />
                <Input label="Unit price" type="number" step="0.01" prefix="$" placeholder="0.00" error={errors.unit_price?.message} {...register('unit_price')} />
                <Button type="submit" fullWidth>{id ? 'Update' : 'Create'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageScroll>
    </div>
  )
}
