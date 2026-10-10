'use client';

import { useState, useTransition } from 'react';
import { changePasswordAction, updateProfileAction } from '@/domains/users/actions';
import { PasswordField } from '@/components/ui/PasswordField';

type Msg = { ok: boolean; text: string } | null;

export function AccountForms({ profile }: { profile: { firstName: string; lastName: string; phone: string; email: string } }) {
  const [pm, setPm] = useState<Msg>(null);
  const [wm, setWm] = useState<Msg>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6">
      <form method="post"
        className="card grid gap-4 p-5 md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r = await updateProfileAction({ firstName: f.get('firstName'), lastName: f.get('lastName'), phone: f.get('phone') });
            setPm({ ok: r.success, text: r.success ? 'Profile saved' : (r.error ?? 'Failed') });
          });
        }}
      >
        <h2 className="text-[20px]">Profile</h2>
        <div><label className="label">Email</label><input className="field bg-surface" value={profile.email} disabled readOnly /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="fn">First name</label><input id="fn" name="firstName" defaultValue={profile.firstName} required className="field" /></div>
          <div><label className="label" htmlFor="ln">Last name</label><input id="ln" name="lastName" defaultValue={profile.lastName} className="field" /></div>
        </div>
        <div><label className="label" htmlFor="ph">Phone</label><input id="ph" name="phone" type="tel" defaultValue={profile.phone} className="field" /></div>
        {pm && <p role="status" className={`alert ${pm.ok ? 'alert-ok' : 'alert-error'}`}>{pm.text}</p>}
        <button className="btn btn-primary" disabled={pending}>Save profile</button>
      </form>

      <form method="post"
        className="card grid gap-4 p-5 md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          if (String(f.get('next')) !== String(f.get('confirm'))) return setWm({ ok: false, text: "New passwords don't match" });
          start(async () => {
            const r = await changePasswordAction({ current: f.get('current'), next: f.get('next') });
            setWm({ ok: r.success, text: r.success ? 'Password updated. Other devices were signed out.' : (r.error ?? 'Failed') });
            if (r.success) form.reset();
          });
        }}
      >
        <h2 className="text-[20px]">Change password</h2>
        <PasswordField label="Current password" name="current" autoComplete="current-password" />
        <PasswordField label="New password" name="next" autoComplete="new-password" minLength={8} hint="8+ characters with upper and lower case letters and a number." />
        <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" minLength={8} />
        {wm && <p role="status" className={`alert ${wm.ok ? 'alert-ok' : 'alert-error'}`}>{wm.text}</p>}
        <button className="btn btn-ghost" disabled={pending}>Update password</button>
      </form>
    </div>
  );
}
