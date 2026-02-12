'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createLead } from '@/lib/db'

export default function NewContactFormSection() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    idNumber: '',
    comments: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createLead({
        name: formData.name,
        phone: formData.phone,
        email: '', // Optional
        message: `מספר זהות: ${formData.idNumber}\nהערות: ${formData.comments}`,
        source: 'homepage_contact',
        status: 'new',
      })

      setSubmitted(true)
      setFormData({ name: '', phone: '', idNumber: '', comments: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-16 lg:py-24 bg-background-dark text-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

      <div className="container-rtl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Right Side - Form */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 text-text-dark">
              {/* Form Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-xl font-bold">
                  השאירו פרטים ליצור קשר
                </h3>
              </div>

              {submitted ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <h4 className="font-bold text-lg text-green-800 mb-2">
                    תודה רבה!
                  </h4>
                  <p className="text-green-700">
                    קיבלנו את הפרטים שלך ונחזור אליך בהקדם
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      תעודת זהות
                    </label>
                    <Input
                      type="text"
                      value={formData.idNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, idNumber: e.target.value })
                      }
                      placeholder="000-0000000"
                      className="text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      שורה מלאה *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      מספר טלפון *
                    </label>
                    <Input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="050-0000000"
                      className="text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      הערות
                    </label>
                    <textarea
                      rows={3}
                      value={formData.comments}
                      onChange={(e) =>
                        setFormData({ ...formData, comments: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary text-right"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold py-6 h-auto text-base rounded-full shadow-lg"
                  >
                    {loading ? 'שולח...' : 'חייגו אלי עכשיו! 📞'}
                  </Button>

                  <p className="text-xs text-center text-gray-500 mt-4">
                    * שדות חובה | הפרטים שלך מאובטחים אצלנו
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Left Side - Content */}
          <div className="order-1 lg:order-2 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full mb-6">
              <span className="text-xl">⚡</span>
              <span className="text-sm font-medium">מענה מהיר ומקצועי</span>
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
              אל תתקשרו אלינו,
              <br />
              <span className="text-primary">אנחנו נתקשר אליכם!</span>
            </h2>

            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              רוצים לעשות כמו של האלפים המרוצים שלנו? צרו קשר עכשיו והאנשה
              שלנו יחזרו אליכם בתוך דקות ספורות. נשמח אליכם לחזור לו
              להתמחות מה שאת רוצה והצעת מחיר שהתאימה לך.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
