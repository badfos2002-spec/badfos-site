// =============================================
// 🧪 בדיקות E2E — העתק והדבק בקונסול של הדפדפן
// פתח את האתר (https://badfos.co.il) → F12 → Console → הדבק
// =============================================

// ⚠️ שים את ה-SECRET שלך כאן:
const WEBHOOK_SECRET = 'PASTE_YOUR_SECRET_HERE';

// ========== תרחיש 1: אישור תשלום (צפוי 404 כי אין הזמנה) ==========
console.log('🧪 תרחיש 1: אישור תשלום עם secret...');
fetch('/api/payment/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': WEBHOOK_SECRET,
  },
  body: JSON.stringify({
    orderId: 'TEST-SUCCESS-777',
    transactionCode: 'TX-TEST-12345',
    amount: 150,
  }),
})
.then(r => r.json().then(d => ({ status: r.status, data: d })))
.then(({ status, data }) => {
  if (status === 404) {
    console.log('✅ תרחיש 1 עבר — 404 (אין הזמנה כזו, אבל ה-API עובד ומאומת)');
  } else if (status === 200) {
    console.log('✅ תרחיש 1 עבר — 200 (הזמנה עודכנה ל-paid!)', data);
  } else {
    console.log('⚠️ תרחיש 1 — Status:', status, data);
  }
})
.catch(e => console.error('❌ תרחיש 1 נכשל:', e));

// ========== תרחיש 2: אישור ללא secret (צפוי 401) ==========
console.log('🧪 תרחיש 2: אישור תשלום ללא secret...');
fetch('/api/payment/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 'TEST-NO-AUTH',
    transactionCode: 'TX-FAKE',
    amount: 100,
  }),
})
.then(r => r.json().then(d => ({ status: r.status, data: d })))
.then(({ status, data }) => {
  if (status === 401) {
    console.log('✅ תרחיש 2 עבר — 401 Unauthorized (אבטחה עובדת!)');
  } else {
    console.log('❌ תרחיש 2 — צפוי 401, קיבלנו:', status, data);
  }
})
.catch(e => console.error('❌ תרחיש 2 נכשל:', e));

// ========== תרחיש 3: Client confirm fallback (צפוי 404) ==========
console.log('🧪 תרחיש 3: Client fallback confirm...');
fetch('/api/payment/client-confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: 'TEST-CLIENT-FALLBACK' }),
})
.then(r => r.json().then(d => ({ status: r.status, data: d })))
.then(({ status, data }) => {
  if (status === 404) {
    console.log('✅ תרחיש 3 עבר — 404 (אין הזמנה, אבל ה-endpoint חי)');
  } else {
    console.log('⚠️ תרחיש 3 — Status:', status, data);
  }
})
.catch(e => console.error('❌ תרחיש 3 נכשל:', e));

// ========== סיכום ==========
setTimeout(() => {
  console.log('');
  console.log('📊 סיכום צפוי:');
  console.log('   תרחיש 1: 404 = ✅ (API מאומת, אין הזמנה לטסט)');
  console.log('   תרחיש 2: 401 = ✅ (אבטחה חוסמת בלי secret)');
  console.log('   תרחיש 3: 404 = ✅ (fallback endpoint חי)');
  console.log('');
  console.log('💡 לבדיקה מלאה עם הזמנה אמיתית:');
  console.log('   1. בצע הזמנה רגילה מהאתר');
  console.log('   2. פתח Firestore → orders → העתק את paymentId');
  console.log('   3. החלף TEST-SUCCESS-777 ב-paymentId האמיתי והרץ שוב');
}, 3000);
