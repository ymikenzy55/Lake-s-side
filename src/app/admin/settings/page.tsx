import { getSettings } from '@/domains/settings/service';
import { PageHeader } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { paystackConfigured } from '@/services/paystack';
import { emailProvider } from '@/services/brevo';
import { getSessionUser } from '@/lib/auth/session';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const [s, me] = await Promise.all([getSettings(), getSessionUser()]);
  return (
    <>
      <PageHeader title="Settings" subtitle="Store details, delivery and payments" />
      <SettingsForm initial={s} paystackReady={paystackConfigured()} emailReady={emailProvider() !== null} showStatus={me?.role === 'SUPER_ADMIN'} />
    </>
  );
}
