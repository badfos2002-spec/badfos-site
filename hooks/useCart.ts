'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, ProductConfig, SizeQuantity, PackageCartItem } from '@/lib/types'
import {
  calculateItemPrice,
  calculateTotalQuantity,
  calculateTotalPrice,
  generateCartItemId,
} from '@/lib/pricing'

interface CartStore {
  items: CartItem[]
  packageItems: PackageCartItem[]
  editingItemId: string | null
  addItem: (config: ProductConfig) => void
  removeItem: (itemId: string) => void
  updateItemQuantity: (itemId: string, sizes: SizeQuantity[]) => void
  replaceItem: (itemId: string, config: ProductConfig) => void
  setEditingItem: (itemId: string | null) => void
  addPackage: (pkg: Omit<PackageCartItem, 'id' | 'totalPrice'>) => void
  removePackage: (id: string) => void
  updatePackageQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartItemCount: () => number
  getCartSubtotal: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      packageItems: [],
      editingItemId: null,

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
       * Replace an existing item (used when editing from cart)
       */
      replaceItem: (itemId: string, config: ProductConfig) => {
        const items = get().items
        const itemIndex = items.findIndex((item) => item.id === itemId)
        if (itemIndex < 0) {
          get().addItem(config)
          return
        }
        const totalQuantity = calculateTotalQuantity(config.sizes)
        const pricePerUnit = calculateItemPrice(config)
        const totalPrice = calculateTotalPrice(pricePerUnit, totalQuantity)
        const updatedItems = [...items]
        updatedItems[itemIndex] = {
          ...config,
          id: itemId,
          pricePerUnit,
          totalQuantity,
          totalPrice,
        }
        set({ items: updatedItems, editingItemId: null })
      },

      /**
       * Set the item currently being edited
       */
      setEditingItem: (itemId: string | null) => {
        set({ editingItemId: itemId })
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
       * Add a package to the cart
       */
      addPackage: (pkg) => {
        const id = `package-${pkg.packageId}`
        const totalPrice = pkg.quantity * pkg.pricePerUnit + pkg.graphicDesignerCost
        const packageItems = get().packageItems
        const existingIndex = packageItems.findIndex((p) => p.id === id)

        if (existingIndex >= 0) {
          const updated = [...packageItems]
          updated[existingIndex] = { ...pkg, id, totalPrice }
          set({ packageItems: updated })
        } else {
          set({ packageItems: [...packageItems, { ...pkg, id, totalPrice }] })
        }
      },

      /**
       * Remove a package from the cart
       */
      removePackage: (id: string) => {
        set((state) => ({
          packageItems: state.packageItems.filter((p) => p.id !== id),
        }))
      },

      /**
       * Update package quantity
       */
      updatePackageQuantity: (id: string, quantity: number) => {
        if (quantity <= 0) {
          get().removePackage(id)
          return
        }
        const packageItems = get().packageItems
        const index = packageItems.findIndex((p) => p.id === id)
        if (index >= 0) {
          const updated = [...packageItems]
          const pkg = updated[index]
          updated[index] = {
            ...pkg,
            quantity,
            totalPrice: quantity * pkg.pricePerUnit + pkg.graphicDesignerCost,
          }
          set({ packageItems: updated })
        }
      },

      /**
       * Clear all items from cart
       */
      clearCart: () => {
        set({ items: [], packageItems: [] })
      },

      /**
       * Get total price of all items
       */
      getCartTotal: () => {
        const itemsTotal = get().items.reduce((total, item) => total + item.totalPrice, 0)
        const packagesTotal = get().packageItems.reduce((total, pkg) => total + pkg.totalPrice, 0)
        return itemsTotal + packagesTotal
      },

      /**
       * Get total number of items (by unique products, not quantity)
       */
      getCartItemCount: () => {
        return get().items.length + get().packageItems.length
      },

      /**
       * Get subtotal (sum of all item prices)
       */
      getCartSubtotal: () => {
        const itemsTotal = get().items.reduce((total, item) => total + item.totalPrice, 0)
        const packagesTotal = get().packageItems.reduce((total, pkg) => total + pkg.totalPrice, 0)
        return itemsTotal + packagesTotal
      },
    }),
    {
      name: 'badfos-cart-storage',
      partialize: (state) => ({ items: state.items, packageItems: state.packageItems }),
    }
  )
)

// Hydration check — prevents "empty cart" flash before localStorage loads
const originalGetState = useCart.getState
let _hasHydrated = false
useCart.persist.onFinishHydration(() => { _hasHydrated = true })
// If already hydrated (sync), mark immediately
if (useCart.persist.hasHydrated()) _hasHydrated = true
export const hasCartHydrated = () => _hasHydrated
