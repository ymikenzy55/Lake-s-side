'use client';

import { useState } from 'react';
import { Flash, useAdminRun } from './hooks';
import { PasswordField } from '@/components/ui/PasswordField';
import { createAdminAction, deleteUserAction, resetUserPasswordAction, setUserRoleAction } from '@/domains/admin/team-actions';

export interface Member {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  lastLogin: string | null;
  isSelf: boolean;
}

const ROLE_LABEL = { ADMIN: 'Admin', SUPER_ADMIN: 'Super admin', CUSTOMER: 'Customer (remove access)' } as const;

function MemberRow({ m }: { m: Member }) {
  const { run, pending, msg } = useAdminRun();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {m.name || 'No name'}
            <span className={`badge ${m.role === 'SUPER_ADMIN' ? 'badge-ink' : ''}`}>{ROLE_LABEL[m.role]}</span>
            {m.isSelf && <span className="badge badge-ok">You</span>}
            {!m.isActive && <span className="badge badge-bad">Disabled</span>}
          </p>
          <p className="truncate text-[13px] text-muted">{m.email}</p>
          <p className="text-[12px] text-muted">{m.lastLogin ? `Last sign-in ${m.lastLogin}` : 'Never signed in'}</p>
        </div>

        {!m.isSelf && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`role-${m.id}`}>Change role</label>
            <select
              id={`role-${m.id}`}
              className="field !min-h-9 !w-auto !rounded-full !py-1 text-[13px]"
              value={m.role}
              disabled={pending}
              onChange={(e) => {
                const role = e.target.value as 'ADMIN' | 'SUPER_ADMIN' | 'CUSTOMER';
                run(() => setUserRoleAction(m.id, role), {
                  confirm: role === 'CUSTOMER' ? `Remove all admin access for ${m.email}?` : role === 'SUPER_ADMIN' ? `Make ${m.email} a SUPER admin? They will be able to manage all admins.` : undefined,
                });
              }}
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
              <option value="CUSTOMER">Customer (remove access)</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setResetOpen((o) => !o)} aria-expanded={resetOpen}>Reset password</button>
            <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(() => deleteUserAction(m.id), { confirm: `Permanently delete ${m.email}? Their past orders are kept.` })}>Delete</button>
          </div>
        )}
      </div>

      {resetOpen && !m.isSelf && (
        <form
          method="post"
          className="mt-4 grid gap-3 border-t border-line pt-4 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => resetUserPasswordAction(m.id, String(f.get('password'))), { onDone: (r) => r.ok && setResetOpen(false) });
          }}
        >
          <PasswordField label="New password for this person" name="password" autoComplete="new-password" minLength={8} hint="8+ characters with upper and lower case letters and a number." />
          <button className="btn btn-primary btn-sm w-fit" disabled={pending}>Set password</button>
        </form>
      )}
      <div className="mt-2"><Flash msg={msg} /></div>
    </li>
  );
}

export function TeamManager({ members }: { members: Member[] }) {
  const { run, pending, msg } = useAdminRun();
  const [adding, setAdding] = useState(false);

  return (
    <div className="grid gap-6">
      <section className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px]">Add an admin</h2>
            <p className="hint">They sign in on the normal login page and are taken to the admin dashboard.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>{adding ? 'Close' : 'Add admin'}</button>
        </div>
        {adding && (
          <form
            method="post"
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              run(
                () => createAdminAction({ email: f.get('email'), firstName: f.get('firstName'), lastName: f.get('lastName'), password: f.get('password'), role: f.get('role') }),
                { onDone: (r) => { if (r.ok) { form.reset(); setAdding(false); } } }
              );
            }}
          >
            <div><label className="label" htmlFor="a-fn">First name</label><input id="a-fn" name="firstName" required className="field" /></div>
            <div><label className="label" htmlFor="a-ln">Last name</label><input id="a-ln" name="lastName" className="field" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="a-em">Email</label><input id="a-em" name="email" type="email" required className="field" autoComplete="off" /></div>
            <div>
              <label className="label" htmlFor="a-role">Role</label>
              <select id="a-role" name="role" defaultValue="ADMIN" className="field"><option value="ADMIN">Admin (manages the shop)</option><option value="SUPER_ADMIN">Super admin (also manages admins)</option></select>
            </div>
            <PasswordField label="Temporary password" name="password" autoComplete="new-password" minLength={8} hint="They can change it from My account." />
            <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? 'Creating…' : 'Create admin'}</button></div>
          </form>
        )}
        <div className="mt-3"><Flash msg={msg} /></div>
      </section>

      <ul className="grid gap-3">
        {members.map((m) => <MemberRow key={m.id} m={m} />)}
      </ul>
    </div>
  );
}
