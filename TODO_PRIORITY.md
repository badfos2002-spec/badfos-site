# Action Items — Priority Order

## Do First (Critical — fix immediately)
- [ ] Add auth to `/api/payment/client-confirm` — `client-confirm/route.ts` — Anyone can mark orders as paid
- [ ] Remove isFromGrow bypass in webhook — `webhooks/route.ts:54` — Forged IPN accepted
- [ ] Recalculate amount server-side — `payment/create/route.ts` — Price manipulation possible
- [x] Redact PII from logs — `confirm/route.ts, webhooks/route.ts, server-tracking.ts` — FIXED
- [x] Add rate limit to payment create — `payment/create/route.ts` — FIXED
- [x] Guard empty cart checkout — `CartPage.tsx:219` — FIXED

## Do This Week (High)
- [ ] Use Firestore transactions for order updates — All 3 confirmation endpoints
- [ ] Add server-side admin middleware — `middleware.ts` — Admin routes not protected server-side
- [ ] Replace email-based admin check with Custom Claims — `lib/auth.ts:82`
- [ ] Add server-side form validation — `ContactForm, ShippingForm`
- [x] Fix infinite loading state — `CartPage.tsx` — FIXED
- [ ] Add payment provider retry logic — `payment/create/route.ts`
- [ ] Add CSRF protection — All POST endpoints
- [ ] Fix phone/email fallback ambiguity — `webhooks/route.ts:93` — Log warning for multiple matches

## Do This Month (Medium)
- [ ] Validate cart quantities (min 1) — `hooks/useCart.ts:54`
- [ ] Add metadata to payment pages — `app/payment/*/page.tsx`
- [ ] Implement canonical URLs — All pages
- [ ] Add Suspense boundaries to dynamic imports — `app/home/page.tsx`
- [ ] Debounce ContactForm auto-submit — `ContactForm.tsx:20`
- [ ] Add server validation for admin number inputs — `admin/inventory/page.tsx`
- [ ] Fix setTimeout cleanup in contact form — `NewContactFormSection.tsx:70`
- [ ] Fix HeroCarousel stale closure — `HeroCarousel.tsx:38`

## Backlog (Low / Nice to have)
- [ ] Remove debug console.log from production — Multiple files
- [ ] Move rate limiting to Redis — `middleware.ts`
- [ ] Remove hardcoded admin email fallback — `send-email/route.ts:100`
- [ ] Use clsx for complex class strings — Multiple components
- [ ] Handle sessionStorage quota exceeded — `TshirtDesigner.tsx:90`
