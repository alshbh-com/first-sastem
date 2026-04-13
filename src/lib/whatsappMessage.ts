/**
 * Generate WhatsApp message text for order confirmation
 */
export function generateWhatsAppMessage(order: {
  tracking_id: string;
  product_name: string;
  price: number;
  delivery_price?: number;
  confirmation_token: string;
  customer_name: string;
}): string {
  const baseUrl = window.location.origin;
  const total = Number(order.price) + Number(order.delivery_price || 0);

  return `مرحباً ${order.customer_name} 👋
احنا شركة *FIRST* للشحن 🚛

تم تسجيل طلب لك في *FIRST Shipping*.

📦 رقم الطلب: *${order.tracking_id}*
🛍️ المنتج: *${order.product_name}*
💵 مبلغ التحصيل: *${total}* د.ل

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

  // Egyptian numbers: 01XXXXXXXXX -> 201XXXXXXXXX
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '2' + cleanPhone;
  }

  // If doesn't start with +, add it
  if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('2')) {
    cleanPhone = '2' + cleanPhone;
  }

  cleanPhone = cleanPhone.replace('+', '');

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}
