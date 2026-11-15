export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

async function sendEmail(key, message) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': key
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        ...message
      })
    });
    const data = await response.json();
    if (response.ok && typeof data.id === 'string' && data.id) return { status: 'sent', emailId: data.id };
  } catch {}
  return { status: 'failed', emailId: null };
}

export function sendConfirmation({ id, name, email, plan, products, hotline }) {
  return sendEmail('consultation/' + id, {
    to: [email],
    subject: 'Xác nhận yêu cầu tư vấn Viettel – ' + id,
    text: [
      'Xin chào ' + name + ',',
      'Chúng tôi đã tiếp nhận yêu cầu tư vấn của bạn.',
      'Mã yêu cầu: ' + id,
      'Gói hoặc dịch vụ: ' + (plan || products.join(', ')),
      'Hotline: ' + hotline
    ].join('\n')
  });
}

export async function sendOwnerNotification({ id, name, email, phone, company, needs, plan, products, ownerEmail }) {
  const result = await sendEmail('consultation-owner/' + id, {
    to: [ownerEmail],
    reply_to: email,
    subject: 'Yêu cầu tư vấn mới – ' + id,
    text: [
      'Mã yêu cầu: ' + id,
      'Họ và tên: ' + name,
      'Email: ' + email,
      phone && 'Số điện thoại: ' + phone,
      company && 'Tên doanh nghiệp: ' + company,
      'Dịch vụ: ' + products.join(', '),
      plan && 'Gói đã chọn: ' + plan,
      needs && 'Nhu cầu: ' + needs
    ].filter(Boolean).join('\n')
  });
  if (result.status === 'failed') console.warn('Owner notification failed for lead', id);
}
