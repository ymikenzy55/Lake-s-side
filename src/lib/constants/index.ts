import { BRAND } from '@/lib/config/brand';

export const APP_NAME = BRAND.name;
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

export const CURRENCY = 'GHS';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MAX_CART_QUANTITY = 20;
export const GUEST_CART_DURATION = 30 * 24 * 60 * 60 * 1000;

export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_DURATION = 60 * 60 * 1000;

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const DEFAULT_SHIPPING_FEE = 20;
export const FREE_SHIPPING_THRESHOLD = 500;

export const HERO_AUTOPLAY_MS = 4000;
export const ORDER_ACCESS_COOKIE = 'cf_order';

/** Cookies are marked Secure only when the site is actually served over https (so `npm start` on http://localhost still works). */
export const COOKIE_SECURE = APP_URL.startsWith('https://');
