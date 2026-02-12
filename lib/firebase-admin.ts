import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'

let adminApp: App
let adminDb: Firestore
let adminAuth: Auth
let adminStorage: Storage

// Initialize Firebase Admin SDK (server-side only)
if (getApps().length === 0) {
  try {
    // Parse the private key from environment variable
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })

    adminDb = getFirestore(adminApp)
    adminAuth = getAuth(adminApp)
    adminStorage = getStorage(adminApp)
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
  }
} else {
  adminApp = getApps()[0]
  adminDb = getFirestore(adminApp)
  adminAuth = getAuth(adminApp)
  adminStorage = getStorage(adminApp)
}

export { adminApp, adminDb, adminAuth, adminStorage }
