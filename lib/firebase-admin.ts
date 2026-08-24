import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'

let adminApp: App
let adminDb: Firestore
let adminAuth: Auth
let adminStorage: Storage

/** Why initialisation failed, or null while the SDK is healthy. */
let initError: string | null = null

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!projectId || !clientEmail || !rawKey || rawKey.includes('Your private key here')) {
    throw new Error(
      'Firebase Admin SDK not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.local. ' +
      'Get these from Firebase Console → Project Settings → Service Accounts → Generate new private key.'
    )
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: rawKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

try {
  adminApp = getAdminApp()
  adminDb = getFirestore(adminApp)
  adminAuth = getAuth(adminApp)
  adminStorage = getStorage(adminApp)
} catch (error) {
  initError = error instanceof Error ? error.message : String(error)
  // THE one greppable line. Every serverless function that imports this module
  // logs it on cold start, so `ADMIN_SDK_UNAVAILABLE` in the Vercel logs points
  // at the real cause of whatever failure follows in that same log stream —
  // without having to patch a marker into all ~22 consumers. Same role as
  // PAUSE_FLAG_UNREADABLE in app/api/payment/create.
  console.error(
    '[ADMIN_SDK_UNAVAILABLE] 🔴 Firebase Admin initialization failed — adminDb / adminAuth / adminStorage ' +
    'are undefined for the entire lifetime of this function instance, so every Admin-SDK call in it will ' +
    'fail. Check FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY on ' +
    'Vercel. Reason:',
    initError
  )
}

/**
 * Why the Admin SDK is unusable, or null when it is fine.
 *
 * ── Why the exports stay `undefined` instead of throwing at import time ──────
 * Throwing here would be the loudest possible failure, and it is the wrong
 * trade: ~22 route modules import this file at module scope, and several of
 * them are DELIBERATELY built to survive without the SDK —
 * /api/payment/create keeps taking money (fail-open pause flag),
 * /share/[id] falls back to the logo for its OG image, lib/usage-tracking
 * no-ops, /api/cost-digest degrades. An import-time throw converts each of
 * those considered degradations into a hard 500, i.e. it would take down
 * routes that do not need the SDK at all — including the checkout path we
 * just spent a commit un-blocking.
 *
 * A Proxy that throws a nicer error on property access was the other option
 * and is also wrong: a Proxy is truthy, which would silently break the
 * `if (!adminDb) return` guard that lib/usage-tracking already relies on.
 *
 * So the exports keep their current shape and callers that need to make a
 * POLICY decision — refuse, degrade, or tell the user something true — ask
 * this function first. Callers that are already correctly-directioned (a
 * payment webhook that should 500 so Grow retries, a fire-and-forget alert)
 * need no change: their TypeError still lands in their own catch, and the
 * cold-start line above explains it.
 */
export function adminSdkUnavailable(): string | null {
  if (adminDb && adminAuth && adminStorage) return null
  return initError ?? 'Firebase Admin SDK is not initialised'
}

export { adminApp, adminDb, adminAuth, adminStorage }
