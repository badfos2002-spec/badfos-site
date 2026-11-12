export type ProductPricing = { base: Record<string, number>; areas: Record<string, number> }

/** Code-default products pricing (used when nothing is saved yet). */
export function codeDefaults(): Record<string, ProductPricing> {
  return {
    tshirt: { base: { cotton: 37, 'dri-fit': 37, polo: 47, oversized: 47 }, areas: { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5, chest_logo_center: 5, shoulder_right: 5, shoulder_left: 5 } },
    sweatshirt: { base: { kangaroo: 53, putter: 53, zip: 53 }, areas: { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5, chest_logo_center: 5, shoulder_right: 5, shoulder_left: 5 } },
    cap: { base: { tembel: 30, mesh: 30 }, areas: { center: 5, center_wide: 5 } },
    tote: { base: { volume: 35, drawstring: 35 }, areas: { front_full: 5, back: 5 } },
    vest: { base: { default: 30 }, areas: { back: 10, chest_logo: 5, chest_logo_right: 5 } },
    buff: { base: { default: 8 }, areas: { center: 8 } },
    apron: { base: { default: 29 }, areas: { center: 10 } },
    baby: { base: { default: 35 }, areas: { front_full: 5, back: 5 } },
  }
}
