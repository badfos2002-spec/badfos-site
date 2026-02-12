import { Metadata } from 'next'
import CartPage from '@/components/cart/CartPage'

export const metadata: Metadata = {
  title: 'עגלת קניות | בדפוס',
  description: 'עגלת הקניות שלך - השלימו את ההזמנה',
}

export default function Cart() {
  return <CartPage />
}
