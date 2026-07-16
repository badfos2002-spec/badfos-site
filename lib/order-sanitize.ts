/**
 * Pure helpers shared by the server-side order sync endpoints
 * (/api/order-sync and /api/verify-order-sync).
 */

/** Cheap stable digest for design image strings (data URLs / storage URLs) —
 *  length + first/last 16 chars. Avoids hashing megabytes of base64. */
export function imageDigest(s: unknown): string {
  if (typeof s !== 'string' || !s) return 'none'
  return `${s.length}:${s.slice(0, 16)}:${s.slice(-16)}`
}

export function round2(n: unknown): number {
  const x = typeof n === 'number' && isFinite(n) ? n : 0
  return Math.round(x * 100) / 100
}

/** Stable, order-insensitive signature of an items array. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function itemsSignature(items: any[]): string {
  return items
    .map((item) => {
      const sizes = (Array.isArray(item?.sizes) ? item.sizes : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => (s?.quantity ?? 0) > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => `${s.size}x${s.quantity}`)
        .sort()
        .join(',')
      const designs = (Array.isArray(item?.designs) ? item.designs : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((d: any) => `${d?.area || ''}~${imageDigest(d?.imageUrl)}`)
        .sort()
        .join(',')
      return [
        item?.productType || '',
        item?.fabricType || '',
        item?.color || '',
        sizes,
        designs,
        item?.totalQuantity ?? 0,
        round2(item?.totalPrice),
      ].join('|')
    })
    .sort()
    .join('||')
}

/** Whitelist item fields before writing to Firestore (public endpoints). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeItems(items: any[]): any[] {
  return items.map((item) => ({
    productType: item?.productType || '',
    ...(item?.fabricType ? { fabricType: item.fabricType } : {}),
    color: item?.color || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sizes: (Array.isArray(item?.sizes) ? item.sizes : []).map((s: any) => ({
      size: String(s?.size || ''),
      quantity: Number(s?.quantity) || 0,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    designs: (Array.isArray(item?.designs) ? item.designs : []).map((d: any) => ({
      area: String(d?.area || ''),
      areaName: String(d?.areaName || ''),
      imageUrl: String(d?.imageUrl || ''),
      fileName: String(d?.fileName || ''),
    })),
    pricePerUnit: round2(item?.pricePerUnit),
    totalQuantity: Number(item?.totalQuantity) || 0,
    totalPrice: round2(item?.totalPrice),
  }))
}

/** Whitelist customer fields (public endpoint — never trust raw objects). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeCustomer(c: any): Record<string, string> {
  const str = (v: unknown, max: number) => String(typeof v === 'string' ? v : '').slice(0, max)
  return {
    firstName: str(c?.firstName, 100),
    lastName: str(c?.lastName, 100),
    email: str(c?.email, 200),
    phone: str(c?.phone, 30),
    ...(c?.phoneSecondary ? { phoneSecondary: str(c.phoneSecondary, 30) } : {}),
    ...(c?.notes ? { notes: str(c.notes, 2000) } : {}),
  }
}

/** Whitelist shipping fields. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeShipping(s: any): Record<string, unknown> {
  const str = (v: unknown, max: number) => String(typeof v === 'string' ? v : '').slice(0, max)
  const method = s?.method === 'pickup' ? 'pickup' : 'delivery'
  return {
    method,
    cost: round2(s?.cost),
    ...(s?.additionalPhone ? { additionalPhone: str(s.additionalPhone, 30) } : {}),
    ...(s?.address && typeof s.address === 'object'
      ? {
          address: {
            street: str(s.address.street, 200),
            number: str(s.address.number, 30),
            city: str(s.address.city, 100),
            ...(s.address.apartment ? { apartment: str(s.address.apartment, 30) } : {}),
            ...(s.address.floor ? { floor: str(s.address.floor, 30) } : {}),
            ...(s.address.entrance ? { entrance: str(s.address.entrance, 30) } : {}),
          },
        }
      : {}),
  }
}

/** Whitelist package cart items. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizePackages(packages: any[]): any[] {
  return (Array.isArray(packages) ? packages : []).map((pkg) => ({
    packageId: String(pkg?.packageId || ''),
    packageName: String(pkg?.packageName || '').slice(0, 200),
    quantity: Number(pkg?.quantity) || 0,
    pricePerUnit: round2(pkg?.pricePerUnit),
    graphicDesignerCost: round2(pkg?.graphicDesignerCost),
    totalPrice: round2(pkg?.totalPrice),
  }))
}
