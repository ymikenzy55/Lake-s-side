import { getSettings } from '@/domains/settings/service';
import { PageHeader } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { paystackConfigured } from '@/services/paystack';
import { emailProvider } from '@/services/brevo';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" subtitle="Store details, delivery and payments" />
      <SettingsForm initial={s} paystackReady={paystackConfigured()} emailReady={emailProvider() !== null} />
    </>
  );
}
