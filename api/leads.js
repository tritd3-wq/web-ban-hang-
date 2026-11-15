import { allContent, db } from '../server/db.js';
import { body, clientIp, HttpError, json, limit, method, route, sameOrigin } from '../server/http.js';
import { mailConfigured, sendConfirmation, sendOwnerNotification } from '../server/mail.js';
import { emailValid, phoneValid } from '../site-model.js';

function field(value, max) {
  if (typeof value !== 'string' || value.length > max) throw new HttpError(400, 'Kiểm tra lại thông tin đã nhập.');
  return value.trim();
}

export default route(async (req, res) => {
  method(req, ['POST']);
  sameOrigin(req);
  const input = await body(req, 10_000);
  const id = field(input.id, 36);
  const name = field(input.name, 100);
  const email = field(input.email, 180).toLowerCase();
  const phone = field(input.phone ?? '', 30);
  const company = field(input.company ?? '', 150);
  const needs = field(input.needs ?? '', 2000);
  const planId = field(input.planId ?? '', 72);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ||
      name.length < 2 || !emailValid(email) || (phone && !phoneValid(phone)) ||
      input.consent !== true || input.website || !Array.isArray(input.products) || input.products.length > 100) {
    throw new HttpError(400, 'Vui lòng kiểm tra họ tên, email, số điện thoại và ô đồng ý.');
  }

  const sql = db();
  const existing = () => sql`SELECT id, email_status FROM leads WHERE id = ${id} AND email = ${email}`;
  const [previous] = await existing();
  if (previous) return json(res, 200, { id: previous.id, emailStatus: previous.email_status });

  await limit('lead-ip:' + clientIp(req), 8, 600);
  await limit('lead-email:' + email, 3, 600);
  const content = await allContent();
  const interests = new Map([...content.services.data, ...content.interests.data]
    .filter(item => item.enabled).map(item => [item.id, item.name]));
  const plan = planId ? content.plans.data.find(item => item.enabled && item.id === planId && interests.has(item.service)) : null;
  if (planId && !plan) throw new HttpError(400, 'Gói đã thay đổi. Vui lòng tải lại trang và chọn lại.');
  const ids = plan ? [plan.service] : [...new Set(input.products)];
  if (!ids.length || ids.some(id => typeof id !== 'string' || !interests.has(id))) {
    throw new HttpError(400, 'Vui lòng chọn ít nhất một dịch vụ còn hiển thị.');
  }
  const products = ids.map(id => interests.get(id));
  const initialStatus = mailConfigured() ? 'pending' : 'unconfigured';
  const [record] = await sql`INSERT INTO leads (id, name, email, phone, company, needs, products, plan_name, email_status)
      VALUES (${id}, ${name}, ${email}, ${phone}, ${company}, ${needs}, ${products}, ${plan?.name ?? null}, ${initialStatus})
      ON CONFLICT (id) DO NOTHING RETURNING id`;
  if (!record) {
    const [duplicate] = await existing();
    if (!duplicate) throw new HttpError(409, 'Mã yêu cầu đã dùng. Vui lòng tải lại trang.');
    return json(res, 200, { id: duplicate.id, emailStatus: duplicate.email_status });
  }

  let emailStatus = initialStatus;
  if (initialStatus === 'pending') {
    const contact = content.contact.data;
    const [result] = await Promise.all([
      sendConfirmation({ id, name, email, plan: plan?.name, products, hotline: contact.hotline }),
      sendOwnerNotification({ id, name, email, phone, company, needs, plan: plan?.name, products, ownerEmail: contact.email })
    ]);
    emailStatus = result.status;
    await sql`UPDATE leads SET email_status = ${result.status}, email_id = ${result.emailId} WHERE id = ${id}`;
  }
  json(res, 201, { id, emailStatus });
});
