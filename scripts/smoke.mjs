// Route smoke test: crawls internal links from key pages and fails on any 4xx/5xx or error page.
//   npm run smoke                       (guest)
//   COOKIE=<cf_session> npm run smoke -- --admin   (also crawl /admin)
const base = process.env.BASE_URL || 'http://localhost:3100';
const cookie = process.env.COOKIE ? { cookie: `cf_session=${process.env.COOKIE}` } : {};
const admin = process.argv.includes('--admin');
const seeds = ['/', '/products', '/about', '/cart', '/checkout', '/track', '/login', '/register', '/forgot-password', '/receipt/none', ...(admin ? ['/admin/dashboard', '/admin/orders', '/admin/products', '/admin/inventory', '/admin/hero', '/admin/categories', '/admin/attributes', '/admin/discounts', '/admin/customers', '/admin/team', '/admin/settings', '/admin/account'] : [])];
const expected404 = new Set(['/receipt/none']);
const queue = [...seeds];
const seen = new Map();
while (queue.length && seen.size < 250) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  try {
    const res = await fetch(base + path, { headers: cookie, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    const body = res.status === 200 ? await res.text() : '';
    const page = /Application error|Internal Server Error|This page couldn.t load/.test(body);
    seen.set(path, res.status === 200 && page ? '200 (error page)' : String(res.status));
    if (res.status === 200) {
      for (const m of body.matchAll(/href="(\/[^"#?]*)"/g)) {
        const h = m[1];
        if (/^\/(_next|api|photos|uploads)\b/.test(h) || /\.[a-z0-9]+$/i.test(h)) continue;
        if (!seen.has(h) && !queue.includes(h)) queue.push(h);
      }
    }
  } catch (e) {
    seen.set(path, `ERR ${e.message}`);
  }
}
const bad = [...seen].filter(([p, s]) => !(s === '200' || /^30[1-8]$/.test(s) || (s === '404' && expected404.has(p))));
console.log(`checked ${seen.size} routes, problems: ${bad.length}`);
for (const [p, s] of bad) console.log(' ', s, p);
process.exit(bad.length ? 1 : 0);
