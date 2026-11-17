// Shared mockup image maps and overlay positions
// Used by TshirtDesigner, CartItem, and email templates

export const tshirtMockups: Record<string, string> = {
  white: '/assets/חולצה לבנה קדימה.webp',
  black: '/assets/חולצה שחורה קדימה.webp',
  gray: '/assets/חולצה אפורה קדימה.webp',
  blue: '/assets/חולצה כחולה קדימה.webp',
  red: '/assets/חולצה אדומה קדימה.webp',
  burgundy: '/assets/חולצה קדימה בורדו.webp',
  olive: '/assets/חולצה קדימה ירוק זית.webp',
  beige: '/assets/חולצה בז קדימה..webp',
}

export const tshirtMockupsBack: Record<string, string> = {
  white: '/assets/חולצה לבנה אחורה.webp',
  black: '/assets/חולצה שחורה אחורה.webp',
  gray: '/assets/חולצה אפורה אחורה.webp',
  blue: '/assets/חולצה כחולה אחורה.webp',
  red: '/assets/חולצה אדומה אחורה.webp',
  burgundy: '/assets/חולצה אחורה בורדו.webp',
  olive: '/assets/חולצה אחורה ירוק זית.webp',
  beige: '/assets/חולצה בז אחורה.webp',
}

// TICKET-018: the long-sleeve tee (fabric `long-sleeve`, white/black only) has
// its own photos — renders of the 3D model composed into the same branded
// 1200×1454 frame as the tee photos above, so every consumer's box maths reads
// the same way.
export const longSleeveMockups: Record<string, string> = {
  white: '/assets/longsleeve-white-front.webp',
  black: '/assets/longsleeve-black-front.webp',
}

export const longSleeveMockupsBack: Record<string, string> = {
  white: '/assets/longsleeve-white-back.webp',
  black: '/assets/longsleeve-black-back.webp',
}

export const colorFallback: Record<string, string> = {
  white: 'white', black: 'black', gray: 'gray', red: 'red',
  navy: 'blue', beige: 'beige', burgundy: 'burgundy', olive: 'olive',
}

export const capMockups: Record<string, Record<string, string>> = {
  tembel: {
    white: '/assets/כובע טמבל לבן.png',
    black: '/assets/כובע טמבל שחור.png',
    gray: '/assets/כובע טמבל אפור.png',
    burgundy: '/assets/כובע טמבל בורדו.png',
    olive: '/assets/כובע טמבל זית.png',
    khaki: '/assets/כובע טמבל חאקי.png',
    royalblue: '/assets/כובע טמבל כחול רויל.png',
    orange: '/assets/כובע טמבל כתום.png',
    yellow: '/assets/כובע טמבל צהוב.png',
  },
  mesh: {
    burgundy: '/assets/כובע רשת בורדו.png',
    beige: '/assets/כובע רשת בז.png',
    pink: '/assets/כובע רשת ורוד.png',
    green: '/assets/כובע רשת ירוק.png',
    royalblue: '/assets/כובע רשת כחול רויאל.png',
    black: '/assets/כובע רשת שחור.png',
  },
}

// TICKET-019: every back box (tee, long-sleeve, sweatshirt) is 5% wider than
// first measured, same aspect; top moved up by half the height gain so it stays
// centred.
export const DESIGN_AREA_OVERLAYS: Record<string, {
  view: 'front' | 'back'
  label: string
  style: { [key: string]: string }
}> = {
  front_full: {
    view: 'front',
    label: 'הדפסה קדמית',
    style: { width: '40%', aspectRatio: '140 / 120', top: '40%', left: '50%', transform: 'translateX(-50%)', borderRadius: '10px' },
  },
  back: {
    view: 'back',
    label: 'הדפסה אחורית',
    style: { width: '47.25%', aspectRatio: '180 / 200', top: '24.06%', left: '50%', transform: 'translateX(-50%)', borderRadius: '12px' },
  },
  chest_logo: {
    view: 'front',
    label: 'סמל ימין',
    style: { width: '12%', aspectRatio: '1', top: '30%', left: '30%', borderRadius: '6px' },
  },
  chest_logo_right: {
    view: 'front',
    label: 'סמל שמאל',
    style: { width: '12%', aspectRatio: '1', top: '30%', right: '30%', borderRadius: '6px' },
  },
  chest_logo_center: {
    view: 'front',
    label: 'סמל אמצעי',
    style: { width: '12%', aspectRatio: '1', top: '30%', left: '50%', transform: 'translateX(-50%)', borderRadius: '6px' },
  },
  // Sleeve prints. Right/left are the WEARER's side (like chest_logo), so on a
  // front photo כתף ימין sits on the viewer's LEFT. Both are anchored with
  // `left` and mirror exactly: left + width + left(other) = 100. Boxes measured
  // against 'חולצה לבנה קדימה.webp' — they sit between the sleeve's outer edge
  // and the armhole seam, clear of front_full (30%–70%) and the chest logos.
// TICKET-007: lowered so the box's bottom edge sits just above the diagonal
// sleeve hem (it used to hug the shoulder seam at 36%).
// TICKET-008: rolled (rotate only) so the bottom edge runs more parallel to
// that hem — clockwise on the viewer's left, mirrored on the right.
  shoulder_right: {
    view: 'front',
    label: 'כתף ימין',
    style: { width: '6.5%', aspectRatio: '1', top: '38.5%', left: '14.25%', borderRadius: '4px', transform: 'rotate(20deg)' },
  },
  shoulder_left: {
    view: 'front',
    label: 'כתף שמאל',
    style: { width: '6.5%', aspectRatio: '1', top: '38.5%', left: '79.25%', borderRadius: '4px', transform: 'rotate(-20deg)' },
  },
  center: {
    view: 'front',
    label: 'מרכזי',
    style: { width: '22%', aspectRatio: '140 / 100', top: '28%', left: '49.5%', transform: 'translateX(-50%)', borderRadius: '8px' },
  },
  cap_center: {
    view: 'front',
    label: 'קידמי',
    style: { width: '20%', aspectRatio: '1', top: '38%', left: '50%', transform: 'translateX(-50%)', borderRadius: '6px' },
  },
  cap_center_wide: {
    view: 'front',
    label: 'קידמי רוחבי',
    style: { width: '28%', aspectRatio: '180 / 80', top: '44%', left: '50%', transform: 'translateX(-50%)', borderRadius: '4px' },
  },
  cap_center_mesh: {
    view: 'front',
    label: 'קידמי',
    style: { width: '22%', aspectRatio: '1', top: '60%', left: '50%', transform: 'translateX(-50%)', borderRadius: '6px' },
  },
  buff_main: {
    view: 'front',
    label: 'עיצוב באף',
    style: { width: '22.5%', height: '35%', top: '28%', left: '31%', borderRadius: '8px', transform: 'rotate(44deg)' },
  },
  buff_bottom: {
    view: 'front',
    label: 'עיצוב באף',
    style: { width: '31%', height: '10.8%', top: '68.2%', left: '53%', borderRadius: '4px', clipPath: 'polygon(25% 0%, 75% 0%, 85% 100%, 15% 100%)' },
  },
}

// Areas whose box differs on the sweatshirt photos: the hoodie's back print is
// smaller, and its sleeves hang at the sides — much narrower and lower than a
// t-shirt's. Measured against 'סווטשרט חזית לבן.webp'; same mirror invariant.
// TICKET-007: the sleeve box moved down (was 40%) to the same arm height as the
// lowered t-shirt box.
export const SWEATSHIRT_AREA_OVERRIDES: Record<string, { [key: string]: string }> = {
  back: { width: '37.8%', aspectRatio: '180 / 200', top: '32.17%', left: '50%', transform: 'translateX(-50%)', borderRadius: '12px' },
  shoulder_right: { width: '5%', aspectRatio: '1', top: '42%', left: '16.7%', borderRadius: '4px', transform: 'rotate(8deg)' },
  shoulder_left: { width: '5%', aspectRatio: '1', top: '42%', left: '78.3%', borderRadius: '4px', transform: 'rotate(-8deg)' },
}

// TICKET-018: every long-sleeve area's box on the long-sleeve renders (the
// seven cotton areas). Front/back areas were measured from the 3D decals
// themselves (each area rendered alone, diffed against the bare render), so the
// 2D box agrees with the 3D view. The shoulder boxes sit on the FRONT face of
// the hanging arm — the decal itself is on the arm's outer side, edge-on from
// the front — at the decal's height, tilted with the arm. Wearer's right =
// viewer's left; the shoulders mirror exactly.
export const LONG_SLEEVE_AREA_OVERRIDES: Record<string, { [key: string]: string }> = {
  front_full: { width: '22.5%', aspectRatio: '270 / 302', top: '37%', left: '50%', transform: 'translateX(-50%)', borderRadius: '10px' },
  back: { width: '24.255%', aspectRatio: '277 / 364', top: '35.33%', left: '50%', transform: 'translateX(-50%)', borderRadius: '12px' },
  chest_logo: { width: '7.2%', aspectRatio: '1', top: '27.3%', left: '35.4%', borderRadius: '6px' },
  chest_logo_right: { width: '7.2%', aspectRatio: '1', top: '27.3%', right: '35.4%', borderRadius: '6px' },
  chest_logo_center: { width: '7.2%', aspectRatio: '1', top: '27.3%', left: '50%', transform: 'translateX(-50%)', borderRadius: '6px' },
  shoulder_right: { width: '7.3%', aspectRatio: '1', top: '34.6%', left: '20.3%', borderRadius: '4px', transform: 'rotate(6deg)' },
  shoulder_left: { width: '7.3%', aspectRatio: '1', top: '34.6%', left: '72.4%', borderRadius: '4px', transform: 'rotate(-6deg)' },
}

/** The t-shirt photo for a colour and side: the long-sleeve renders for the
 *  long-sleeve fabric (black when the colour has none — never a short-sleeve
 *  photo), otherwise the tee photos with their colour fallback. */
export function tshirtMockupSrc(color: string, view: 'front' | 'back', fabricType?: string): string {
  if (fabricType === 'long-sleeve') {
    const set = view === 'front' ? longSleeveMockups : longSleeveMockupsBack
    return set[color] || set.black
  }
  const resolved = colorFallback[color] || color
  const set = view === 'front' ? tshirtMockups : tshirtMockupsBack
  return set[resolved] || set.black
}

/** The overlay box style of an area on that photo. */
export function overlayStyle(area: string, fabricType?: string): { [key: string]: string } | undefined {
  if (fabricType === 'long-sleeve') return LONG_SLEEVE_AREA_OVERRIDES[area]
  return DESIGN_AREA_OVERLAYS[area]?.style
}
