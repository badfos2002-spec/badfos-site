import { Order } from '../types'

interface OrderConfirmationEmailProps {
  order: Order
  couponCode?: string
}

export function OrderConfirmationEmail({
  order,
  couponCode,
}: OrderConfirmationEmailProps) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אישור הזמנה</title>
  <style>
    body {
      font-family: 'Heebo', Arial, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #FDB913 0%, #7B2D8E 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 30px 20px;
    }
    .order-number {
      background-color: #FDB913;
      color: #1A1A2E;
      font-size: 24px;
      font-weight: bold;
      padding: 15px;
      text-align: center;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .info-section {
      margin-bottom: 25px;
    }
    .info-section h2 {
      font-size: 18px;
      color: #1A1A2E;
      border-bottom: 2px solid #FDB913;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      color: #6B7280;
      font-weight: 500;
    }
    .info-value {
      color: #1A1A2E;
      font-weight: 600;
    }
    .item {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .coupon-box {
      background: linear-gradient(135deg, #7B2D8E 0%, #FDB913 100%);
      color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .coupon-code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 3px;
      margin: 10px 0;
      background-color: rgba(255, 255, 255, 0.2);
      padding: 10px;
      border-radius: 4px;
    }
    .footer {
      background-color: #1A1A2E;
      color: #ffffff;
      padding: 20px;
      text-align: center;
      font-size: 14px;
    }
    .footer a {
      color: #FDB913;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 תודה על ההזמנה!</h1>
      <p>ההזמנה שלך התקבלה בהצלחה</p>
    </div>

    <div class="content">
      <div class="order-number">
        הזמנה מספר: #${order.orderNumber}
      </div>

      <div class="info-section">
        <h2>פרטי לקוח</h2>
        <div class="info-row">
          <span class="info-label">שם:</span>
          <span class="info-value">${order.customer.firstName} ${order.customer.lastName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">אימייל:</span>
          <span class="info-value">${order.customer.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">טלפון:</span>
          <span class="info-value">${order.customer.phone}</span>
        </div>
      </div>

      <div class="info-section">
        <h2>פריטים</h2>
        ${order.items
          .map(
            (item) => `
          <div class="item">
            <strong>${item.productType} - ${item.fabricType}</strong><br>
            צבע: ${item.color}<br>
            כמות: ${item.totalQuantity} יחידות<br>
            מחיר: ₪${item.totalPrice}
          </div>
        `
          )
          .join('')}
      </div>

      <div class="info-section">
        <h2>סיכום הזמנה</h2>
        <div class="info-row">
          <span class="info-label">סה"כ מוצרים:</span>
          <span class="info-value">₪${order.subtotal}</span>
        </div>
        ${
          order.discount > 0
            ? `
        <div class="info-row">
          <span class="info-label">הנחה:</span>
          <span class="info-value">-₪${order.discount}</span>
        </div>
        `
            : ''
        }
        <div class="info-row">
          <span class="info-label">משלוח:</span>
          <span class="info-value">₪${order.shipping.method === 'delivery' ? '35' : '0'}</span>
        </div>
        <div class="info-row" style="border-top: 2px solid #FDB913; margin-top: 10px; padding-top: 10px;">
          <span class="info-label"><strong>סה"כ לתשלום:</strong></span>
          <span class="info-value"><strong>₪${order.total}</strong></span>
        </div>
      </div>

      ${
        couponCode
          ? `
      <div class="coupon-box">
        <h2 style="margin: 0 0 10px 0;">🎁 קופון מתנה להזמנה הבאה!</h2>
        <p style="margin: 0 0 10px 0;">קיבלת 15% הנחה על ההזמנה הבאה</p>
        <div class="coupon-code">${couponCode}</div>
        <p style="margin: 10px 0 0 0; font-size: 14px;">שימו את הקוד הזה בהזמנה הבאה</p>
      </div>
      `
          : ''
      }

      <div class="info-section">
        <h2>המשך תהליך</h2>
        <p>ההזמנה שלך נמצאת בתהליך עיבוד. נעדכן אותך במייל לגבי התקדמות ההזמנה.</p>
        <p><strong>זמן אספקה משוער:</strong> 3-7 ימי עסקים</p>
      </div>
    </div>

    <div class="footer">
      <p>יש שאלות? צרו קשר:</p>
      <p>
        <a href="mailto:badfos2002@gmail.com">badfos2002@gmail.com</a> |
        <a href="tel:0507794277">050-779-4277</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px; color: #9CA3AF;">
        בדפוס - הדפסת חולצות בעיצוב אישי<br>
        badfos.co.il
      </p>
    </div>
  </div>
</body>
</html>
`
}
