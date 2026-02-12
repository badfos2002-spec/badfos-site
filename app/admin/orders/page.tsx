'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getAllOrders, updateOrderStatus, deleteDocument } from '@/lib/db'
import type { Order } from '@/lib/types'
import { Search, Trash2, Eye, Download } from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter, methodFilter])

  const loadOrders = async () => {
    try {
      const data = await getAllOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toString().includes(searchQuery) ||
          order.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter((order) => order.shipping.method === methodFilter)
    }

    setFilteredOrders(filtered)
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus)

      // Update local state
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )

      // TODO: Trigger automation based on status
      if (newStatus === 'paid') {
        // Generate coupon and send email
        console.log('TODO: Generate coupon and send confirmation email')
      } else if (newStatus === 'in_production') {
        // Deduct inventory and send email
        console.log('TODO: Deduct inventory and send production email')
      } else if (newStatus === 'shipped') {
        // Send shipped email
        console.log('TODO: Send shipped email')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('שגיאה בעדכון סטטוס')
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) return

    try {
      await deleteDocument('orders', orderId)
      setOrders(orders.filter((order) => order.id !== orderId))
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('שגיאה במחיקת הזמנה')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending_payment: { label: 'ממתין לתשלום', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'שולם', className: 'bg-green-100 text-green-800' },
      in_production: { label: 'בייצור', className: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'נשלח', className: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'נמסר', className: 'bg-teal-100 text-teal-800' },
      cancelled: { label: 'בוטל', className: 'bg-red-100 text-red-800' },
    }

    const variant = variants[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-text-gray">טוען הזמנות...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול הזמנות</h1>
        <p className="text-text-gray">עקוב ועדכן סטטוס הזמנות</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש לפי מספר/שם/אימייל"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                <SelectItem value="paid">שולם</SelectItem>
                <SelectItem value="in_production">בייצור</SelectItem>
                <SelectItem value="shipped">נשלח</SelectItem>
                <SelectItem value="delivered">נמסר</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל שיטות המשלוח" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל שיטות המשלוח</SelectItem>
                <SelectItem value="delivery">משלוח</SelectItem>
                <SelectItem value="pickup">איסוף עצמי</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-text-gray flex items-center">
              <strong className="ml-2">{filteredOrders.length}</strong>
              הזמנות
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-text-gray">לא נמצאו הזמנות</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      הזמנה #{order.orderNumber}
                    </h3>
                    <p className="text-text-gray">
                      {order.customer.firstName} {order.customer.lastName} •{' '}
                      {order.createdAt?.toDate().toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order)
                        setDetailsOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteOrder(order.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-text-gray mb-1">סכום</p>
                    <p className="font-bold text-lg">₪{order.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-gray mb-1">משלוח</p>
                    <p className="font-medium">
                      {order.shipping.method === 'delivery' ? 'משלוח' : 'איסוף עצמי'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-gray mb-1">סטטוס</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-gray">עדכן סטטוס:</span>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.id, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                      <SelectItem value="paid">שולם</SelectItem>
                      <SelectItem value="in_production">בייצור</SelectItem>
                      <SelectItem value="shipped">נשלח</SelectItem>
                      <SelectItem value="delivered">נמסר</SelectItem>
                      <SelectItem value="cancelled">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>פרטי הזמנה #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-bold mb-2">פרטי לקוח</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-text-gray">שם:</span>{' '}
                    {selectedOrder.customer.firstName} {selectedOrder.customer.lastName}
                  </div>
                  <div>
                    <span className="text-text-gray">טלפון:</span>{' '}
                    <a href={`tel:${selectedOrder.customer.phone}`} className="text-blue-600">
                      {selectedOrder.customer.phone}
                    </a>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-gray">אימייל:</span>{' '}
                    <a href={`mailto:${selectedOrder.customer.email}`} className="text-blue-600">
                      {selectedOrder.customer.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-bold mb-2">פריטים</h3>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg mb-2">
                    <p className="font-medium">
                      {item.productType} - {item.fabricType}
                    </p>
                    <p className="text-sm text-text-gray">
                      צבע: {item.color} | כמות: {item.quantity} | ₪{item.totalPrice}
                    </p>
                    {item.designFileUrls && item.designFileUrls.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">קבצי עיצוב:</p>
                        {item.designFileUrls.map((url, j) => (
                          <a
                            key={j}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline block"
                          >
                            <Download className="w-3 h-3 inline ml-1" />
                            קובץ {j + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Shipping */}
              {selectedOrder.shipping.method === 'delivery' && selectedOrder.shipping.address && (
                <div>
                  <h3 className="font-bold mb-2">כתובת משלוח</h3>
                  <p className="text-sm">
                    {selectedOrder.shipping.address.street}{' '}
                    {selectedOrder.shipping.address.number}
                    <br />
                    {selectedOrder.shipping.address.city},{' '}
                    {selectedOrder.shipping.address.zipCode}
                  </p>
                </div>
              )}

              {/* Summary */}
              <div>
                <h3 className="font-bold mb-2">סיכום</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>סה"כ מוצרים:</span>
                    <span>₪{selectedOrder.subtotal}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה:</span>
                      <span>-₪{selectedOrder.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>משלוח:</span>
                    <span>
                      ₪{selectedOrder.shipping.method === 'delivery' ? '35' : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>סה"כ:</span>
                    <span>₪{selectedOrder.total}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
