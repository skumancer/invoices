import { PageHeading } from '../components/ui/PageHeading'

export function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 text-sm text-gray-700">
      <PageHeading>Terms of service</PageHeading>
      <p>
        By using this application you agree to use it lawfully and to keep your login credentials secure. You are responsible for the accuracy of invoices and customer data you enter.
      </p>
      <p>
        The service is provided &quot;as is&quot; without warranties. We may change, suspend, or discontinue features with reasonable notice when possible.
      </p>
      <p className="text-xs text-gray-500">This is a short summary, not a substitute for professional legal terms where required.</p>
    </div>
  )
}
