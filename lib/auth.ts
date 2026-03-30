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
    throw new Error('Firebase is not configured')
  }
}

/**
 * Sign in with Google popup — restricted to admin email only
 */
export async function signInWithGoogle(): Promise<User> {
  ensureFirebase()

  if (auth!.currentUser) {
    return auth!.currentUser
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const result = await signInWithPopup(auth!, provider)

  // Block any email that isn't admin
  if (result.user.email !== 'badfos2002@gmail.com') {
    await firebaseSignOut(auth!)
    throw new Error('הכניסה מותרת רק לחשבון badfos2002@gmail.com')
  }

  return result.user
}

export async function signOut(): Promise<void> {
  ensureFirebase()
  await firebaseSignOut(auth!)
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return user.email === 'badfos2002@gmail.com'
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) return () => {}
  return onAuthStateChanged(auth, callback)
}
