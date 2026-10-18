import { auth } from '@/lib/firebase'

/** fetch עם טוקן האדמין — כמו בשאר מסכי האדמין שמדברים עם /api/admin/*. */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('not_signed_in')
  return fetch(input, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } })
}
