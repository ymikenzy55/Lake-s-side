# Security

## Implemented
| Area | Control |
|---|---|
| Sessions | 256-bit random token in an httpOnly, SameSite=Lax (Secure in prod) cookie; only a SHA-256 hash is stored, so a DB leak cannot be replayed. 7-day expiry, expired rows pruned on login |
| Passwords | bcrypt cost 12; strength rules; constant-time login path (dummy hash when the email is unknown) |
| Password reset | Single-use token, 1 hour expiry, hashed at rest, all sessions revoked on reset, same response whether or not the email exists |
| Rate limiting | Login, register, forgot/reset, checkout, promo, track, cart, upload. In-memory; swap for Redis/Upstash on multi-instance hosts |
| Authorisation | Edge `proxy.ts` is only an optimistic redirect. Real checks (`requireAdmin`/`requireSuperAdmin`) run in the admin layout, in every admin action and in the upload route |
| Input | zod on every action; text sanitised; redirects restricted to same-site paths; CTA links restricted to http(s)/relative |
| Payments | Server recomputes totals; Paystack amount + currency verified on callback and webhook; webhook HMAC-SHA512 verified with timing-safe compare; marking paid is idempotent |
| Stock | Reservation is one atomic SQL `UPDATE ... WHERE available >= qty`, so concurrent buyers cannot oversell |
| Uploads | Admin only; magic-byte sniffing (JPEG/PNG/WebP), 5 MB cap, random file names, SVG uploads refused |
| Guest orders | Confirmation page requires an HMAC-signed cookie; tracking needs order number + email |
| Headers | CSP, HSTS (prod), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP |
| Forms | Credential forms are `method="post"` so a slow hydration can never put a password in the URL |
| Secrets | `.env` is git-ignored; admin credentials come from env, never source; the legacy hard-coded admin is disabled by the seed |
| Audit | Admin writes recorded in `AuditLog` |
| Roles | Only SUPER_ADMIN can create/delete admins, change roles or reset another person's password; self-demotion/deletion and removing the last super admin are blocked; role changes sign the person out everywhere |
| Live feeds | `/api/admin/stream` is admin-only; `/api/orders/<id>/stream` needs the owner's session or a signed browser grant for that exact order |
| Receipts | `/receipt/<id>` uses the same owner / signed-grant check, so order numbers cannot be enumerated |
| Dependencies | `npm audit` clean (Next.js 16.4.0, patched sharp/source-map-js) |
| Cookies | Unique names (`cf_*`) because browsers share cookies across localhost ports; Secure when the app URL is https |
| Uploads | Stored in `uploads/` and served by a route with a strict filename check (no path traversal) |
| Passwords | One shared rule everywhere (8+ chars, upper, lower, number); every password field has a show/hide control |

## Before going live
1. Set a unique `AUTH_SECRET` (32+ chars) and a strong `ADMIN_PASSWORD`; rotate the Neon password if `.env` was ever shared.
2. Add Paystack live keys and register `https://<domain>/api/webhooks/paystack` in the Paystack dashboard.
3. Add `BREVO_API_KEY` and verify the sender domain (SPF/DKIM).
4. Use Cloudinary (or another object store) if hosting on a serverless platform; local `public/uploads` is not durable there.
5. Replace the in-memory rate limiter with a shared store when running more than one instance.
