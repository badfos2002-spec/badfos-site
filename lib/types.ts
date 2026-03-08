import { Timestamp } from 'firebase/firestore'

// ============================================================================
// Product Types
// ============================================================================

export type ProductType = 'tshirt' | 'sweatshirt' | 'buff' | 'cap'

export type FabricType = 'cotton' | 'dri-fit' | 'polo' | 'oversized'

export type DesignAreaType = 'front_full' | 'back' | 'chest_logo' | 'chest_logo_right' | 'center'

export interface DesignArea {
  area: DesignAreaType
  areaName: string // Hebrew name: קידמי מלא, גב, סמל כיס, מרכזי
  imageUrl: string
  fileName: string
}

export interface SizeQuantity {
  size: string // XS, S, M, L, XL, XXL, 3XL, 4XL
  quantity: number
}

export interface ProductConfig {
  productType: ProductType
  fabricType?: string
  color: string
  designs: DesignArea[]
  sizes: SizeQuantity[]
}

// ============================================================================
// Cart
// ============================================================================

export interface CartItem extends ProductConfig {
  id: string // Unique cart item ID
  pricePerUnit: number
  totalQuantity: number
  totalPrice: number
  mockupImageUrl?: string
}

export interface PackageCartItem {
  id: string              // package-{packageId}
  packageId: string
  packageName: string
  quantity: number
  pricePerUnit: number
  graphicDesignerCost: number
  totalPrice: number      // (quantity * pricePerUnit) + graphicDesignerCost
  image?: string
}

// ============================================================================
// Orders
// ============================================================================

export type OrderStatus =
  | 'pending_payment'
  | 'new'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export type ShippingMethod = 'delivery' | 'pickup'

export interface Address {
  street: string
  number: string
  city: string
  floor?: string
  entrance?: string
}

export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneSecondary?: string
  notes?: string
}

export interface Shipping {
  method: ShippingMethod
  address?: Address
  cost: number // 35 or 0
}

export interface OrderItem {
  productType: ProductType
  fabricType?: string
  color: string
  sizes: SizeQuantity[]
  designs: DesignArea[]
  pricePerUnit: number
  totalQuantity: number
  totalPrice: number
}

export interface Order {
  id: string
  orderNumber: number // #1001, #1002...
  status: OrderStatus
  paymentId?: string // tempOrderId sent to Grow, used by webhook to match
  customer: CustomerInfo
  shipping: Shipping
  items: OrderItem[]
  subtotal: number
  discount: number
  couponCode?: string
  total: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================================
// Leads
// ============================================================================

export type LeadSource = 'popup' | 'bottom_form' | 'contact_form'

export type LeadStatus =
  | 'new'
  | 'answered'
  | 'called_no_answer'
  | 'not_relevant'
  | 'closed_deal'

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  subject?: string
  message?: string
  source: LeadSource
  status: LeadStatus
  createdAt: Timestamp
}

// ============================================================================
// Inventory
// ============================================================================

export interface InventoryItem {
  id: string
  productType: ProductType
  fabricType?: string
  color: string
  size: string
  quantity: number
  lowStockThreshold: number
  updatedAt: Timestamp
}

// ============================================================================
// Reviews
// ============================================================================

export type ReviewStatus = 'pending' | 'approved'

export interface Review {
  id: string
  name: string
  rating: number // 1-5
  product?: string
  text: string
  status: ReviewStatus
  featured: boolean
  createdAt: Timestamp
}

// ============================================================================
// Coupons
// ============================================================================

export interface Coupon {
  id: string
  code: string // SAVE10-XXXX-XXXXX
  discountPercent: number // 10
  isUsed: boolean
  isActive: boolean
  expiresAt: Timestamp // 3 months from creation
  orderId?: string // linked to which order generated it
  createdAt: Timestamp
}

// ============================================================================
// Discounts
// ============================================================================

export type DiscountType = 'quantity'

export type DiscountCategory = 'tshirts' | 'sweatshirts' | 'all'

export interface Discount {
  id: string
  name: string
  type: DiscountType
  category: DiscountCategory
  minQuantity: number
  discountPercent: number
  isActive: boolean
}

// ============================================================================
// Site Images
// ============================================================================

export type ImageCategory =
  | 'tshirt_mockups'
  | 'sweatshirt_mockups'
  | 'buff_mockups'
  | 'cap_mockups'
  | 'designable_products'
  | 'homepage_carousel'
  | 'hero_carousel'
  | 'logo'
  | 'about_main'
  | 'about_process'
  | 'video'

export interface SiteImage {
  id: string
  category: ImageCategory
  name: string
  description?: string
  imageUrl: string
  isActive: boolean
  sortOrder: number
  createdAt: Timestamp
}

// ============================================================================
// Pricing
// ============================================================================

export interface DesignAreaPrice {
  area: DesignAreaType
  areaName: string // Hebrew name
  price: number
}

export interface SizeSurcharge {
  size: string
  surcharge: number
}

export interface FabricSurcharge {
  fabricType: string
  fabricName: string // Hebrew name
  surcharge: number
}

export interface PricingRule {
  id: string
  productType: ProductType
  basePrice: number
  fabricSurcharges: FabricSurcharge[]
  designAreas: DesignAreaPrice[]
  sizeSurcharges: SizeSurcharge[]
}

// ============================================================================
// Packages
// ============================================================================

export interface Package {
  id: string
  name: string
  tag: string // חדש, חסכוני, הכי משתלם
  minQuantity: number
  maxQuantity: number
  pricePerUnit: number
  graphicDesignerCost: number // 250 or 0 (free)
  isActive: boolean
  sortOrder: number
  image?: string
}

// ============================================================================
// Package Orders
// ============================================================================

export type PackageOrderStatus =
  | 'new'
  | 'in_design'
  | 'pending_approval'
  | 'approved'
  | 'in_production'
  | 'shipped'
  | 'completed'

export interface PackageOrder {
  id: string
  packageId: string
  customer: CustomerInfo
  fabricType?: string
  color: string
  sizes: SizeQuantity[]
  totalQuantity: number
  status: PackageOrderStatus
  createdAt: Timestamp
}

// ============================================================================
// Email Types
// ============================================================================

export type EmailType =
  | 'order_confirmation'
  | 'order_in_production'
  | 'order_shipped'
  | 'new_lead'

export interface EmailData {
  type: EmailType
  to: string
  data: Order | Lead
  couponCode?: string
}
