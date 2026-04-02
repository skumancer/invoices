import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ProfileProvider } from './contexts/ProfileProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/Layout/AppLayout'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerFormPage } from './pages/CustomerFormPage'
import { ItemsPage } from './pages/ItemsPage'
import { ItemFormPage } from './pages/ItemFormPage'
import { SettingsPage } from './pages/SettingsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { PublicLegalWrapper } from './pages/PublicLegalWrapper'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/privacy"
            element={
              <PublicLegalWrapper>
                <PrivacyPage />
              </PublicLegalWrapper>
            }
          />
          <Route
            path="/terms"
            element={
              <PublicLegalWrapper>
                <TermsPage />
              </PublicLegalWrapper>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProfileProvider>
                  <AppLayout />
                </ProfileProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/invoices" replace />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/new" element={<ItemFormPage />} />
            <Route path="items/:id/edit" element={<ItemFormPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
