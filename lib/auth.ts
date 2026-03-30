import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
 * Check for redirect result (called on page load after redirect sign-in)
 */
export async function checkRedirectResult(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) return null
  try {
    const result = await getRedirectResult(auth)
    return result?.user ?? null
  } catch {
    return null
  }
}

/**
 * Sign in with Google — tries popup first, falls back to redirect
 */
export async function signInWithGoogle(): Promise<User> {
  ensureFirebase()

  if (auth!.currentUser) {
    return auth!.currentUser
  }

  const provider = new GoogleAuthProvider()
  // Lock to specific admin email — skips account picker
  provider.setCustomParameters({
    login_hint: 'badfos2002@gmail.com',
    prompt: 'none',
  })

  try {
    const result = await signInWithPopup(auth!, provider)
    // Block any email that isn't the admin
    if (result.user.email !== 'badfos2002@gmail.com') {
      await firebaseSignOut(auth!)
      throw new Error('הכניסה מותרת רק לחשבון המנהל')
    }
    return result.user
  } catch (err: any) {
    // If popup blocked or failed, fall back to redirect
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.code === 'auth/internal-error'
    ) {
      await signInWithRedirect(auth!, provider)
      // This line won't be reached — browser redirects to Google
      throw new Error('redirecting')
    }
    throw err
  }
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
  return user.email === 'badfos2002@gmail.com'
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
