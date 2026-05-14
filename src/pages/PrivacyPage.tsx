import { PageHeading } from '../components/ui/PageHeading'

export function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 text-sm text-gray-700">
      <PageHeading>Privacy Notice</PageHeading>
      <p>
        We collect the information you provide (such as account details, customers, items, and invoices) to run this service. Authentication and data storage are handled by our infrastructure providers under their own policies.
      </p>
      <p>
        We use your data only to operate the app and communicate with you about your account when needed. We do not sell or share your personal information.
      </p>
      <p className="text-xs text-gray-500">This summary is not legal advice. For questions, contact the operator of this application.</p>
    </div>
  )
}
