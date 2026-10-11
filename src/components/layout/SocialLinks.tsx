import { IconInstagram, IconMail, IconPhone, IconTikTok, IconWhatsApp } from './Icons';
import { socialLinks, type ContactSettings, type SocialLink } from '@/lib/social';

const ICONS: Record<SocialLink['kind'], typeof IconWhatsApp> = {
  whatsapp: IconWhatsApp,
  tiktok: IconTikTok,
  instagram: IconInstagram,
  phone: IconPhone,
  mail: IconMail,
};

/**
 * Round icon buttons for every contact channel. Numbers and addresses stay behind the icons;
 * the label is available to screen readers and as a hover tooltip.
 */
export function SocialLinks({
  settings,
  only,
  size = 'md',
  tone = 'soft',
  className = '',
}: {
  settings: ContactSettings;
  only?: SocialLink['kind'][];
  size?: 'sm' | 'md' | 'lg';
  tone?: 'soft' | 'ink';
  className?: string;
}) {
  const links = socialLinks(settings).filter((l) => !only || only.includes(l.kind));
  const dim = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const icon = size === 'lg' ? 26 : size === 'sm' ? 18 : 21;
  const look =
    tone === 'ink'
      ? 'bg-ink text-white hover:bg-lake'
      : 'bg-surface text-ink hover:bg-ink hover:text-white';

  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((l) => {
        const Icon = ICONS[l.kind];
        const wa = l.kind === 'whatsapp' && links.filter((x) => x.kind === 'whatsapp').length > 1;
        return (
          <li key={l.key}>
            <a
              href={l.href}
              aria-label={l.label}
              title={l.label}
              {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`relative grid ${dim} place-items-center rounded-full transition-all duration-200 hover:-translate-y-0.5 ${look}`}
            >
              <Icon width={icon} height={icon} />
              {wa && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lake px-1 text-[9px] font-bold text-white">
                  {l.label.match(/line (\d)/)?.[1]}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
