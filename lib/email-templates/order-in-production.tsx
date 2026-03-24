import { Order } from '../types'

interface OrderInProductionEmailProps {
  order: Order
}

export function OrderInProductionEmail({ order }: OrderInProductionEmailProps) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>הזמנה בייצור</title>
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
      background: linear-gradient(135deg, #7B2D8E 0%, #FDB913 100%);
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
      background-color: #7B2D8E;
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
    .timeline-dot.pending {
      background-color: #E5E7EB;
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
      <h1>🎨 ההזמנה בייצור!</h1>
      <p>החולצות שלך מודפסות כרגע</p>
    </div>

    <div class="content">
      <div class="icon">🖨️</div>

      <div class="order-number">
        הזמנה מספר: #${order.orderNumber}
      </div>

      <div class="message">
        <p><strong>שלום ${order.customer.firstName},</strong></p>
        <p>ההזמנה שלך נמצאת כרגע בתהליך הדפסה!</p>
        <p>אנחנו משתמשים בטכנולוגיית DTF המתקדמת ביותר כדי להבטיח איכות מעולה.</p>
      </div>

      <div class="timeline">
        <h3 style="margin-top: 0; color: #7B2D8E;">מעקב הזמנה</h3>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-text">
            <strong>הזמנה התקבלה</strong><br>
            <small style="color: #6B7280;">ההזמנה שלך אושרה ונכנסה למערכת</small>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="timeline-text">
            <strong>תשלום אושר</strong><br>
            <small style="color: #6B7280;">התשלום עבר בהצלחה</small>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot current"></div>
          <div class="timeline-text">
            <strong>בייצור</strong><br>
            <small style="color: #6B7280;">החולצות שלך מודפסות כרגע</small>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot pending"></div>
          <div class="timeline-text">
            <strong>נשלח</strong><br>
            <small style="color: #6B7280;">ההזמנה תישלח בקרוב</small>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot pending"></div>
          <div class="timeline-text">
            <strong>נמסר</strong><br>
            <small style="color: #6B7280;">החולצות יגיעו אליך</small>
          </div>
        </div>
      </div>

      <div style="background-color: #FEF3C7; border-right: 4px solid #FDB913; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong>זמן אספקה משוער:</strong> 3-7 ימי עסקים<br>
        <small style="color: #6B7280;">נעדכן אותך ברגע שההזמנה תצא למשלוח</small>
      </div>
    </div>

    <div class="footer">
      <p>יש שאלות? צרו קשר:</p>
      <p>
        <a href="mailto:badfos2002@gmail.com">badfos2002@gmail.com</a> |
        <a href="tel:0559885954">055-988-5954</a>
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
