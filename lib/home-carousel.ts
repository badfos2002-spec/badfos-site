import type { CarouselItem } from './types'

// Items for the home-page hero product river (ProductRiver).
// Images: transparent 800×800 PNG renders in public/renders/.
// To add/remove/reorder products — edit this array only.
// Order groups: חולצות → עליונים → כובעים → שאר.
// The river shows 7 items per row (top = orders 1-7, bottom = 8-14).
// href — the product's designer page; ?fabric= / ?type= preselect the variant
// there (one-time read on mount in each designer).
export const HOME_CAROUSEL_ITEMS: CarouselItem[] = [
  // חולצות
  { id: 'tshirt', imageUrl: '/renders/tshirt.png', tag: 'טי-שירטים', order: 1, href: '/designer/tshirt?fabric=cotton' },
  { id: 'polo', imageUrl: '/renders/polo.png', tag: 'פולו', order: 2, href: '/designer/tshirt?fabric=polo' },
  { id: 'oversized', imageUrl: '/renders/oversized.png', tag: 'אוברסייז', order: 3, href: '/designer/tshirt?fabric=oversized' },
  // עליונים
  { id: 'sweatshirt', imageUrl: '/renders/sweatshirt.png', tag: 'פוטרים', order: 4, href: '/designer/sweatshirt?type=putter' },
  { id: 'hoodie', imageUrl: '/renders/hoodie.png', tag: 'קפוצ\'ונים', order: 5, href: '/designer/sweatshirt?type=kangaroo' },
  { id: 'ziphoodie', imageUrl: '/renders/ziphoodie.png', tag: 'קפוצ\'ון רוכסן', order: 6, href: '/designer/sweatshirt?type=zip' },
  // כובעים
  { id: 'cap-mesh', imageUrl: '/renders/cap-mesh.png', tag: 'כובע רשת', order: 7, href: '/designer/cap?type=mesh' },
  { id: 'cap', imageUrl: '/renders/cap.png', tag: 'כובע טמבל', order: 8, href: '/designer/cap?type=tembel' },
  // שאר
  { id: 'apron', imageUrl: '/renders/apron.png', tag: 'סינרים', order: 9, href: '/designer/apron' },
  { id: 'buff', imageUrl: '/renders/buff.png', tag: 'באפים', order: 10, href: '/designer/buff' },
  { id: 'baby', imageUrl: '/renders/baby.png', tag: 'בגדי גוף', order: 11, href: '/designer/baby' },
  { id: 'vest', imageUrl: '/renders/vest.png', tag: 'ווסטים זוהרים', order: 12, href: '/designer/vest' },
  { id: 'tote', imageUrl: '/renders/tote.png', tag: 'תיקי בד', order: 13, href: '/designer/tote?type=volume' },
  { id: 'dsbag', imageUrl: '/renders/dsbag.png', tag: 'תיק שרוך', order: 14, href: '/designer/tote?type=drawstring' },
].sort((a, b) => a.order - b.order)
