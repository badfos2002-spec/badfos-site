/**
 * הקצאת מספר הזמנה (Admin SDK, טרנזקציה — בלי כפילויות). משותף ל-
 * /api/order/next-number (צ'קאאוט) ול-/api/admin/manual-order (הזמנה ידנית),
 * כדי שלשני המקורות יהיה מונה אחד. סמנטיקה: מונה קיים → current + 1;
 * מונה חסר → 1001.
 */
import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'

/** בתוך טרנזקציה קיימת (קורא את המונה ואז כותב — יש לבצע את כל הקריאות האחרות לפני). */
export async function nextOrderNumberInTx(tx: Transaction): Promise<number> {
  const ref = adminDb.collection('counters').doc('orders')
  const snap = await tx.get(ref)
  if (!snap.exists) {
    tx.set(ref, { current: 1001 })
    return 1001
  }
  const current = snap.data()?.current || 1000
  tx.update(ref, { current: current + 1 })
  return current + 1
}

export async function allocateOrderNumber(): Promise<number> {
  return adminDb.runTransaction((tx) => nextOrderNumberInTx(tx))
}
