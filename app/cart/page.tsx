'use client'

import CartPage from '@/components/cart/CartPage'

export default function CartRoute() {
  return (
    <>
      {/* Preconnect to payment gateway domains for faster checkout */}
      <link rel="preconnect" href="https://grow.link" />
      <link rel="dns-prefetch" href="https://grow.link" />
      <link rel="preconnect" href="https://grow.business" />
      <link rel="dns-prefetch" href="https://grow.business" />
      <link rel="preconnect" href="https://meshulam.co.il" />
      <link rel="dns-prefetch" href="https://meshulam.co.il" />
      <link rel="preconnect" href="https://cardcom.solutions" />
      <link rel="dns-prefetch" href="https://cardcom.solutions" />
      <CartPage />
    </>
  )
}
