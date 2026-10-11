import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconBag = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>);
export const IconUser = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>);
export const IconHome = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>);
export const IconGrid = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>);
export const IconMenu = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconChevron = (p: SVGProps<SVGSVGElement>) => (<svg {...base({ width: 14, height: 14, ...p })}><path d="m6 9 6 6 6-6" /></svg>);
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (<svg {...base({ width: 16, height: 16, ...p })}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IconBack = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>);
export const IconHeart = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9Z" /></svg>);
export const IconTruck = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M2 6h11v10H2zM13 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const IconReturn = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M9 7H4v5" /><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8" /></svg>);
export const IconSpark = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (<svg {...base({ width: 18, height: 18, ...p })}><path d="M12 5v14M5 12h14" /></svg>);
export const IconMinus = (p: SVGProps<SVGSVGElement>) => (<svg {...base({ width: 18, height: 18, ...p })}><path d="M5 12h14" /></svg>);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (<svg {...base({ width: 18, height: 18, ...p })}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (<svg {...base({ width: 18, height: 18, ...p })}><path d="m5 12 5 5 9-10" /></svg>);
export const IconPin = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
