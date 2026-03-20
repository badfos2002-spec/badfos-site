import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ביקורות לקוחות | בדפוס',
  description: 'קראו ביקורות אמיתיות מלקוחות מרוצים של בדפוס. דירוג 5 כוכבים בגוגל. איכות הדפסה מעולה ושירות מהיר.',
  openGraph: {
    title: 'ביקורות לקוחות | בדפוס',
    description: 'דירוג 5 כוכבים בגוגל - קראו מה הלקוחות שלנו אומרים',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512 }],
  },
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
