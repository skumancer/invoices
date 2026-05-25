import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useCustomers, useCustomer } from '../hooks/useCustomers'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { PageLoadingState } from '../components/Layout/PageLoadingState'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { PageScroll } from '../components/Layout/PageScroll'
import type { MobileFormShellProps } from '../components/Layout/mobileFormShell'
import type { CustomerType } from '../types/database'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  type: z.enum(['company', 'person']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CustomerFormPage({ variant = 'page', onClose, onSuccess }: MobileFormShellProps = {}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { customer, isLoading: loadingCustomer } = useCustomer(id ?? null)
  const { create, update } = useCustomers()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'person', email: '', phone: '', address: '', tax_id: '' },
  })

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        type: customer.type,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        tax_id: customer.tax_id ?? '',
      })
    }
  }, [customer, reset])

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    if (!user) return
    try {
      if (id) {
        await update(id, {
          name: data.name,
          type: data.type as CustomerType,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          tax_id: data.tax_id?.trim() || null,
        })
        if (variant === 'modal') onSuccess?.()
        else navigate('/customers')
      } else {
        await create({
          name: data.name,
          type: data.type as CustomerType,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          tax_id: data.tax_id?.trim() || null,
          user_id: user.id,
        })
        if (variant === 'modal') onSuccess?.()
        else navigate('/customers')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (id && loadingCustomer) return <PageLoadingState layout="content" />

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError ? <InlineAlert variant="error">{submitError}</InlineAlert> : null}
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Select label="Type" {...register('type')}>
        <option value="person">Person</option>
        <option value="company">Company</option>
      </Select>
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Phone" {...register('phone')} />
      <Input label="Address" {...register('address')} />
      <Input label="Tax / ID number" placeholder="Optional" {...register('tax_id')} />
      <div className={variant === 'modal' ? 'flex gap-2' : undefined}>
        {variant === 'modal' ? (
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          fullWidth={variant === 'modal' ? undefined : true}
          className={variant === 'modal' ? 'flex-1' : undefined}
        >
          {id ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )

  if (variant === 'modal') {
    return form
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScroll>
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <PageHeading>{id ? 'Edit customer' : 'New customer'}</PageHeading>
              <Link to="/customers">
                <Button variant="ghost" size="sm">Cancel</Button>
              </Link>
            </CardHeader>
            <CardContent>{form}</CardContent>
          </Card>
        </div>
      </PageScroll>
    </div>
  )
}
