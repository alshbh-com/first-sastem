/**
 * Generate WhatsApp message text for order confirmation
 */
export function generateWhatsAppMessage(order: {
  tracking_id: string;
  product_name: string;
  price: number;
  confirmation_token: string;
  customer_name: string;
}): string {
  const baseUrl = window.location.origin;

  return `مرحباً ${order.customer_name} 👋

تم تسجيل طلب لك في *FIRST Shipping*.

📦 رقم الطلب: *${order.tracking_id}*
🛍️ المنتج: *${order.product_name}*
💰 السعر: *${order.price}* د.ل

━━━━━━━━━━━━━━━

✅ *لتأكيد الطلب:*
${baseUrl}/order-action?token=${order.confirmation_token}&action=confirm

❌ *لإلغاء الطلب:*
${baseUrl}/order-action?token=${order.confirmation_token}&action=cancel

⏳ *لتأجيل الرد:*
${baseUrl}/order-action?token=${order.confirmation_token}&action=delay

━━━━━━━━━━━━━━━

شكراً لثقتك بنا 🙏`;
}

/**
 * Open WhatsApp with pre-filled message
 */
export function openWhatsApp(phone: string, message: string) {
  // Clean phone number - remove spaces, dashes, etc.
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // If starts with 0, assume Libya (+218)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '218' + cleanPhone.substring(1);
  }

  // If doesn't start with +, add it
  if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('218')) {
    cleanPhone = '218' + cleanPhone;
  }

  cleanPhone = cleanPhone.replace('+', '');

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}
