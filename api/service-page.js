import { allContent } from '../server/db.js';
import { method, route } from '../server/http.js';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = value => value.replace(/[&<>"']/g, char => entities[char]);

export default route(async (req, res) => {
  method(req, ['GET']);
  const url = new URL(req.url, 'http://localhost');
  const slug = url.searchParams.get('slug') ?? url.pathname.match(/^\/dich-vu\/([a-z0-9-]+)\/?$/)?.[1];
  const { contact, customServices } = await allContent();
  const service = customServices.data.find(item => item.enabled && item.slug === slug);
  const title = service ? escape(service.name) : 'Không tìm thấy dịch vụ';
  const summary = service?.description ? '<p class="service-detail-summary">' + escape(service.description) + '</p>' : '';
  const imageUrl = service?.image && !/^(?:\/|https:\/\/)/.test(service.image) ? '/' + service.image : service?.image;
  const image = imageUrl ? '<img class="solution-image" src="' + escape(imageUrl) + '" alt="' + title + '">' : '';
  const consult = service ? '/?dich-vu=' + encodeURIComponent(service.id) + '#register' : '';
  const actions = service ? '<div class="actions"><a class="btn" href="' + escape(consult) + '">Đăng ký tư vấn</a></div>' : '';
  res.statusCode = service ? 200 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    title + ' | ' + escape(contact.data.brand) + '</title><link rel="stylesheet" href="/fonts/viettel/beausans.css"><link rel="stylesheet" href="/site.css"></head><body class="service-detail">' +
    '<main><a href="/#solutions">← Xem các dịch vụ</a><h1>' + title + '</h1>' +
    summary + image + actions + '</main></body></html>');
});
