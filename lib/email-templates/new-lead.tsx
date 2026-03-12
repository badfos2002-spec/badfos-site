import { Lead } from '../types'
import { escapeHtml } from '../utils'

interface NewLeadEmailProps {
  lead: Lead
}

export function NewLeadEmail({ lead }: NewLeadEmailProps) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ליד חדש</title>
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
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
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
    .lead-info {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6B7280;
      font-weight: 500;
    }
    .info-value {
      color: #1A1A2E;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .badge-new {
      background-color: #DBEAFE;
      color: #1E40AF;
    }
    .badge-source {
      background-color: #FEF3C7;
      color: #92400E;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #FDB913 0%, #7B2D8E 100%);
      color: #ffffff;
      padding: 15px 30px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
      margin: 20px 0;
    }
    .footer {
      background-color: #1A1A2E;
      color: #ffffff;
      padding: 20px;
      text-align: center;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 ליד חדש!</h1>
      <p>לקוח פוטנציאלי השאיר פרטים</p>
    </div>

    <div class="content">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-new">חדש</span>
        <span class="badge badge-source">${
          lead.source === 'popup' ? 'פופ-אפ' :
          lead.source === 'bottom_form' ? 'טופס תחתון' :
          lead.source === 'contact_form' ? 'טופס יצירת קשר' :
          escapeHtml(lead.source)
        }</span>
      </div>

      <div class="lead-info">
        <h2 style="margin-top: 0; color: #7B2D8E;">פרטי ליד</h2>

        <div class="info-row">
          <span class="info-label">שם:</span>
          <span class="info-value">${escapeHtml(lead.name)}</span>
        </div>

        <div class="info-row">
          <span class="info-label">טלפון:</span>
          <span class="info-value">
            <a href="tel:${escapeHtml(lead.phone)}" style="color: #2196F3; text-decoration: none;">
              ${escapeHtml(lead.phone)}
            </a>
          </span>
        </div>

        ${
          lead.email
            ? `
        <div class="info-row">
          <span class="info-label">אימייל:</span>
          <span class="info-value">
            <a href="mailto:${escapeHtml(lead.email!)}" style="color: #2196F3; text-decoration: none;">
              ${escapeHtml(lead.email!)}
            </a>
          </span>
        </div>
        `
            : ''
        }

        ${
          lead.subject
            ? `
        <div class="info-row">
          <span class="info-label">נושא:</span>
          <span class="info-value">${escapeHtml(lead.subject!)}</span>
        </div>
        `
            : ''
        }

        ${
          lead.message
            ? `
        <div class="info-row">
          <span class="info-label">הודעה:</span>
          <span class="info-value">${escapeHtml(lead.message!)}</span>
        </div>
        `
            : ''
        }

        <div class="info-row">
          <span class="info-label">תאריך:</span>
          <span class="info-value">${new Date().toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/${escapeHtml(lead.phone.replace(/\D/g, ''))}" class="cta-button">
          צור קשר עכשיו דרך WhatsApp
        </a>
      </div>

      <div style="background-color: #FEF3C7; border-right: 4px solid #FDB913; padding: 15px; border-radius: 4px;">
        <strong>💡 זכור:</strong> מענה מהיר מגדיל את הסיכוי להמרה! נסה ליצור קשר תוך שעה.
      </div>
    </div>

    <div class="footer">
      <p>דשבורד אדמין: <a href="https://badfos.co.il/admin/leads" style="color: #FDB913; text-decoration: none;">ניהול לידים</a></p>
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
