import {
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
    throw new Error('Firebase is not configured')
  }
}

/**
 * Sign in with Google — redirect (no popup issues)
 */
export async function signInWithGoogle(): Promise<void> {
  ensureFirebase()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithRedirect(auth!, provider)
}

/**
 * Check redirect result after returning from Google
 */
export async function checkRedirectResult(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) return null
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      // Block any email that isn't admin
      if (result.user.email !== 'badfos2002@gmail.com') {
        await firebaseSignOut(auth!)
        return null
      }
      return result.user
    }
    return null
  } catch {
    return null
  }
}

export async function signOut(): Promise<void> {
  ensureFirebase()
  await firebaseSignOut(auth!)
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured || !auth) return null
  return auth.currentUser
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return user.email === 'badfos2002@gmail.com'
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) return () => {}
  return onAuthStateChanged(auth, callback)
}
