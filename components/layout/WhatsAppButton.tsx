'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Accessibility, X, Type, Contrast, MousePointer, Underline, Space, Eye, Palette } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'
import { trackWhatsAppClick } from '@/lib/tracking'

export default function WhatsAppButton() {
  const whatsappUrl = `https://wa.me/${CONTACT_INFO.whatsapp}`
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [fontSize, setFontSize] = useState(0)
  const [contrast, setContrast] = useState<'normal' | 'dark' | 'light' | 'invert'>('normal')
  const [highlightLinks, setHighlightLinks] = useState(false)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [lineHeight, setLineHeight] = useState(0)
  const [hideImages, setHideImages] = useState(false)
  const [readableFont, setReadableFont] = useState(false)
  const [bigCursor, setBigCursor] = useState(false)
  const [stopAnimations, setStopAnimations] = useState(false)

  const handleWhatsAppClick = () => {
    trackWhatsAppClick('floating_button')
  }

  // Keyboard shortcut: Ctrl+U
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        setShowAccessibility(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Apply accessibility changes
  useEffect(() => {
    const html = document.documentElement

    // Font size
    html.style.fontSize = fontSize === 0 ? '' : `${100 + fontSize * 20}%`

    // Contrast
    html.classList.remove('a11y-dark', 'a11y-light', 'a11y-invert')
    if (contrast !== 'normal') html.classList.add(`a11y-${contrast}`)

    // Highlight links
    html.classList.toggle('a11y-highlight-links', highlightLinks)

    // Letter spacing
    html.style.letterSpacing = letterSpacing === 0 ? '' : `${letterSpacing * 2}px`

    // Line height
    html.style.lineHeight = lineHeight === 0 ? '' : `${1.5 + lineHeight * 0.5}`

    // Hide images
    html.classList.toggle('a11y-hide-images', hideImages)

    // Readable font
    html.classList.toggle('a11y-readable-font', readableFont)

    // Big cursor
    html.classList.toggle('a11y-big-cursor', bigCursor)

    // Stop animations
    html.classList.toggle('a11y-stop-animations', stopAnimations)
  }, [fontSize, contrast, highlightLinks, letterSpacing, lineHeight, hideImages, readableFont, bigCursor, stopAnimations])

  const resetAll = useCallback(() => {
    setFontSize(0)
    setContrast('normal')
    setHighlightLinks(false)
    setLetterSpacing(0)
    setLineHeight(0)
    setHideImages(false)
    setReadableFont(false)
    setBigCursor(false)
    setStopAnimations(false)
  }, [])

  return (
    <>
      {/* Accessibility CSS */}
      <style jsx global>{`
        .a11y-dark { filter: contrast(1.5) brightness(0.8); }
        .a11y-light { filter: contrast(1.2) brightness(1.2); }
        .a11y-invert { filter: invert(1) hue-rotate(180deg); }
        .a11y-invert img, .a11y-invert video { filter: invert(1) hue-rotate(180deg); }
        .a11y-highlight-links a { outline: 3px solid #FFD700 !important; outline-offset: 2px; }
        .a11y-hide-images img { opacity: 0 !important; }
        .a11y-readable-font * { font-family: Arial, Helvetica, sans-serif !important; }
        .a11y-big-cursor, .a11y-big-cursor * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath fill='black' stroke='white' stroke-width='1' d='M5 3l14 8-6 2 4 8-3 1-4-8-5 4z'/%3E%3C/svg%3E") 4 4, auto !important; }
        .a11y-stop-animations *, .a11y-stop-animations *::before, .a11y-stop-animations *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `}</style>

      {/* Accessibility Panel */}
      {showAccessibility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowAccessibility(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90vw] sm:w-[340px] max-h-[80vh] overflow-y-auto p-5 sm:p-6"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">כלי נגישות</h2>
              <button onClick={() => setShowAccessibility(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Font Size */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">גודל טקסט</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFontSize(f => Math.max(-2, f - 1))} className="w-8 h-8 bg-white border rounded-lg font-bold hover:bg-gray-100">-</button>
                  <span className="text-sm w-6 text-center">{fontSize}</span>
                  <button onClick={() => setFontSize(f => Math.min(4, f + 1))} className="w-8 h-8 bg-white border rounded-lg font-bold hover:bg-gray-100">+</button>
                </div>
              </div>

              {/* Contrast */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Contrast className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">ניגודיות</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { value: 'normal' as const, label: 'רגיל' },
                    { value: 'dark' as const, label: 'כהה' },
                    { value: 'light' as const, label: 'בהיר' },
                    { value: 'invert' as const, label: 'היפוך' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setContrast(opt.value)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border ${contrast === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter Spacing */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Space className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">ריווח אותיות</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setLetterSpacing(s => Math.max(0, s - 1))} className="w-8 h-8 bg-white border rounded-lg font-bold hover:bg-gray-100">-</button>
                  <span className="text-sm w-6 text-center">{letterSpacing}</span>
                  <button onClick={() => setLetterSpacing(s => Math.min(4, s + 1))} className="w-8 h-8 bg-white border rounded-lg font-bold hover:bg-gray-100">+</button>
                </div>
              </div>

              {/* Line Height */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">גובה שורה</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setLineHeight(h => Math.max(0, h - 1))} className="w-8 h-8 bg-white border rounded-lg font-bold hover:bg-gray-100">-</button>
                  <span className="text-sm w-6 text-center">{lineHeight}</span>
                  <button onClick={() => setLineHeight(h => Math.min(4, h + 1))} className="w-8 h-8 bg-white border rounded-lg font-bold hover:bg-gray-100">+</button>
                </div>
              </div>

              {/* Toggle Options */}
              {[
                { icon: Underline, label: 'הדגש קישורים', value: highlightLinks, toggle: () => setHighlightLinks(v => !v) },
                { icon: Palette, label: 'גופן קריא', value: readableFont, toggle: () => setReadableFont(v => !v) },
                { icon: Eye, label: 'הסתר תמונות', value: hideImages, toggle: () => setHideImages(v => !v) },
                { icon: MousePointer, label: 'סמן גדול', value: bigCursor, toggle: () => setBigCursor(v => !v) },
                { icon: Contrast, label: 'בטל הנפשות', value: stopAnimations, toggle: () => setStopAnimations(v => !v) },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={opt.toggle}
                  className={`flex items-center gap-2 w-full p-3 rounded-xl text-sm font-medium transition-colors ${opt.value ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}`}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                </button>
              ))}

              {/* Reset */}
              <button
                onClick={resetAll}
                className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors"
              >
                איפוס הכול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Buttons */}
      <div className="fixed bottom-4 right-2 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2 sm:gap-3">
        <button
          onClick={() => setShowAccessibility(true)}
          className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:scale-110 transition-transform"
          aria-label="כלי נגישות"
        >
          <Accessibility className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent-whatsapp text-white shadow-lg hover:scale-110 transition-transform pulse-green"
          aria-label="פתח WhatsApp"
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
        </a>
      </div>
    </>
  )
}
