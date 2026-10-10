'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface SessionState {
  user: { firstName: string | null; email: string; role: string } | null;
  cartCount: number;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SessionState>({ user: null, cartCount: 0, loaded: false, refresh: async () => {} });
export const useSession = () => useContext(Ctx);

/** Fetches header state client-side so storefront pages can be statically cached. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Pick<SessionState, 'user' | 'cartCount' | 'loaded'>>({
    user: null,
    cartCount: 0,
    loaded: false,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      const data = await res.json();
      setState({ user: data.user, cartCount: data.cartCount ?? 0, loaded: true });
    } catch {
      setState((s) => ({ ...s, loaded: true }));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client fetch of session state
    void refresh();
    const on = () => void refresh();
    const bump = (e: Event) => setState((s) => ({ ...s, cartCount: Math.max(0, s.cartCount + ((e as CustomEvent<number>).detail ?? 0)) }));
    const set = (e: Event) => setState((s) => ({ ...s, cartCount: Math.max(0, (e as CustomEvent<number>).detail ?? 0) }));
    window.addEventListener('cart:changed', on);
    window.addEventListener('cart:bump', bump);
    window.addEventListener('cart:set', set);
    window.addEventListener('focus', on);
    return () => {
      window.removeEventListener('cart:changed', on);
      window.removeEventListener('cart:bump', bump);
      window.removeEventListener('cart:set', set);
      window.removeEventListener('focus', on);
    };
  }, [refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
