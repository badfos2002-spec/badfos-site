## Security & Google Ads Compliance Rules

All pages automatically inherit security headers and CSP from `next.config.js` (source: `/(.*)`).

### Mandatory for every new page or feature:
1. **No HTTP resources** — all links, images, scripts, and API calls must use `https://`
2. **External redirects** — must go through `isAuthorizedRedirect()` from `lib/url-validation.ts`. Add new payment/external domains to the whitelist there.
3. **User input in emails** — must be escaped with `escapeHtml()` from `lib/utils.ts`
4. **New external scripts** — add their domains to the CSP in `next.config.js` (script-src, connect-src, frame-src as needed)
5. **Internal links** — use Next.js `<Link>` or relative paths. No hardcoded `http://` URLs.
6. **Payment flows** — validate on both server (`api/payment/create`) and client (`CartPage.tsx`) using `isAuthorizedRedirect()`