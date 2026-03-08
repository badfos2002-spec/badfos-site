import { Order } from '../types'

interface OrderShippedEmailProps {
  order: Order
  trackingNumber?: string
}

export function OrderShippedEmail({
  order,
  trackingNumber,
}: OrderShippedEmailProps) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ההזמנה נשלחה</title>
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
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
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
    .icon {
      text-align: center;
      font-size: 64px;
      margin-bottom: 20px;
    }
    .order-number {
      background-color: #10B981;
      color: #ffffff;
      font-size: 24px;
      font-weight: bold;
      padding: 15px;
      text-align: center;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .message {
      text-align: center;
      font-size: 18px;
      color: #1A1A2E;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .tracking-box {
      background-color: #F0FDF4;
      border: 2px solid #10B981;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .tracking-number {
      font-size: 28px;
      font-weight: bold;
      color: #059669;
      letter-spacing: 2px;
      margin: 10px 0;
    }
    .address-box {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .address-box h3 {
      margin-top: 0;
      color: #7B2D8E;
    }
    .timeline {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .timeline-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
    }
    .timeline-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin-left: 15px;
      flex-shrink: 0;
    }
    .timeline-dot.done {
      background-color: #10B981;
    }
    .timeline-dot.current {
      background-color: #FDB913;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .timeline-text {
      flex: 1;
      color: #1A1A2E;
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
      <h1>📦 ההזמנה נשלחה!</h1>
      <p>החולצות שלך בדרך אליך</p>
    </div>

    <div class="content">
      <div class="icon">🚚</div>

      <div class="order-number">
        הזמנה מספר: #${order.orderNumber}
      </div>

      <div class="message">
        <p><strong>שלום ${order.customer.firstName},</strong></p>
        <p>שמחים לעדכן שההזמנה שלך יצאה למשלוח!</p>
        <p>החולצות שלך בדרך אליך ויגיעו בקרוב.</p>
      </div>

      ${
        trackingNumber
          ? `
      <div class="tracking-box">
        <h3 style="margin-top: 0; color: #059669;">מספר מעקב</h3>
        <div class="tracking-number">${trackingNumber}</div>
        <p style="margin-bottom: 0; font-size: 14px; color: #6B7280;">
          ניתן לעקוב אחר המשלוח באתר חברת השילוח
        </p>
      </div>
      `
          : ''
      }

      ${
        order.shipping.method === 'delivery'
          ? `
      <div class="address-box">
        <h3>כתובת למשלוח</h3>
        <p style="margin: 5px 0; color: #1A1A2E;">
          ${order.shipping.address?.street} ${order.shipping.address?.number}<br>
          ${order.shipping.address?.city}${order.shipping.address?.floor ? `, קומה ${order.shipping.address.floor}` : ''}
        </p>
      </div>
      `
          : `
      <div class="address-box">
        <h3>איסוף עצמי</h3>
        <p style="margin: 5px 0; color: #1A1A2E;">
          ההזמנה שלך מוכנה לאיסוף מהכתובת שלנו:<br>
          <strong>ראשון לציון</strong>
        </p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #6B7280;">
          אנא התקשרו לתיאום מועד: 050-779-4277
        </p>
      </div>
      `
      }

      <div class="timeline">
        <h3 style="margin-top: 0; color: #7B2D8E;">מעקב הזמנה</h3>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-text">
            <strong>הזמנה התקבלה</strong>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-text">
            <strong>תשלום אושר</strong>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-text">
            <strong>בייצור</strong>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-text">
            <strong>נשלח</strong>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot current"></div>
          <div class="timeline-text">
            <strong>בדרך אליך</strong><br>
            <small style="color: #6B7280;">ההזמנה תגיע תוך 2-3 ימי עסקים</small>
          </div>
        </div>
      </div>

      <div style="background-color: #DBEAFE; border-right: 4px solid #2196F3; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong>💡 טיפ:</strong> בדקו את החולצות מיד כשהן מגיעות. אם יש בעיה כלשהי, צרו איתנו קשר תוך 48 שעות ונטפל בזה מיידית!
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p style="font-size: 18px; color: #1A1A2E;">
          <strong>תודה שבחרתם בבדפוס! ❤️</strong>
        </p>
        <p style="color: #6B7280;">נשמח לשמוע מה דעתכם על המוצר</p>
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
