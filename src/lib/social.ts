/** Contact channels from settings. Numbers are never rendered as text, only behind icon links. */
export interface ContactSettings {
  whatsapp: string;
  contact_phone: string;
  contact_email: string;
  instagram: string;
  tiktok: string;
}

/** "233598223472, 233204768685" -> ['233598223472', '233204768685'] */
export function whatsappNumbers(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((n) => n.replace(/\D/g, ''))
    .filter((n) => n.length >= 9);
}

export function whatsappLink(number: string, text?: string) {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
  kind: 'whatsapp' | 'tiktok' | 'instagram' | 'phone' | 'mail';
  external: boolean;
}

/** Every channel as an icon link, in display order. */
export function socialLinks(s: ContactSettings, greeting = 'Hi The Lakeside, '): SocialLink[] {
  const wa = whatsappNumbers(s.whatsapp);
  const out: SocialLink[] = wa.map((n, i) => ({
    key: `wa-${n}`,
    label: wa.length > 1 ? `Chat on WhatsApp (line ${i + 1})` : 'Chat on WhatsApp',
    href: whatsappLink(n, greeting),
    kind: 'whatsapp',
    external: true,
  }));
  if (s.tiktok) out.push({ key: 'tiktok', label: 'The Lakeside on TikTok', href: s.tiktok, kind: 'tiktok', external: true });
  if (s.instagram) out.push({ key: 'instagram', label: 'The Lakeside on Instagram', href: s.instagram, kind: 'instagram', external: true });
  if (s.contact_phone) out.push({ key: 'phone', label: 'Call us', href: `tel:${s.contact_phone.replace(/\s/g, '')}`, kind: 'phone', external: false });
  if (s.contact_email) out.push({ key: 'mail', label: 'Email us', href: `mailto:${s.contact_email}`, kind: 'mail', external: false });
  return out;
}
