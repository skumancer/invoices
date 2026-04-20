import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { InlineAlert } from '../components/ui/InlineAlert'
import { StatusBadge } from '../components/ui/StatusBadge'
import { isNativePlatform } from '../lib/platform/capacitor'
import { getAuthRedirectUrl } from '../lib/platform/auth'

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
  const [googleLoading, setGoogleLoading] = useState(false)
  const isNative = isNativePlatform()

  useEffect(() => {
    if (!isNative) return
    document.documentElement.classList.add('app-shell-scroll-locked')
    document.body.classList.add('app-shell-scroll-locked')
    return () => {
      document.documentElement.classList.remove('app-shell-scroll-locked')
      document.body.classList.remove('app-shell-scroll-locked')
    }
  }, [isNative])

  useEffect(() => {
    if (isNative) return

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
  }, [from, navigate, isNative])

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

  const handleGoogleNativeSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl('/invoices'),
          skipBrowserRedirect: true,
        },
      })
      if (err || !data?.url) {
        setError(getAuthErrorMessage(err ?? new Error('Could not start Google sign in.')))
        return
      }
      await Browser.open({ url: data.url, presentationStyle: 'fullscreen' })
    } catch (e) {
      setError(getAuthErrorMessage(e))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-4 bg-gray-50 px-4',
        isNative
          ? 'h-[100dvh] overflow-hidden pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]'
          : 'min-h-screen gap-8 py-4',
      ].join(' ')}
    >
      <header className="text-center max-w-sm space-y-2 md:space-y-3">
        <img
          src="/send-invoices-icon.png"
          alt=""
          className={[
            'mx-auto rounded-2xl shadow-sm ring-1 ring-gray-200/80 h-auto',
            isNative ? 'w-28' : 'w-[200px]',
          ].join(' ')}
        />
        <h1 className="text-xl font-semibold text-gray-900">Send Invoices Online</h1>
        {!isNative && (
          <p className="text-sm text-gray-600 leading-relaxed">
            Create invoices, manage customers and items, and email them from one simple place. Simple, no ads, no tracking.
          </p>
        )}
      </header>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Sign in</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {message ? <InlineAlert variant="success">{message}</InlineAlert> : null}
            {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
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
            {isNative ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleGoogleNativeSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? 'Opening Google…' : 'Continue with Google'}
              </Button>
            ) : (
              <>
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
              </>
            )}
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
      <StatusBadge status={import.meta.env.PROD ? 'production' : 'development'} />
    </div>
  )
}
