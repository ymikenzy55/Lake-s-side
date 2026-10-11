export const BRAND = {
  name: 'The Lakeside',
  short: 'Lakeside',
  tagline: 'Where calm meets clarity.',
  description:
    'The Lakeside is a calm, considered clothing brand: premium everyday wear in every size, colour and fit, made to slow down in.',
  logo: '/brand/lakeside-logo.png',
  mark: '/brand/lakeside-icon-512.png',
} as const;

export const SOCIALS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'whatsapp', label: 'WhatsApp' },
] as const;

export const GENDERS = [
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
] as const;
