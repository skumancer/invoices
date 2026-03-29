import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCustomers, useCustomer } from '../hooks/useCustomers'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
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

export function CustomerFormPage() {
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
        navigate('/customers')
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
        navigate('/customers')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (id && loadingCustomer) return <LoadingText />

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <PageHeading>{id ? 'Edit customer' : 'New customer'}</PageHeading>
          <Link to="/customers">
            <Button variant="ghost" size="sm">Cancel</Button>
          </Link>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" fullWidth>{id ? 'Update' : 'Create'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
