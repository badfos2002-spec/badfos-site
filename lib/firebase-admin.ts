import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'

let adminApp: App
let adminDb: Firestore
let adminAuth: Auth
let adminStorage: Storage

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
  console.error('🔴 Firebase Admin initialization failed:', error instanceof Error ? error.message : error)
}

export { adminApp, adminDb, adminAuth, adminStorage }
