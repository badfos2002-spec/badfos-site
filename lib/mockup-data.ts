// Shared mockup image maps and overlay positions
// Used by TshirtDesigner, CartItem, and email templates

export const tshirtMockups: Record<string, string> = {
  white: '/assets/חולצה לבנה קדימה.png',
  black: '/assets/חולצה שחורה קדימה.png',
  gray: '/assets/חולצה אפורה קדימה.png',
  blue: '/assets/חולצה כחולה קדימה.png',
  red: '/assets/חולצה אדומה קדימה.png',
  burgundy: '/assets/חולצה קדימה בורדו.png',
  olive: '/assets/חולצה קדימה ירוק זית.png',
}

export const tshirtMockupsBack: Record<string, string> = {
  white: '/assets/חולצה לבנה אחורה.png',
  black: '/assets/חולצה שחורה אחורה.png',
  gray: '/assets/חולצה אפורה אחורה.png',
  blue: '/assets/חולצה כחולה אחורה.png',
  red: '/assets/חולצה אדומה אחורה.png',
  burgundy: '/assets/חולצה אחורה בורדו.png',
  olive: '/assets/חולצה אחורה ירוק זית.png',
}

export const colorFallback: Record<string, string> = {
  white: 'white', black: 'black', gray: 'gray', red: 'red',
  navy: 'blue', beige: 'white', burgundy: 'burgundy', olive: 'olive',
}

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
    style: { width: '45%', aspectRatio: '180 / 200', top: '25%', left: '50%', transform: 'translateX(-50%)', borderRadius: '12px' },
  },
  chest_logo: {
    view: 'front',
    label: 'סמל שמאל',
    style: { width: '12%', aspectRatio: '1', top: '30%', right: '30%', borderRadius: '6px' },
  },
  chest_logo_right: {
    view: 'front',
    label: 'סמל ימין',
    style: { width: '12%', aspectRatio: '1', top: '30%', left: '30%', borderRadius: '6px' },
  },
}
