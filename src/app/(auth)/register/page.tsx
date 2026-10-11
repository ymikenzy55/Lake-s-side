import { RegisterForm } from '@/components/auth/RegisterForm';
import { googleConfigured } from '@/services/google';

export const metadata = { title: 'Create account' };
// Read Google config per request, not at build time.
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return <RegisterForm google={googleConfigured()} />;
}
