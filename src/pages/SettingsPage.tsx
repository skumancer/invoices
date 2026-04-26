import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../contexts/useAuth'
import { useProfileContext } from '../contexts/useProfileContext'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/auth'
import { formatInvoiceNumber } from '../lib/invoice-number'
import { useInvoiceSequence } from '../hooks/useInvoiceSequence'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageScroll } from '../components/Layout/PageScroll'

const profileSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  tax_id: z.string().max(100).optional(),
})

const passwordSchema = z.object({
  password: z.string().min(6, 'At least 6 characters'),
})

const sequenceSchema = z.object({
  prefix: z.string().max(50).optional(),
  suffix: z.string().max(50).optional(),
  length: z.coerce.number().int().min(1).max(10).default(1),
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>
type SequenceForm = z.infer<typeof sequenceSchema>

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  email: 'Email and password',
}

function signInMethodLabels(identities: { provider: string }[] | undefined): string[] {
  if (!identities?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const i of identities) {
    if (seen.has(i.provider)) continue
    seen.add(i.provider)
    out.push(PROVIDER_LABEL[i.provider] ?? i.provider)
  }
  return out
}

export function SettingsPage() {
  const { user } = useAuth()
  const [resolvedUser, setResolvedUser] = useState<User | null>(null)
  const { profile, update: updateProfile } = useProfileContext()
  const { sequence, isLoading: sequenceLoading, updateSequence } = useInvoiceSequence(user?.id)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [sequenceMessage, setSequenceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sequenceSaving, setSequenceSaving] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: '', last_name: '', tax_id: '' },
  })
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })
  const sequenceForm = useForm<SequenceForm>({
    resolver: zodResolver(sequenceSchema) as Resolver<SequenceForm>,
    defaultValues: { prefix: '', suffix: '', length: 1 },
  })

  useEffect(() => {
    if (!user) {
      setResolvedUser(null)
      return
    }
    let cancelled = false
    void supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!cancelled && u) setResolvedUser(u)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const accountUser = resolvedUser ?? user
  const identities = accountUser?.identities ?? []
  const hasGoogle = identities.some((i) => i.provider === 'google')
  const hasEmailPassword = identities.some((i) => i.provider === 'email')
  const methodLabels = signInMethodLabels(identities)
  const methodsPending = Boolean(user && !resolvedUser && methodLabels.length === 0)

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        tax_id: profile.tax_id ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when profile loads
  }, [profile])

  useEffect(() => {
    if (sequence) {
      sequenceForm.reset({
        prefix: sequence.prefix ?? '',
        suffix: sequence.suffix ?? '',
        length: sequence.length ?? 1,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when sequence loads
  }, [sequence])

  const onProfileSubmit = async (data: ProfileForm) => {
    setProfileMessage(null)
    setProfileLoading(true)
    try {
      await updateProfile({
        first_name: data.first_name?.trim() || null,
        last_name: data.last_name?.trim() || null,
        tax_id: data.tax_id?.trim() || null,
      })
      setProfileMessage({ type: 'success', text: 'Profile updated.' })
    } catch (e) {
      setProfileMessage({ type: 'error', text: getAuthErrorMessage(e) })
    } finally {
      setProfileLoading(false)
    }
  }

  const onSequenceSubmit = async (data: SequenceForm) => {
    setSequenceMessage(null)
    setSequenceSaving(true)
    try {
      await updateSequence({
        prefix: data.prefix?.trim() ?? '',
        suffix: data.suffix?.trim() ?? '',
        length: data.length ?? 1,
      })
      setSequenceMessage({ type: 'success', text: 'Invoice number format updated.' })
    } catch (e) {
      setSequenceMessage({ type: 'error', text: getAuthErrorMessage(e) })
    } finally {
      setSequenceSaving(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    setMessage(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) {
        setMessage({ type: 'error', text: getAuthErrorMessage(error) })
        return
      }
      setMessage({ type: 'success', text: 'Password updated.' })
      passwordForm.reset()
    } catch (e) {
      setMessage({ type: 'error', text: getAuthErrorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScroll>
        <div className="max-w-lg space-y-6">
          <PageHeading>Settings</PageHeading>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Account</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              {accountUser?.email && (
                <p>
                  <span className="text-gray-500">Email</span>
                  <br />
                  <span className="font-medium text-gray-900">{accountUser.email}</span>
                </p>
              )}
              <div>
                <p className="text-gray-500 mb-1">Sign-in</p>
                {methodsPending ? (
                  <p className="text-gray-600">Loading sign-in methods…</p>
                ) : methodLabels.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-gray-900">
                    {methodLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">—</p>
                )}
              </div>
              {hasGoogle && (
                <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                  This account uses Google to sign in. Manage your Google account at{' '}
                  <a href="https://myaccount.google.com" className="text-gray-800 underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                    myaccount.google.com
                  </a>
                  .
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Password</h3>
            </CardHeader>
            <CardContent>
              {hasEmailPassword ? (
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  {message ? (
                    <InlineAlert variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</InlineAlert>
                  ) : null}
                  <Input label="New password" type="password" autoComplete="new-password" error={passwordForm.formState.errors.password?.message} {...passwordForm.register('password')} />
                  <Button type="submit" size="sm" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</Button>
                </form>
              ) : (
                hasGoogle && (
                  <p className="text-sm text-gray-600">
                    You signed in with Google only. There is no password to change for this app.
                  </p>
                )
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Profile</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                {profileMessage ? (
                  <InlineAlert variant={profileMessage.type === 'success' ? 'success' : 'error'}>{profileMessage.text}</InlineAlert>
                ) : null}
                <Input label="First name" {...profileForm.register('first_name')} />
                <Input label="Last name" {...profileForm.register('last_name')} />
                <Input label="Tax / ID number" placeholder="Optional" {...profileForm.register('tax_id')} />
                <Button type="submit" size="sm" disabled={profileLoading}>
                  {profileLoading ? 'Saving…' : 'Save profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Invoice number format</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={sequenceForm.handleSubmit(onSequenceSubmit)} className="space-y-4">
                {sequenceMessage ? (
                  <InlineAlert variant={sequenceMessage.type === 'success' ? 'success' : 'error'}>{sequenceMessage.text}</InlineAlert>
                ) : null}
                <Input label="Prefix" placeholder="e.g. INV-" {...sequenceForm.register('prefix')} />
                <Input label="Number of digits" type="number" min={1} max={10} error={sequenceForm.formState.errors.length?.message} {...sequenceForm.register('length')} />
                <Input label="Suffix" placeholder="e.g. -2025" {...sequenceForm.register('suffix')} />
                {!sequenceLoading && sequence && (
                  <p className="text-sm text-gray-600">
                    Next number: <span className="font-medium">{formatInvoiceNumber(sequenceForm.watch('prefix') ?? '', sequenceForm.watch('length') ?? 1, sequenceForm.watch('suffix') ?? '', (sequence?.counter ?? 0) + 1)}</span>
                  </p>
                )}
                <Button type="submit" size="sm" disabled={sequenceSaving || sequenceLoading}>
                  {sequenceSaving ? 'Saving…' : 'Save format'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Legal</h3>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-3 gap-y-2 text-sm text-gray-600">
              <Link to="/privacy" className="underline hover:text-gray-800">
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link to="/terms" className="underline hover:text-gray-800">
                Terms
              </Link>
            </CardContent>
          </Card>
          <div className="flex justify-center pb-4">
            <StatusBadge status={import.meta.env.MODE === 'production' ? 'production' : 'development'} />
          </div>
        </div>
      </PageScroll>
    </div>
  )
}
