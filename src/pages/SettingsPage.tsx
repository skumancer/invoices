import { useState, useEffect } from 'react'
import { useProfileContext } from '../contexts/ProfileContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'

const profileSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  tax_id: z.string().max(100).optional(),
})

const passwordSchema = z.object({
  password: z.string().min(6, 'At least 6 characters'),
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function SettingsPage() {
  const { profile, update: updateProfile } = useProfileContext()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: '', last_name: '', tax_id: '' },
  })
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

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
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      <Card>
        <CardHeader>
          <h3 className="font-medium text-gray-900">Profile</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            {profileMessage && (
              <p className={`text-sm p-2 rounded-lg ${profileMessage.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {profileMessage.text}
              </p>
            )}
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
          <h3 className="font-medium text-gray-900">Change password</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {message && (
              <p className={`text-sm p-2 rounded-lg ${message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {message.text}
              </p>
            )}
            <Input label="New password" type="password" autoComplete="new-password" error={passwordForm.formState.errors.password?.message} {...passwordForm.register('password')} />
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
