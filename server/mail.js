export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

export async function sendConfirmation({ id, name, email, plan, products, hotline }) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'consultation/' + id
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email],
        subject: 'Xác nhận yêu cầu tư vấn Viettel – ' + id,
        text: ['Xin chào ' + name + ',', 'Chúng tôi đã tiếp nhận yêu cầu tư vấn của bạn.',
          'Mã yêu cầu: ' + id, 'Gói hoặc dịch vụ: ' + (plan || products.join(', ')),
          'Hotline: ' + hotline].join('\n')
      })
    });
    const data = await response.json();
    if (response.ok && typeof data.id === 'string' && data.id) return { status: 'sent', emailId: data.id };
  } catch {}
  return { status: 'failed', emailId: null };
}
