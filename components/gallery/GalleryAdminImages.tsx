'use client'

// עבודות שנוספו דרך האדמין (ניהול תמונות → קטגוריית "גלריית העבודות שלנו").
// נטען בצד לקוח מ-Firestore ומוצג בהמשך לגלריה הסטטית; אם אין תמונות — לא מוצג כלל.

import { useEffect, useState } from 'react'
import { queryDocuments } from '@/lib/db'
import type { SiteImage } from '@/lib/types'
import { PolaroidGallery } from '@/components/seo/blocks'

export default function GalleryAdminImages() {
  const [images, setImages] = useState<SiteImage[]>([])

  useEffect(() => {
    queryDocuments<SiteImage>('siteImages', [
      { field: 'category', operator: '==', value: 'gallery' },
    ])
      .then((data) =>
        setImages(
          data
            .filter((img) => img.isActive)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        )
      )
      .catch(() => {})
  }, [])

  if (images.length === 0) return null

  return (
    <div className="mt-16">
      <PolaroidGallery
        images={images.map((img) => ({
          src: img.imageUrl,
          alt: img.description || `${img.name} — עבודת הדפסה של בדפוס`,
          caption: img.name,
        }))}
      />
    </div>
  )
}
