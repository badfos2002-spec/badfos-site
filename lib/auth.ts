import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'

function ensureFirebase(): void {
  if (!isFirebaseConfigured || !auth) {
    console.warn('⚠️ Firebase Auth operation attempted but Firebase is not configured')
    throw new Error('Firebase is not configured. Please add Firebase credentials to .env.local')
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User> {
  ensureFirebase()

  // If already signed in, return current user
  if (auth!.currentUser) {
    return auth!.currentUser
  }

  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth!, provider)
  return result.user
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  ensureFirebase()
  await firebaseSignOut(auth!)
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured || !auth) return null
  return auth.currentUser
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return user.email === adminEmail
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    // Return a no-op unsubscribe function
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}
