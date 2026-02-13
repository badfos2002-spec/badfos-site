'use client'

import { Image as ImageIcon, Upload, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminImagesPage() {
  const images = [
    { id: 1, name: 'hero-1.jpg', category: 'homepage_carousel', url: '/hero-1.jpg', active: true, order: 1 },
    { id: 2, name: 'hero-2.jpg', category: 'homepage_carousel', url: '/hero-2.jpg', active: true, order: 2 },
    { id: 3, name: 'tshirt-mockup.jpg', category: 'mockups', url: '/tshirt-mockup.jpg', active: true, order: 1 },
  ]

  const categories = [
    { id: 'homepage_carousel', name: 'קרוסלת דף הבית', count: 5 },
    { id: 'mockups', name: 'מוקאפים', count: 12 },
    { id: 'gallery', name: 'גלריה', count: 8 },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול תמונות</h1>
          <p className="text-gray-600">העלאה וניהול תמונות האתר</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
          <Upload className="w-4 h-4 ml-2" />
          העלה תמונה
        </Button>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {categories.map((cat) => (
          <button key={cat.id} className="bg-white rounded-xl shadow-lg p-4 text-right hover:shadow-xl transition-shadow">
            <h3 className="font-bold text-gray-900 mb-1">{cat.name}</h3>
            <p className="text-sm text-gray-600">{cat.count} תמונות</p>
          </button>
        ))}
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div key={image.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-400" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate">{image.name}</h3>
                <span className={`w-2 h-2 rounded-full ${image.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
              <p className="text-sm text-gray-500 mb-4">{image.category}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </Button>
                <Button size="sm" variant="outline" className={image.active ? 'border-yellow-500 text-yellow-600' : 'border-green-500 text-green-600'}>
                  {image.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" className="border-red-500 text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
