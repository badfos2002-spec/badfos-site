import Link from 'next/link'
import { Phone, Mail, MapPin, Instagram, Facebook } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-400" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0 py-12">
        {/* Grid: 4 columns desktop, 1 column mobile */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-right">

          {/* Column 1 - Logo & About */}
          <div dir="rtl">
            <img
              src="/logo.png"
              alt="בדפוס"
              width={48}
              height={48}
              className="h-12 w-auto mx-auto md:mx-0 mb-4"
              loading="lazy"
            />
            <p className="text-sm leading-relaxed">
              בדפוס - הדפסת חולצות ומוצרי טקסטיל באיכות גבוהה. עיצוב אישי, מחירים הוגנים, ושירות מעולה.
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div dir="rtl">
            <h3 className="text-white text-lg font-bold mb-4">קישורים מהירים</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/home" className="hover:text-yellow-400 transition-colors">
                  דף הבית
                </Link>
              </li>
              <li>
                <Link href="/designer" className="hover:text-yellow-400 transition-colors">
                  עיצוב אישי
                </Link>
              </li>
              <li>
                <Link href="/packages" className="hover:text-yellow-400 transition-colors">
                  חבילות ומבצעים
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-yellow-400 transition-colors">
                  ביקורות לקוחות
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-yellow-400 transition-colors">
                  שאלות נפוצות
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-yellow-400 transition-colors">
                  אודות
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-yellow-400 transition-colors">
                  צור קשר
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Contact Info */}
          <div dir="rtl">
            <h3 className="text-white text-lg font-bold mb-4">יצירת קשר</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <Phone className="h-4 w-4 text-yellow-400" />
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="hover:text-yellow-400 transition-colors"
                >
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <Mail className="h-4 w-4 text-yellow-400" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="hover:text-yellow-400 transition-colors"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li className="flex items-center gap-2 justify-center md:justify-start">
                <MapPin className="h-4 w-4 text-yellow-400" />
                <span>{CONTACT_INFO.address}</span>
              </li>
            </ul>
          </div>

          {/* Column 4 - Social Networks */}
          <div dir="rtl">
            <h3 className="text-white text-lg font-bold mb-4">רשתות חברתיות</h3>
            <div className="flex gap-3 justify-center md:justify-start">
              <a
                href={CONTACT_INFO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-yellow-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 text-white" />
              </a>
              <a
                href={CONTACT_INFO.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-yellow-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 text-white" />
              </a>
              <a
                href={CONTACT_INFO.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-yellow-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="TikTok"
              >
                <span className="text-white text-lg">🎵</span>
              </a>
            </div>
            <p className="mt-4 text-xs">
              עקבו אחרינו ברשתות החברתיות לעדכונים ומבצעים בלעדיים!
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center space-y-3">
          <p className="text-sm text-gray-500">
            © {currentYear} בדפוס. כל הזכויות שמורות.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <Link href="/terms" className="hover:text-yellow-400 transition-colors">
              תקנון
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/privacy" className="hover:text-yellow-400 transition-colors">
              מדיניות פרטיות
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/accessibility" className="hover:text-yellow-400 transition-colors">
              הצהרת נגישות
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
