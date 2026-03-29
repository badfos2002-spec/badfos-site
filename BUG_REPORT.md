# Bug Report — badfos.co.il
Generated: 2026-03-29

## Summary
- 🔴 Critical: 6 issues
- 🟠 High: 8 issues
- 🟡 Medium: 11 issues
- 🟢 Low: 5 issues

---

## 🔴 Critical Issues

### [Payment] — Client-Confirm Endpoint Has NO Authentication
**Severity**: 🔴 CRITICAL
**File**: `app/api/payment/client-confirm/route.ts` lines 12-84
**Description**: Endpoint accepts ANY POST with `orderId` and marks orders as paid without authentication.
**Impact**: Attacker can mark any pending order as paid without paying.
**Fix**: Add WEBHOOK_SECRET validation or remove endpoint (rely on Grow webhook + Make).

### [Payment] — Webhook Accepts Unauthenticated Requests via Field Detection
**Severity**: 🔴 CRITICAL
**File**: `app/api/webhooks/route.ts` line 54-55
**Description**: `isFromGrow` check trusts any request containing `transactionCode` or `paymentSum` fields.
**Impact**: Attacker can forge Grow IPN and mark orders as paid.
**Fix**: Remove `isFromGrow` bypass. Require WEBHOOK_SECRET on ALL requests.

### [Payment] — Amount Not Recalculated Server-Side
**Severity**: 🔴 CRITICAL
**File**: `app/api/payment/create/route.ts` lines 23-30
**Description**: Client sends `amount` directly to Make/Grow. Not recalculated from cart items server-side.
**Impact**: Customer can modify amount in DevTools and pay less than actual price.
**Fix**: Recalculate amount server-side from order items before sending to payment provider.

### [Security] — PII Logged in Production
**Severity**: 🔴 CRITICAL
**Files**: `app/api/payment/confirm/route.ts:63`, `app/api/webhooks/route.ts:74`, `lib/server-tracking.ts:69,132`
**Description**: Phone numbers, emails, and API responses logged in plaintext.
**Impact**: Customer data exposed in server logs. Violates privacy laws.
**Fix**: Redact PII from all console.log/error statements. [FIXED ✓]

### [Security] — No Rate Limiting on Payment Creation
**Severity**: 🔴 CRITICAL
**File**: `app/api/payment/create/route.ts`
**Description**: No rate limit. Attacker can spam payment creation requests.
**Impact**: DoS attack, excessive Make.com webhook calls, quota exhaustion.
**Fix**: Add to middleware matcher or implement per-IP rate limiting. [FIXED ✓]

### [Error Handling] — Empty Cart Checkout Not Fully Prevented
**Severity**: 🔴 CRITICAL
**File**: `components/cart/CartPage.tsx:219-224`
**Description**: Cart items checked with alert but order creation not guarded if cart cleared between check and DB write.
**Impact**: Orphaned orders with no items in Firestore.
**Fix**: Double-check cart state right before createOrder call. [FIXED ✓]

---

## 🟠 High Issues

### [Payment] — Race Condition Between 3 Confirmation Endpoints
**File**: webhooks + confirm + client-confirm routes
**Description**: Three endpoints independently update same order without Firestore transactions.
**Impact**: Duplicate coupon usage, duplicate emails.
**Fix**: Use Firestore transactions for atomic updates.

### [Payment] — Phone/Email Fallback Can Match Wrong Order
**File**: `app/api/webhooks/route.ts:93-126`
**Description**: If customer has multiple pending orders, webhook matches most recent by timestamp.
**Impact**: Wrong order marked as paid.
**Fix**: Log warning for ambiguous matches; prefer paymentId over phone/email.

### [Auth] — Client-Side Only Admin Protection
**File**: `app/admin/layout.tsx`
**Description**: Admin routes protected only by client-side `useAuth()`. No server-side middleware.
**Impact**: API requests to admin data not protected server-side.
**Fix**: Add Next.js middleware for `/admin/*` with Firebase token verification.

### [Auth] — Admin Email Check Uses Public ENV VAR
**File**: `lib/auth.ts:82-87`
**Description**: `NEXT_PUBLIC_ADMIN_EMAIL` exposed in client bundle. Admin check is just email comparison.
**Impact**: Privilege escalation if attacker creates account with admin email.
**Fix**: Use Firebase Custom Claims instead of email comparison.

### [Forms] — No Server-Side Form Validation
**Files**: `components/cart/ContactForm.tsx`, `ShippingForm.tsx`
**Description**: Forms validate only client-side. Server accepts any data.
**Impact**: Invalid phone numbers, emails, or addresses stored in Firestore.
**Fix**: Add server-side validation in createOrder().

### [Forms] — No CSRF Protection on POST Endpoints
**Description**: No CSRF tokens on any form submissions.
**Impact**: Cross-site request forgery possible.
**Fix**: Add SameSite=Strict on session cookies or implement CSRF tokens.

### [Performance] — Infinite Loading State Possible
**File**: `components/cart/CartPage.tsx:219-231`
**Description**: If fetch fails silently, setLoading(false) never runs.
**Impact**: User trapped in loading overlay.
**Fix**: Use try-catch-finally to guarantee loading reset. [FIXED ✓]

### [Error] — No Payment Provider Downtime Handling
**File**: `app/api/payment/create/route.ts:53-107`
**Description**: If Make/Grow webhook is down, no retry or fallback.
**Impact**: Order created but no payment page generated.
**Fix**: Implement retry logic with exponential backoff.

---

## 🟡 Medium Issues

1. **Cart Quantities Not Validated** — `hooks/useCart.ts:54-64` — No min/max check on add
2. **Coupon Double-Submit Possible** — `components/cart/OrderSummary.tsx:76-99` — No server-side dedup
3. **Weak Phone Validation in API** — `app/api/payment/create/route.ts:42` — Accepts `+++------`
4. **ContactForm Auto-Submits on Keystroke** — `components/cart/ContactForm.tsx:20-24` — Spams parent re-renders
5. **Missing Metadata on Payment Pages** — `app/payment/success/page.tsx` etc — No unique titles
6. **No Canonical URLs** — Global — Search engines may index duplicate content
7. **Admin Forms Accept Negative Values** — `app/admin/inventory/page.tsx:126` — No server validation
8. **Missing Error Boundaries for Dynamic Imports** — `app/home/page.tsx:6-11` — No Suspense fallback
9. **setTimeout Not Cleaned in Contact Form** — `components/home/NewContactFormSection.tsx:70` — Memory leak
10. **Stale Closure in HeroCarousel** — `components/home/HeroCarousel.tsx:38-43` — Interval timing drift
11. **SessionStorage Quota Not Handled** — `components/designer/TshirtDesigner.tsx:90-95` — Silent data loss

---

## 🟢 Low Issues

1. **Console.log Debug Statements** — Multiple files — Visible to users in DevTools
2. **In-Memory Rate Limiter Resets on Deploy** — `middleware.ts:4` — Not distributed
3. **Admin Email Hardcoded as Fallback** — `app/api/send-email/route.ts:100` — Minor
4. **Missing next/image in Some Components** — DesignStep, share pages — Intentional (blob URLs)
5. **CSS Class Strings Verbose** — Multiple — Could use clsx for readability
