import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  WhereFilterOp,
  DocumentData,
  QueryConstraint,
  increment,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type {
  Order,
  Lead,
  Review,
  Coupon,
  Discount,
  InventoryItem,
  SiteImage,
  PricingRule,
  Package,
  PackageOrder,
  OrderItem,
} from './types'

// ============================================================================
// Firebase Safety Check
// ============================================================================

function ensureFirebase(): void {
  if (!isFirebaseConfigured || !db) {
    console.warn('⚠️ Firebase operation attempted but Firebase is not configured')
    throw new Error('Firebase is not configured. Please add Firebase credentials to .env.local')
  }
}

// ============================================================================
// Generic CRUD Operations
// ============================================================================

/**
 * Create a new document in a collection
 */
export async function createDocument<T>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt'>
): Promise<string> {
  ensureFirebase()
  const docRef = await addDoc(collection(db!, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

/**
 * Get a single document by ID
 */
export async function getDocument<T>(
  collectionName: string,
  documentId: string
): Promise<T | null> {
  ensureFirebase()
  const docRef = doc(db!, collectionName, documentId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T
  }
  return null
}

/**
 * Set (create or overwrite) a document with a specific ID
 */
export async function setDocument(
  collectionName: string,
  documentId: string,
  data: object
): Promise<void> {
  ensureFirebase()
  const docRef = doc(db!, collectionName, documentId)
  await setDoc(docRef, data)
}

/**
 * Update a document
 */
export async function updateDocument<T>(
  collectionName: string,
  documentId: string,
  data: Partial<T>
): Promise<void> {
  ensureFirebase()
  const docRef = doc(db!, collectionName, documentId)
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  })
}

/**
 * Delete a document
 */
export async function deleteDocument(
  collectionName: string,
  documentId: string
): Promise<void> {
  ensureFirebase()
  const docRef = doc(db!, collectionName, documentId)
  await deleteDoc(docRef)
}

/**
 * Query documents with filters
 */
export async function queryDocuments<T>(
  collectionName: string,
  filters: { field: string; operator: WhereFilterOp; value: any }[] = [],
  orderByField?: string,
  limitCount?: number
): Promise<T[]> {
  ensureFirebase()
  const constraints: QueryConstraint[] = []

  // Add where clauses
  filters.forEach((filter) => {
    constraints.push(where(filter.field, filter.operator, filter.value))
  })

  // Add orderBy if specified
  if (orderByField) {
    constraints.push(orderBy(orderByField, 'desc'))
  }

  // Add limit if specified
  if (limitCount) {
    constraints.push(limit(limitCount))
  }

  const q = query(collection(db!, collectionName), ...constraints)
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[]
}

/**
 * Get all documents from a collection
 */
export async function getAllDocuments<T>(
  collectionName: string
): Promise<T[]> {
  ensureFirebase()
  const querySnapshot = await getDocs(collection(db!, collectionName))
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[]
}

// ============================================================================
// Orders
// ============================================================================

/**
 * Get the next order number (auto-increment)
 */
export async function getNextOrderNumber(): Promise<number> {
  ensureFirebase()
  const counterRef = doc(db!, 'counters', 'orders')
  const counterSnap = await getDoc(counterRef)

  if (counterSnap.exists()) {
    const currentNumber = counterSnap.data().current || 1000
    await updateDoc(counterRef, { current: increment(1) })
    return currentNumber + 1
  } else {
    // Initialize counter if it doesn't exist
    await setDoc(counterRef, { current: 1001 })
    return 1001
  }
}

/**
 * Create a new order
 */
export async function createOrder(
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const orderNumber = await getNextOrderNumber()

  const order: Omit<Order, 'id'> = {
    ...orderData,
    orderNumber,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  return await createDocument<Order>('orders', order)
}

/**
 * Get orders by status
 */
export async function getOrdersByStatus(
  status: string
): Promise<Order[]> {
  return await queryDocuments<Order>('orders', [
    { field: 'status', operator: '==', value: status },
  ])
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<Order[]> {
  return await queryDocuments<Order>('orders', [], 'createdAt')
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  await updateDocument<Order>('orders', orderId, { status } as any)
}

/**
 * Find order by sequential order number (e.g. 1001)
 */
export async function getOrderByNumber(orderNumber: number): Promise<Order | null> {
  const orders = await queryDocuments<Order>('orders', [
    { field: 'orderNumber', operator: '==', value: orderNumber },
  ])
  return orders.length > 0 ? orders[0] : null
}

/**
 * Find order by paymentId (the tempOrderId sent to Grow)
 */
export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  const orders = await queryDocuments<Order>('orders', [
    { field: 'paymentId', operator: '==', value: paymentId },
  ])
  return orders.length > 0 ? orders[0] : null
}

// ============================================================================
// Leads
// ============================================================================

/**
 * Create a new lead
 */
export async function createLead(
  leadData: Omit<Lead, 'id' | 'createdAt'>
): Promise<string> {
  return await createDocument<Lead>('leads', leadData)
}

/**
 * Get leads by date
 */
export async function getLeadsByDate(date: Date): Promise<Lead[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return await queryDocuments<Lead>(
    'leads',
    [
      {
        field: 'createdAt',
        operator: '>=',
        value: Timestamp.fromDate(startOfDay),
      },
      {
        field: 'createdAt',
        operator: '<=',
        value: Timestamp.fromDate(endOfDay),
      },
    ],
    'createdAt'
  )
}

/**
 * Get all leads
 */
export async function getAllLeads(): Promise<Lead[]> {
  return await queryDocuments<Lead>('leads', [], 'createdAt')
}

/**
 * Update lead status
 */
export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<void> {
  await updateDocument<Lead>('leads', leadId, { status } as any)
}

// ============================================================================
// Reviews
// ============================================================================

/**
 * Get approved reviews
 */
export async function getApprovedReviews(): Promise<Review[]> {
  return await queryDocuments<Review>('reviews', [
    { field: 'status', operator: '==', value: 'approved' },
  ])
}

/**
 * Get featured reviews
 */
export async function getFeaturedReviews(): Promise<Review[]> {
  return await queryDocuments<Review>('reviews', [
    { field: 'status', operator: '==', value: 'approved' },
    { field: 'featured', operator: '==', value: true },
  ])
}

/**
 * Create a new review
 */
export async function createReview(
  reviewData: Omit<Review, 'id' | 'createdAt'>
): Promise<string> {
  return await createDocument<Review>('reviews', reviewData)
}

// ============================================================================
// Coupons
// ============================================================================

/**
 * Generate a unique coupon code
 */
export function generateCouponCode(): string {
  const randomPart = Math.random().toString(36).substring(2, 15).toUpperCase()
  return `SAVE10-${randomPart}`
}

/**
 * Create a coupon (auto-generated after order payment)
 */
export async function createCoupon(orderId: string): Promise<string> {
  const code = generateCouponCode()
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 3) // 3 months from now

  const coupon: Omit<Coupon, 'id' | 'createdAt'> = {
    code,
    discountPercent: 10,
    isUsed: false,
    isActive: true,
    expiresAt: Timestamp.fromDate(expiresAt),
    orderId,
  }

  return await createDocument<Coupon>('coupons', coupon)
}

/**
 * Validate and get coupon by code
 */
export async function validateCoupon(code: string): Promise<Coupon | null> {
  const coupons = await queryDocuments<Coupon>('coupons', [
    { field: 'code', operator: '==', value: code },
    { field: 'isActive', operator: '==', value: true },
    { field: 'isUsed', operator: '==', value: false },
  ])

  if (coupons.length > 0) {
    const coupon = coupons[0]
    // Check if expired
    const now = Timestamp.now()
    if (coupon.expiresAt.seconds > now.seconds) {
      return coupon
    }
  }

  return null
}

/**
 * Mark coupon as used
 */
export async function markCouponAsUsed(couponId: string): Promise<void> {
  await updateDocument<Coupon>('coupons', couponId, { isUsed: true } as any)
}

// ============================================================================
// Inventory
// ============================================================================

/**
 * Get inventory item by product details
 */
export async function getInventoryItem(
  productType: string,
  fabricType: string | undefined,
  color: string,
  size: string
): Promise<InventoryItem | null> {
  const filters: any[] = [
    { field: 'productType', operator: '==', value: productType },
    { field: 'color', operator: '==', value: color },
    { field: 'size', operator: '==', value: size },
  ]

  if (fabricType) {
    filters.push({ field: 'fabricType', operator: '==', value: fabricType })
  }

  const items = await queryDocuments<InventoryItem>('inventory', filters)

  return items.length > 0 ? items[0] : null
}

/**
 * Deduct inventory when order goes to production
 */
export async function deductInventory(items: OrderItem[]): Promise<void> {
  for (const item of items) {
    for (const sizeQty of item.sizes) {
      const inventoryItem = await getInventoryItem(
        item.productType,
        item.fabricType,
        item.color,
        sizeQty.size
      )

      if (inventoryItem) {
        const newQuantity = inventoryItem.quantity - sizeQty.quantity
        await updateDocument<InventoryItem>('inventory', inventoryItem.id, {
          quantity: Math.max(0, newQuantity),
        } as any)
      }
    }
  }
}

/**
 * Update inventory quantity
 */
export async function updateInventoryQuantity(
  inventoryId: string,
  quantity: number
): Promise<void> {
  await updateDocument<InventoryItem>('inventory', inventoryId, {
    quantity,
  } as any)
}

// ============================================================================
// Discounts
// ============================================================================

/**
 * Get active discounts
 */
export async function getActiveDiscounts(): Promise<Discount[]> {
  return await queryDocuments<Discount>('discounts', [
    { field: 'isActive', operator: '==', value: true },
  ])
}

// ============================================================================
// Site Images
// ============================================================================

/**
 * Get active images by category
 */
export async function getImagesByCategory(
  category: string
): Promise<SiteImage[]> {
  return await queryDocuments<SiteImage>(
    'siteImages',
    [
      { field: 'category', operator: '==', value: category },
      { field: 'isActive', operator: '==', value: true },
    ],
    'sortOrder'
  )
}

// ============================================================================
// Pricing
// ============================================================================

/**
 * Get pricing rules by product type
 */
export async function getPricingRules(
  productType: string
): Promise<PricingRule | null> {
  const rules = await queryDocuments<PricingRule>('pricing', [
    { field: 'productType', operator: '==', value: productType },
  ])

  return rules.length > 0 ? rules[0] : null
}

// ============================================================================
// Packages
// ============================================================================

/**
 * Get active packages
 */
export async function getActivePackages(): Promise<Package[]> {
  return await queryDocuments<Package>(
    'packages',
    [{ field: 'isActive', operator: '==', value: true }],
    'sortOrder'
  )
}

/**
 * Create a package order
 */
export async function createPackageOrder(
  orderData: Omit<PackageOrder, 'id' | 'createdAt'>
): Promise<string> {
  return await createDocument<PackageOrder>('packageOrders', orderData)
}

// ============================================================================
// Shared Designs (for social sharing)
// ============================================================================

export interface SharedDesignData {
  productType: string
  color: string
  fabricType?: string
  designs: { area: string; areaName: string; imageBase64: string }[]
}

/**
 * Save a shared design and return its ID
 */
export async function createSharedDesign(data: SharedDesignData): Promise<string> {
  ensureFirebase()
  const docRef = await addDoc(collection(db!, 'shared_designs'), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

/**
 * Get a shared design by ID
 */
export async function getSharedDesign(id: string): Promise<(SharedDesignData & { id: string }) | null> {
  ensureFirebase()
  const snap = await getDoc(doc(db!, 'shared_designs', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as SharedDesignData & { id: string }
}
