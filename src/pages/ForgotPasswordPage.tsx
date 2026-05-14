import { useState } from 'react'
import { Link } from 'react-router-dom'
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
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    setLoading(true)
    try {
      const redirectTo = getAuthRedirectUrl('/reset-password')
      const { error: err } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo })
      if (err) {
        setError(getAuthErrorMessage(err))
        return
      }
      setSent(true)
    } catch (e) {
      setError(getAuthErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-gray-600">
              Check your email for a link to reset your password. The link expires in 1 hour.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
              <Input label="Email" type="email" {...register('email')} />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-sm text-gray-600 text-center">
            <Link to="/login" className="font-medium text-gray-900 hover:underline">Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
