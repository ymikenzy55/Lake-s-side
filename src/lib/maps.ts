/**
 * Map links for the store location. Everything is derived from the `address` setting, so changing
 * the address in Admin → Settings moves the map and every directions button with it.
 * No API keys: these are the public URL schemes each maps app documents.
 */
export function mapLinks(address: string) {
  const q = encodeURIComponent(address);
  return {
    /** Keyless Google Maps embed for an <iframe>. */
    embed: `https://maps.google.com/maps?q=${q}&z=16&output=embed`,
    /** Opens Google Maps (app on phones) with directions from the visitor's current location. */
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    /** Shows the place in Google Maps. */
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    /** Apple Maps on iPhone/Mac, falls back to the web elsewhere. */
    apple: `https://maps.apple.com/?daddr=${q}&dirflg=d`,
    /** Waze turn-by-turn navigation. */
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}
