import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
})

type FormData = z.infer<typeof schema>
type GoogleCredentialResponse = { credential?: string }

declare global {
  interface Window {
    handleSignInWithGoogle?: (response: GoogleCredentialResponse) => Promise<void>
  }
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/invoices'
  const message = (location.state as { message?: string })?.message
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.handleSignInWithGoogle = async (response: GoogleCredentialResponse) => {
      setError(null)
      try {
        if (!response.credential) {
          setError('Google credential missing.')
          return
        }

        const { error: err } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        })

        if (err) {
          setError(getAuthErrorMessage(err))
          return
        }

        navigate(from, { replace: true })
      } catch (e) {
        setError(getAuthErrorMessage(e))
      }
    }

    if (document.getElementById('google-identity-services')) return

    const script = document.createElement('script')
    script.id = 'google-identity-services'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    return () => {
      delete window.handleSignInWithGoogle
    }
  }, [from, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword(data)
      if (err) {
        setError(getAuthErrorMessage(err))
        return
      }
      navigate(from, { replace: true })
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
          <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {message && (
              <p className="text-sm text-green-700 bg-green-50 p-2 rounded-lg">{message}</p>
            )}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            )}
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>
            <div
              id="g_id_onload"
              data-client_id={googleClientId}
              data-context="use"
              data-ux_mode="popup"
              data-callback="handleSignInWithGoogle"
              data-nonce=""
              data-auto_prompt="false"
              data-auto_select="true"
              data-itp_support="true"
              data-use_fedcm_for_prompt="true"
            />
            <div
              className="g_id_signin flex justify-center"
              data-type="standard"
              data-shape="rectangular"
              data-theme="outline"
              data-text="continue_with"
              data-size="large"
              data-logo_alignment="center"
              data-width="350"
            />
          </form>
          <p className="mt-4 text-sm text-gray-600 text-center space-y-1">
            <Link to="/forgot-password" className="block font-medium text-gray-900 hover:underline">Forgot password?</Link>
            No account? <Link to="/signup" className="font-medium text-gray-900 hover:underline">Sign up</Link>
          </p>
          <p className="mt-4 text-center text-xs text-gray-500">
            <Link to="/privacy" className="underline hover:text-gray-800">
              Privacy
            </Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="underline hover:text-gray-800">
              Terms
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
