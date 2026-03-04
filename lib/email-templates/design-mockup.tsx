import type { CustomerInfo, DesignArea } from '../types'

interface DesignMockupEmailProps {
  customer: CustomerInfo
  items: {
    productType: string
    color: string
    fabricType?: string
    designs: DesignArea[]
    totalQuantity: number
  }[]
  siteUrl: string
}

const MOCKUP_IMAGES: Record<string, { front: string; back: string }> = {
  white: { front: '/assets/חולצה לבנה קדימה.png', back: '/assets/חולצה לבנה אחורה.png' },
  black: { front: '/assets/חולצה שחורה קדימה.png', back: '/assets/חולצה שחורה אחורה.png' },
  gray: { front: '/assets/חולצה אפורה קדימה.png', back: '/assets/חולצה אפורה אחורה.png' },
  blue: { front: '/assets/חולצה כחולה קדימה.png', back: '/assets/חולצה כחולה אחורה.png' },
  red: { front: '/assets/חולצה אדומה קדימה.png', back: '/assets/חולצה אדומה אחורה.png' },
  burgundy: { front: '/assets/חולצה קדימה בורדו.png', back: '/assets/חולצה אחורה בורדו.png' },
  olive: { front: '/assets/חולצה קדימה ירוק זית.png', back: '/assets/חולצה אחורה ירוק זית.png' },
}

const COLOR_FALLBACK: Record<string, string> = {
  white: 'white', black: 'black', gray: 'gray', red: 'red',
  navy: 'blue', beige: 'white', burgundy: 'burgundy', olive: 'olive',
}

export function DesignMockupEmail({ customer, items, siteUrl }: DesignMockupEmailProps) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>הדמיית העיצוב שלך</title>
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
      font-size: 26px;
      font-weight: bold;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .item-block {
      margin-bottom: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }
    .item-header {
      background-color: #f9fafb;
      padding: 15px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .item-header h2 {
      margin: 0;
      font-size: 18px;
      color: #1A1A2E;
    }
    .item-header p {
      margin: 4px 0 0;
      font-size: 14px;
      color: #6B7280;
    }
    .mockup-row {
      padding: 20px;
      text-align: center;
    }
    .mockup-table {
      width: 100%;
      border-collapse: collapse;
    }
    .mockup-cell {
      width: 50%;
      text-align: center;
      vertical-align: top;
      padding: 10px;
    }
    .mockup-label {
      font-size: 14px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 8px;
    }
    .mockup-img {
      max-width: 200px;
      height: auto;
      border-radius: 8px;
    }
    .designs-section {
      padding: 15px 20px;
      background-color: #fefce8;
      border-top: 1px solid #e5e7eb;
    }
    .designs-section h3 {
      margin: 0 0 10px;
      font-size: 15px;
      color: #1A1A2E;
    }
    .design-item {
      display: inline-block;
      margin: 5px;
      text-align: center;
      vertical-align: top;
    }
    .design-img {
      width: 80px;
      height: 80px;
      object-fit: contain;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background-color: #ffffff;
    }
    .design-name {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
    }
    .note {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
      text-align: center;
    }
    .note p {
      margin: 0;
      font-size: 14px;
      color: #166534;
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
      <h1>הדמיית העיצוב שלך</h1>
      <p>היי ${customer.firstName}, הנה התצוגה המקדימה של ההזמנה שלך</p>
    </div>

    <div class="content">
      ${items.map((item, index) => {
        const resolvedColor = COLOR_FALLBACK[item.color] || item.color
        const mockup = MOCKUP_IMAGES[resolvedColor] || MOCKUP_IMAGES['black']
        const frontDesigns = item.designs.filter(d => d.area !== 'back')
        const backDesigns = item.designs.filter(d => d.area === 'back')
        const hasFront = frontDesigns.length > 0
        const hasBack = backDesigns.length > 0

        return `
      <div class="item-block">
        <div class="item-header">
          <h2>פריט ${items.length > 1 ? `#${index + 1} - ` : ''}${item.productType === 'tshirt' ? 'חולצה' : item.productType}</h2>
          <p>צבע: ${item.color} ${item.fabricType ? `• ${item.fabricType}` : ''} • ${item.totalQuantity} יחידות</p>
        </div>

        <div class="mockup-row">
          <table class="mockup-table">
            <tr>
              <td class="mockup-cell">
                <div class="mockup-label">קדימה</div>
                <img src="${siteUrl}${mockup.front}" alt="קדימה" class="mockup-img" />
              </td>
              ${hasBack || true ? `
              <td class="mockup-cell">
                <div class="mockup-label">אחורה</div>
                <img src="${siteUrl}${mockup.back}" alt="אחורה" class="mockup-img" />
              </td>
              ` : ''}
            </tr>
          </table>
        </div>

        ${item.designs.length > 0 ? `
        <div class="designs-section">
          <h3>העיצובים שהועלו:</h3>
          ${item.designs.map(design => `
            <div class="design-item">
              <img src="${design.imageUrl}" alt="${design.areaName}" class="design-img" />
              <div class="design-name">${design.areaName}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
        `
      }).join('')}

      <div class="note">
        <p>זוהי תצוגה מקדימה של ההזמנה שלך. הצוות שלנו ייצור קשר אתך לאישור סופי לפני ההדפסה.</p>
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
