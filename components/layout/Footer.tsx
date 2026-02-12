import Link from 'next/link'
import { Phone, Mail, MapPin, Instagram, Facebook } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-background-dark text-gray-300">
      <div className="container-rtl py-12">
        {/* Logo at top right */}
        <div className="flex justify-end mb-8">
          <img
            src="/logo.png"
            alt="בדפוס"
            className="h-16 w-auto"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1 - Quick Links */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">קישורים מהירים</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  דף הבית
                </Link>
              </li>
              <li>
                <Link href="/designer" className="hover:text-primary transition-colors">
                  מעצב חולצות
                </Link>
              </li>
              <li>
                <Link href="/packages" className="hover:text-primary transition-colors">
                  חבילות ומבצעים
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-primary transition-colors">
                  ביקורות לקוחות
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary transition-colors">
                  שאלות נפוצות
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  אודות
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">
                  צור קשר
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">צור קשר</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="hover:text-primary transition-colors"
                >
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="hover:text-primary transition-colors"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{CONTACT_INFO.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          {/* Social Icons & Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              © {currentYear} בדפוס. כל הזכויות שמורות.
            </div>

            <div className="flex gap-4">
              <h4 className="text-white font-bold">עקבו אחרינו</h4>
            </div>

            <div className="flex gap-4">
              <a
                href={CONTACT_INFO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Instagram className="h-5 w-5 text-white" />
              </a>
              <a
                href={CONTACT_INFO.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Facebook className="h-5 w-5 text-white" />
              </a>
              <a
                href="https://www.tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <span className="text-white text-lg">🎵</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
