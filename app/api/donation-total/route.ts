import { NextResponse } from 'next/server'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase'

export const revalidate = 3600 // cache for 1 hour

export async function GET() {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json({ total: 0 })
    }

    // Query all paid/completed/shipped/in_production orders
    const paidStatuses = ['paid', 'in_production', 'shipped', 'completed']
    let donationTotal = 0

    for (const status of paidStatuses) {
      const q = query(collection(db, 'orders'), where('status', '==', status))
      const snapshot = await getDocs(q)

      for (const doc of snapshot.docs) {
        const order = doc.data()
        if (!order.items) continue

        for (const item of order.items) {
          // Identify Lion Roar items by design areaName or fileName
          const isLionRoar = item.designs?.some(
            (d: any) =>
              d.areaName === 'שאגת האריה' ||
              d.fileName === 'lion-roar.png'
          )
          if (isLionRoar) {
            donationTotal += item.totalPrice * 0.1
          }
        }
      }
    }

    return NextResponse.json({
      total: Math.round(donationTotal),
    })
  } catch (error) {
    console.error('Error calculating donation total:', error)
    return NextResponse.json({ total: 0 })
  }
}
