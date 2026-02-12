'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createLead } from '@/lib/db'

export default function LeadForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createLead({
        name,
        phone,
        source: 'bottom_form',
        status: 'new',
      })

      setSubmitted(true)
      setName('')
      setPhone('')

      // Reset after 5 seconds
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error submitting lead:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section-spacing">
      <div className="container-rtl">
        <Card className="max-w-2xl mx-auto border-2 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl">
              אל תתקשרו אלינו, אנחנו נתקשר אליכם! 📞
            </CardTitle>
            <p className="text-text-gray mt-2">
              השאירו פרטים ונחזור אליכם בהקדם עם כל המידע
            </p>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  תודה! קיבלנו את הפרטים
                </h3>
                <p className="text-green-700">
                  נחזור אליך בהקדם האפשרי
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="הכנס את שמך"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    טלפון *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    pattern="[0-9]{10}"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="05X-XXXXXXX"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-cta text-lg h-12"
                >
                  {loading ? 'שולח...' : 'שלח פרטים'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
