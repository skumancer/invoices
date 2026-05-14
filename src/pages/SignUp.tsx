import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { InlineAlert } from '../components/ui/InlineAlert'
import { getAuthRedirectUrl } from '../lib/platform/auth'

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
  first_name: z.string().min(1, 'Required').max(100),
  last_name: z.string().min(1, 'Required').max(100),
})

type FormData = z.infer<typeof schema>

export function SignUp() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    setLoading(true)
    try {
      const redirectTo = getAuthRedirectUrl('/')
      const { data: authData, error: err } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectTo,
          data: { first_name: data.first_name.trim(), last_name: data.last_name.trim() },
        },
      })
      if (err) {
        setError(getAuthErrorMessage(err))
        return
      }
      setSuccess(true)
      if (authData.session) {
        setTimeout(() => navigate('/invoices', { replace: true }), 1500)
      } else {
        setTimeout(() => navigate('/login', { replace: true, state: { message: 'Check your email to confirm your account.' } }), 1500)
      }
    } catch (e) {
      setError(getAuthErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-gray-700 text-center">Check your email to confirm your account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">Sign up</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
            <Input label="First name" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-gray-600 text-center">
            Already have an account? <Link to="/login" className="font-medium text-gray-900 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
