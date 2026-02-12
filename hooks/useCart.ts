'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, ProductConfig, SizeQuantity } from '@/lib/types'
import {
  calculateItemPrice,
  calculateTotalQuantity,
  calculateTotalPrice,
  generateCartItemId,
} from '@/lib/pricing'

interface CartStore {
  items: CartItem[]
  addItem: (config: ProductConfig) => void
  removeItem: (itemId: string) => void
  updateItemQuantity: (itemId: string, sizes: SizeQuantity[]) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartItemCount: () => number
  getCartSubtotal: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Add an item to the cart
       */
      addItem: (config: ProductConfig) => {
        const itemId = generateCartItemId(config)
        const items = get().items

        // Check if item already exists
        const existingItemIndex = items.findIndex((item) => item.id === itemId)

        if (existingItemIndex >= 0) {
          // Update existing item quantities
          const existingItem = items[existingItemIndex]
          const updatedSizes = [...existingItem.sizes]

          // Merge quantities
          config.sizes.forEach((newSize) => {
            const existingSizeIndex = updatedSizes.findIndex(
              (s) => s.size === newSize.size
            )

            if (existingSizeIndex >= 0) {
              updatedSizes[existingSizeIndex].quantity += newSize.quantity
            } else {
              updatedSizes.push(newSize)
            }
          })

          // Recalculate totals
          const totalQuantity = calculateTotalQuantity(updatedSizes)
          const pricePerUnit = calculateItemPrice({
            ...config,
            sizes: updatedSizes,
          })
          const totalPrice = calculateTotalPrice(pricePerUnit, totalQuantity)

          const updatedItems = [...items]
          updatedItems[existingItemIndex] = {
            ...existingItem,
            sizes: updatedSizes,
            totalQuantity,
            pricePerUnit,
            totalPrice,
          }

          set({ items: updatedItems })
        } else {
          // Add new item
          const totalQuantity = calculateTotalQuantity(config.sizes)
          const pricePerUnit = calculateItemPrice(config)
          const totalPrice = calculateTotalPrice(pricePerUnit, totalQuantity)

          const newItem: CartItem = {
            ...config,
            id: itemId,
            pricePerUnit,
            totalQuantity,
            totalPrice,
          }

          set({ items: [...items, newItem] })
        }
      },

      /**
       * Remove an item from the cart
       */
      removeItem: (itemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }))
      },

      /**
       * Update item quantities
       */
      updateItemQuantity: (itemId: string, sizes: SizeQuantity[]) => {
        const items = get().items
        const itemIndex = items.findIndex((item) => item.id === itemId)

        if (itemIndex >= 0) {
          const item = items[itemIndex]

          // Recalculate totals
          const totalQuantity = calculateTotalQuantity(sizes)

          if (totalQuantity === 0) {
            // Remove item if no quantity
            get().removeItem(itemId)
            return
          }

          const pricePerUnit = calculateItemPrice({
            ...item,
            sizes,
          })
          const totalPrice = calculateTotalPrice(pricePerUnit, totalQuantity)

          const updatedItems = [...items]
          updatedItems[itemIndex] = {
            ...item,
            sizes,
            totalQuantity,
            pricePerUnit,
            totalPrice,
          }

          set({ items: updatedItems })
        }
      },

      /**
       * Clear all items from cart
       */
      clearCart: () => {
        set({ items: [] })
      },

      /**
       * Get total price of all items
       */
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.totalPrice, 0)
      },

      /**
       * Get total number of items (by unique products, not quantity)
       */
      getCartItemCount: () => {
        return get().items.length
      },

      /**
       * Get subtotal (sum of all item prices)
       */
      getCartSubtotal: () => {
        return get().items.reduce((total, item) => total + item.totalPrice, 0)
      },
    }),
    {
      name: 'badfos-cart-storage', // LocalStorage key
    }
  )
)
