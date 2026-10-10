import { useId, type ReactNode } from 'react';

/**
 * Procedural SVG garments. Everything is vector, so artwork stays razor sharp at any
 * size and can be recoloured by passing a hex colour (e.g. the shopper's selected colour).
 */

export const GARMENT_TYPES = [
  { value: 'tee', label: 'T-shirt' },
  { value: 'polo', label: 'Polo' },
  { value: 'hoodie', label: 'Hoodie / Sweatshirt' },
  { value: 'dress', label: 'Dress' },
  { value: 'trousers', label: 'Trousers / Joggers' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'skirt', label: 'Skirt' },
  { value: 'cap', label: 'Cap' },
] as const;

/** Everything a product can be: the clothing art types plus a neutral "other product". */
export const PRODUCT_TYPES = [...GARMENT_TYPES, { value: 'other', label: 'Other product (shoes, bags, accessories…)' }] as const;

export type GarmentType = (typeof GARMENT_TYPES)[number]['value'];
export type GarmentView = 'front' | 'back' | 'detail' | 'studio';
export const GARMENT_VIEWS: { value: GarmentView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'detail', label: 'Fabric detail' },
  { value: 'studio', label: 'Studio' },
];

/* ───────── colour helpers ───────── */
const HEX = /^#[0-9a-fA-F]{6}$/;
export function safeColor(c: string | null | undefined, fallback = '#1c1c20'): string {
  return c && HEX.test(c) ? c : fallback;
}
export function mix(hex: string, target: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(target);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export interface Tone {
  base: string;
  dark: string;
  deep: string;
  light: string;
  line: string;
  isLight: boolean;
}
export function tones(color: string): Tone {
  const base = safeColor(color);
  const isLight = luminance(base) > 0.72;
  return {
    base,
    dark: mix(base, '#000000', 0.16),
    deep: mix(base, '#000000', 0.34),
    light: mix(base, '#ffffff', 0.28),
    line: isLight ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.16)',
    isLight,
  };
}

/* ───────── garment geometry ───────── */
interface Spec {
  /** shapes painted behind the body (e.g. hood) */
  behind?: ReactNode;
  /** main silhouette path */
  body: string;
  /** painted inside the silhouette clip (folds, ambient occlusion) */
  inside: ReactNode;
  /** painted over the silhouette (ribbing, pockets, stitching) */
  top: ReactNode;
  /** crop for the “detail” view */
  detailBox: string;
}

const fold = (d: string, o = 0.1) => <path d={d} fill="none" stroke="#000" strokeOpacity={o} strokeWidth={3} strokeLinecap="round" />;
const hi = (d: string, o = 0.18) => <path d={d} fill="none" stroke="#fff" strokeOpacity={o} strokeWidth={4} strokeLinecap="round" />;
const stitch = (d: string, c: string) => <path d={d} fill="none" stroke={c} strokeWidth={1.4} strokeDasharray="4 4" strokeLinecap="round" />;

function spec(type: GarmentType, view: GarmentView, t: Tone, f: string): Spec {
  const back = view === 'back';
  const rib = t.dark;
  switch (type) {
    case 'hoodie': {
      const body =
        'M150 78 L92 98 Q58 112 40 196 L26 392 L72 400 L98 262 L100 446 Q200 460 300 446 L302 262 L328 400 L374 392 L360 196 Q342 112 308 98 L250 78 Q200 ' +
        (back ? '96' : '118') +
        ' 150 78 Z';
      return {
        behind: (
          <g>
            <path d="M142 84 Q128 18 200 12 Q272 18 258 84 Q200 126 142 84 Z" fill={t.dark} />
            {!back && <path d="M160 82 Q158 40 200 36 Q242 40 240 82 Q200 112 160 82 Z" fill={t.deep} />}
          </g>
        ),
        body,
        inside: (
          <g>
            {fold('M104 262 Q150 282 200 276 Q250 282 298 262', 0.08)}
            {fold('M70 220 Q60 300 54 372', 0.1)}
            {fold('M330 220 Q340 300 346 372', 0.1)}
            {hi('M120 140 Q116 200 118 250', 0.16)}
            <ellipse cx="102" cy="190" rx="26" ry="42" fill="#000" opacity="0.12" filter={`url(#${f})`} />
            <ellipse cx="298" cy="190" rx="26" ry="42" fill="#000" opacity="0.12" filter={`url(#${f})`} />
          </g>
        ),
        top: (
          <g>
            <path d="M99 428 Q200 442 301 428 L302 448 Q200 462 99 448 Z" fill={rib} />
            <path d="M26 380 L72 388 L74 410 L24 402 Z" fill={rib} />
            <path d="M374 380 L328 388 L326 410 L376 402 Z" fill={rib} />
            {!back && (
              <>
                <path d="M126 336 L274 336 L296 424 L104 424 Z" fill="none" stroke="#000" strokeOpacity={0.16} strokeWidth={2} />
                {stitch('M132 344 L268 344', t.line)}
                <path d="M178 112 Q176 160 178 206" stroke={t.isLight ? '#9a9aa0' : '#e8e8ea'} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M222 112 Q224 160 222 206" stroke={t.isLight ? '#9a9aa0' : '#e8e8ea'} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <circle cx="178" cy="208" r="4.5" fill={t.isLight ? '#6e6e74' : '#fff'} />
                <circle cx="222" cy="208" r="4.5" fill={t.isLight ? '#6e6e74' : '#fff'} />
              </>
            )}
            {back && <path d="M146 88 Q200 150 254 88" fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={2.5} />}
          </g>
        ),
        detailBox: '110 70 180 225',
      };
    }
    case 'polo': {
      const body =
        'M160 62 L96 86 Q58 106 30 164 L70 206 L102 180 L102 440 Q200 452 298 440 L298 180 L330 206 L370 164 Q342 106 304 86 L240 62 Q200 ' +
        (back ? '80' : '92') +
        ' 160 62 Z';
      return {
        body,
        inside: (
          <g>
            {fold('M104 200 Q160 232 200 226 Q240 232 296 200', 0.08)}
            {hi('M122 120 Q116 190 120 250', 0.16)}
            <ellipse cx="102" cy="184" rx="24" ry="30" fill="#000" opacity="0.12" filter={`url(#${f})`} />
            <ellipse cx="298" cy="184" rx="24" ry="30" fill="#000" opacity="0.12" filter={`url(#${f})`} />
          </g>
        ),
        top: (
          <g>
            <path d="M30 164 L70 206 L82 192 L44 150 Z" fill={rib} />
            <path d="M370 164 L330 206 L318 192 L356 150 Z" fill={rib} />
            {!back ? (
              <>
                <path d="M160 62 L186 100 L200 84 L214 100 L240 62 L226 56 L200 78 L174 56 Z" fill={t.light} stroke="#000" strokeOpacity={0.14} />
                <rect x="193" y="92" width="14" height="86" rx="4" fill={t.dark} />
                <circle cx="200" cy="112" r="3.2" fill={t.isLight ? '#6e6e74' : '#fff'} />
                <circle cx="200" cy="142" r="3.2" fill={t.isLight ? '#6e6e74' : '#fff'} />
              </>
            ) : (
              <path d="M158 64 Q200 94 242 64 L240 72 Q200 104 160 72 Z" fill={t.light} stroke="#000" strokeOpacity={0.12} />
            )}
          </g>
        ),
        detailBox: '140 50 120 150',
      };
    }
    case 'dress': {
      const body =
        'M160 58 L110 80 Q86 100 78 148 L116 166 L128 200 L88 462 Q200 486 312 462 L272 200 L284 166 L322 148 Q314 100 290 80 L240 58 Q200 ' +
        (back ? '78' : '104') +
        ' 160 58 Z';
      return {
        body,
        inside: (
          <g>
            {fold('M128 202 Q200 224 272 202', 0.1)}
            {fold('M170 230 Q150 340 126 452', 0.08)}
            {fold('M230 230 Q250 340 274 452', 0.08)}
            {fold('M200 232 Q200 340 200 462', 0.06)}
            {hi('M150 120 Q140 170 150 196', 0.16)}
          </g>
        ),
        top: (
          <g>
            {stitch('M130 204 Q200 226 270 204', t.line)}
            <path d="M158 56 Q200 108 242 56 L246 66 Q200 124 154 66 Z" fill={back ? 'none' : t.dark} opacity={back ? 0 : 1} />
            {back && <path d="M200 90 L200 240" stroke="#000" strokeOpacity={0.16} strokeWidth={2} />}
          </g>
        ),
        detailBox: '110 50 180 175',
      };
    }
    case 'trousers': {
      return {
        body: 'M112 36 L288 36 L306 472 L214 472 L200 168 L186 472 L94 472 Z',
        inside: (
          <g>
            {fold('M200 168 L196 330', 0.1)}
            {fold('M140 140 Q130 300 124 460', 0.08)}
            {fold('M260 140 Q270 300 276 460', 0.08)}
            {hi('M148 60 Q140 200 134 330', 0.15)}
            <ellipse cx="200" cy="164" rx="40" ry="30" fill="#000" opacity="0.12" filter={`url(#${f})`} />
          </g>
        ),
        top: (
          <g>
            <rect x="112" y="36" width="176" height="26" rx="4" fill={t.dark} />
            {stitch('M116 66 L284 66', t.line)}
            {[134, 170, 230, 266].map((x) => (
              <rect key={x} x={x} y="34" width="6" height="22" rx="3" fill={t.deep} opacity="0.5" />
            ))}
            {!back ? (
              <>
                <path d="M200 66 L200 166" stroke="#000" strokeOpacity={0.2} strokeWidth={2} />
                <path d="M200 98 Q170 100 158 66" fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={2} />
                <path d="M206 140 Q214 130 224 124" fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={2} />
              </>
            ) : (
              <>
                <rect x="134" y="92" width="46" height="46" rx="6" fill="none" stroke="#000" strokeOpacity={0.2} strokeWidth={2} />
                <rect x="220" y="92" width="46" height="46" rx="6" fill="none" stroke="#000" strokeOpacity={0.2} strokeWidth={2} />
              </>
            )}
            <path d="M96 452 L186 452 L186 472 L94 472 Z" fill={rib} />
            <path d="M214 452 L304 452 L306 472 L214 472 Z" fill={rib} />
          </g>
        ),
        detailBox: '100 30 200 170',
      };
    }
    case 'shorts': {
      return {
        body: 'M110 110 L290 110 L322 340 L216 340 L200 214 L184 340 L78 340 Z',
        inside: (
          <g>
            {fold('M200 214 L196 300', 0.1)}
            {fold('M140 150 Q130 250 124 330', 0.08)}
            {hi('M148 132 Q142 220 136 300', 0.15)}
            <ellipse cx="200" cy="212" rx="38" ry="24" fill="#000" opacity="0.12" filter={`url(#${f})`} />
          </g>
        ),
        top: (
          <g>
            <rect x="110" y="110" width="180" height="26" rx="4" fill={t.dark} />
            {stitch('M114 140 L286 140', t.line)}
            {!back && (
              <>
                <path d="M170 136 L170 112" stroke={t.isLight ? '#9a9aa0' : '#e8e8ea'} strokeWidth="3.5" strokeLinecap="round" />
                <path d="M230 136 L230 112" stroke={t.isLight ? '#9a9aa0' : '#e8e8ea'} strokeWidth="3.5" strokeLinecap="round" />
                <path d="M200 140 L200 214" stroke="#000" strokeOpacity={0.2} strokeWidth={2} />
              </>
            )}
            <path d="M78 322 L184 322 L184 340 L80 340 Z" fill={rib} opacity="0.9" />
            <path d="M216 322 L320 322 L322 340 L216 340 Z" fill={rib} opacity="0.9" />
          </g>
        ),
        detailBox: '100 100 200 130',
      };
    }
    case 'skirt': {
      return {
        body: 'M130 100 L270 100 L338 452 Q200 484 62 452 Z',
        inside: (
          <g>
            {[150, 175, 200, 225, 250].map((x, i) => (
              <g key={x}>{fold(`M${x} 126 Q${x + (i - 2) * 14} 300 ${x + (i - 2) * 30} 466`, 0.09)}</g>
            ))}
            {hi('M160 120 Q140 280 114 440', 0.12)}
          </g>
        ),
        top: (
          <g>
            <rect x="130" y="100" width="140" height="26" rx="5" fill={t.dark} />
            {stitch('M134 130 L266 130', t.line)}
            {back && <path d="M200 100 L200 190" stroke="#000" strokeOpacity={0.22} strokeWidth={2} />}
          </g>
        ),
        detailBox: '120 90 160 130',
      };
    }
    case 'cap': {
      return {
        behind: <path d="M64 308 Q200 360 340 308 L392 338 Q240 396 62 332 Z" fill={t.dark} />,
        body: 'M92 312 Q84 150 200 142 Q316 150 308 312 Q200 338 92 312 Z',
        inside: (
          <g>
            {fold('M200 142 Q150 220 140 320', 0.12)}
            {fold('M200 142 Q250 220 260 320', 0.12)}
            {fold('M200 142 L200 330', 0.1)}
            {hi('M130 190 Q150 160 190 150', 0.25)}
          </g>
        ),
        top: (
          <g>
            <circle cx="200" cy="146" r="9" fill={t.dark} />
            {!back && <path d="M92 312 Q200 340 308 312 L312 328 Q200 360 88 328 Z" fill={t.light} opacity="0.55" />}
            {back && <path d="M120 300 Q200 326 280 300" stroke={t.isLight ? '#9a9aa0' : '#e8e8ea'} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="14 8" />}
          </g>
        ),
        detailBox: '84 130 232 220',
      };
    }
    case 'tee':
    default: {
      const body =
        'M160 58 L96 84 Q58 104 30 162 L70 204 L102 178 L102 438 Q200 450 298 438 L298 178 L330 204 L370 162 Q342 104 304 84 L240 58 Q200 ' +
        (back ? '76' : '104') +
        ' 160 58 Z';
      return {
        body,
        inside: (
          <g>
            {fold('M104 200 Q160 236 200 230 Q240 236 296 200', 0.08)}
            {fold('M120 300 Q200 330 280 300', 0.06)}
            {hi('M124 110 Q116 190 122 260', 0.16)}
            <ellipse cx="102" cy="182" rx="24" ry="32" fill="#000" opacity="0.12" filter={`url(#${f})`} />
            <ellipse cx="298" cy="182" rx="24" ry="32" fill="#000" opacity="0.12" filter={`url(#${f})`} />
          </g>
        ),
        top: (
          <g>
            <path d="M158 56 Q200 114 242 56 L246 68 Q200 130 154 68 Z" fill={back ? 'none' : rib} opacity={back ? 0 : 1} />
            {back && <path d="M158 58 Q200 88 242 58 L240 70 Q200 100 160 70 Z" fill={rib} />}
            {stitch('M104 424 Q200 436 296 424', t.line)}
            <path d="M30 162 L70 204 L82 190 L44 148 Z" fill={rib} opacity="0.8" />
            <path d="M370 162 L330 204 L318 190 L356 148 Z" fill={rib} opacity="0.8" />
          </g>
        ),
        detailBox: '130 50 140 150',
      };
    }
  }
}

/* ───────── component ───────── */
interface GarmentProps {
  type?: string | null;
  color?: string | null;
  view?: GarmentView;
  className?: string;
  title?: string;
  /** subtle glossy rim-light (used for the hero model) */
  depth?: boolean;
}

export function Garment({ type, color, view = 'front', className, title, depth }: GarmentProps) {
  const uid = useId().replace(/:/g, '');
  const gType = (GARMENT_TYPES.find((g) => g.value === type)?.value ?? 'tee') as GarmentType;
  const t = tones(safeColor(color));
  const blurId = `blur-${uid}`;
  const s = spec(gType, view, t, blurId);

  const detail = view === 'detail';
  const studio = view === 'studio';
  const viewBox = detail ? s.detailBox : '0 0 400 500';
  const clip = `clip-${uid}`;
  const bodyTransform = studio ? 'translate(200 260) rotate(-5) scale(.86) translate(-200 -250)' : undefined;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={title ?? `${gType} ${view} view`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clip}>
          <path d={s.body} />
        </clipPath>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id={`vol-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.26" />
          <stop offset="0.28" stopColor="#000" stopOpacity="0.02" />
          <stop offset="0.5" stopColor="#fff" stopOpacity={depth ? 0.26 : 0.16} />
          <stop offset="0.74" stopColor="#000" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={`vert-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <pattern id={`weave-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="none" />
          <path d="M0 3H6" stroke="#000" strokeOpacity={detail ? 0.1 : 0.035} strokeWidth="1" />
          <path d="M3 0V6" stroke="#fff" strokeOpacity={detail ? 0.1 : 0.03} strokeWidth="1" />
        </pattern>
        {studio && (
          <radialGradient id={`bg-${uid}`} cx="50%" cy="42%" r="60%">
            <stop offset="0" stopColor={mix(t.base, '#ffffff', 0.86)} />
            <stop offset="1" stopColor={mix(t.base, '#ffffff', 0.72)} />
          </radialGradient>
        )}
      </defs>

      {studio && <circle cx="200" cy="248" r="205" fill={`url(#bg-${uid})`} />}

      <g transform={bodyTransform}>
        {s.behind}
        <path d={s.body} fill={t.base} style={{ transition: 'fill .35s ease' }} />
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width="400" height="500" fill={`url(#weave-${uid})`} />
          {s.inside}
        </g>
        {s.top}
        <path d={s.body} fill="none" stroke={t.isLight ? 'rgba(0,0,0,.22)' : 'rgba(0,0,0,.28)'} strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
