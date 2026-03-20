import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ביקורות לקוחות | בדפוס',
  description: 'קראו ביקורות אמיתיות מלקוחות מרוצים של בדפוס. דירוג 5 כוכבים בגוגל. איכות הדפסה מעולה ושירות מהיר.',
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
