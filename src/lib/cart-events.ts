/** Browser events that keep the header cart badge in sync (plain module: safe to import anywhere on the client). */
const emit = (name: string, detail?: number) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));
};

/** Ask the header to re-fetch the real count. */
export const notifyCartChanged = () => emit('cart:changed');
/** Optimistic badge change (no network). */
export const bumpCart = (n: number) => emit('cart:bump', n);
/** Set the badge to an exact number (e.g. after the server confirms). */
export const setCartCount = (n: number) => emit('cart:set', n);
