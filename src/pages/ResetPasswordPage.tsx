import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'

const schema = z.object({
  password: z.string().min(6, 'At least 6 characters'),
})

type FormData = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const hasRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery')

    const check = () => {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (session) {
            if (hasRecoveryHash) window.history.replaceState(null, '', window.location.pathname)
            setReady(true)
            return
          }
          if (hasRecoveryHash) return
          navigate('/forgot-password', { replace: true })
        })
        .catch(() => navigate('/forgot-password', { replace: true }))
    }

    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check())
    return () => subscription.unsubscribe()
  }, [navigate])

  const onSubmit = async (data: FormData) => {
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: data.password })
      if (err) {
        setError(getAuthErrorMessage(err))
        return
      }
      await supabase.auth.signOut()
      navigate('/login', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } })
    } catch (e) {
      setError(getAuthErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return <LoadingText centered />
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">Set new password</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-gray-600 text-center">
            <Link to="/login" className="font-medium text-gray-900 hover:underline">Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
