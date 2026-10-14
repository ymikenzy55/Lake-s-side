'use client';

import { useState } from 'react';
import { Flash, Toggle, useAdminRun } from './hooks';
import { saveSettingsAction } from '@/domains/admin/content-actions';
import type { Settings } from '@/domains/settings/service';

/** `showStatus`: connection badges, only for the store owner (super admin). Setup steps live in docs/DEPLOYMENT.md. */
export function SettingsForm({ initial, paystackReady, emailReady, showStatus = false }: { initial: Settings; paystackReady: boolean; emailReady: boolean; showStatus?: boolean }) {
  const { run, pending, msg } = useAdminRun();
  const [s, setS] = useState<Settings>(initial);
  const set = (k: keyof Settings, v: string) => setS((x) => ({ ...x, [k]: v }));
  const inp = (k: keyof Settings, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} className="field" value={s[k]} onChange={(e) => set(k, e.target.value)} {...props} /></div>
  );

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="card grid gap-4 p-4 sm:p-6">
        <h2 className="text-[18px]">Storefront</h2>
        {inp('store_name', 'Store name')}
        {inp('tagline', 'Tagline')}
        <Toggle label="Show announcement bar" checked={s.announcement_enabled === 'true'} onChange={(v) => set('announcement_enabled', String(v))} />
        {inp('announcement_text', 'Announcement text', { maxLength: 160 })}
        {inp('hero_autoplay_ms', 'Hero slide time (ms, 1500 to 4000)', { type: 'number', min: 1500, max: 4000, step: 100 })}
      </section>

      <section className="card grid gap-4 p-4 sm:p-6">
        <h2 className="text-[18px]">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {inp('contact_email', 'Email (also receives new-order alerts)', { type: 'email' })}
          {inp('contact_phone', 'Phone')}
          {inp('whatsapp', 'WhatsApp numbers (digits with country code, separate several with commas)')}
          {inp('address', 'Location')}
          {inp('instagram', 'Instagram link', { placeholder: 'https://instagram.com/…' })}
          {inp('tiktok', 'TikTok link', { placeholder: 'https://www.tiktok.com/@yourhandle' })}
        </div>
      </section>

      <section className="card grid gap-4 p-4 sm:p-6">
        <h2 className="text-[18px]">Delivery & payments</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {inp('shipping_fee', 'Delivery fee (GHS)', { type: 'number', min: 0, step: '0.01' })}
          {inp('free_shipping_threshold', 'Free delivery over (GHS)', { type: 'number', min: 0, step: '0.01' })}
        </div>
        <Toggle label="Accept cash on delivery" checked={s.cod_enabled === 'true'} onChange={(v) => set('cod_enabled', String(v))} />
        {paystackReady && <Toggle label="Accept mobile money / card (Paystack)" checked={s.paystack_enabled === 'true'} onChange={(v) => set('paystack_enabled', String(v))} />}
        {showStatus && (
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span className={`badge ${paystackReady ? 'badge-ok' : 'badge-warn'}`}>Online payment {paystackReady ? 'connected' : 'not connected'}</span>
            <span className={`badge ${emailReady ? 'badge-ok' : 'badge-warn'}`}>Order emails {emailReady ? 'connected' : 'not connected'}</span>
          </div>
        )}
      </section>

      <div className="pb-safe sticky bottom-[76px] z-20 grid gap-2 rounded-3xl border border-line bg-white/95 p-3 backdrop-blur lg:bottom-4">
        <Flash msg={msg} />
        <button className="btn btn-primary" disabled={pending} onClick={() => run(() => saveSettingsAction(s))}>{pending ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  );
}
