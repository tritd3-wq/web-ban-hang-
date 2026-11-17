import { requireAdmin, logIn, logOut } from '../server/auth.js';
import { allContent, db, optionalSections } from '../server/db.js';
import { editableVideos, prepareAdminEdit } from '../server/content.js';
import { binaryBody, body, HttpError, json, method, route, sameOrigin } from '../server/http.js';
import { createImageUploadLinks, maxImageBytes, uploadImages } from '../server/images.js';
import { leadStatuses } from '../site-model.js';

export default route(async (req, res) => {
  method(req, ['GET', 'POST', 'PUT', 'PATCH']);
  const query = new URL(req.url, 'http://localhost').searchParams;
  const action = query.get('action');
  if (req.method !== 'GET') sameOrigin(req);

  if (req.method === 'POST' && action === 'login') {
    await logIn(req, res, await body(req, 2048));
    return json(res, 200, { ok: true });
  }
  await requireAdmin(req);
  if (req.method === 'POST' && action === 'logout') {
    await logOut(req, res);
    return json(res, 200, { ok: true });
  }
  if (req.method === 'GET' && !action) {
    const { contact, banners, services, plans, faq, pageVisibility, pageBlocks, videos } = await allContent();
    return json(res, 200, { contact, banners, services, plans, faq, pageVisibility, pageBlocks, videos: editableVideos(videos) });
  }
  if (req.method === 'PUT' && !action) {
    const { section, id, data, revision } = await body(req, 1_000_000);
    if (typeof section !== 'string' || !Number.isSafeInteger(revision) || revision < 0 ||
        (revision === 0 && !optionalSections.includes(section))) throw new HttpError(400, 'Mục lưu không hợp lệ.');
    const { storage, clean } = await prepareAdminEdit(section, id, data);
    const sql = db(), serialized = JSON.stringify(clean);
    const [saved] = revision === 0
      ? await sql`INSERT INTO site_content (section, data) VALUES (${storage}, ${serialized}::jsonb)
          ON CONFLICT (section) DO NOTHING RETURNING section, data, revision`
      : await sql`UPDATE site_content SET data = ${serialized}::jsonb,
          revision = revision + 1 WHERE section = ${storage} AND revision = ${revision} RETURNING section, data, revision`;
    if (!saved) throw new HttpError(409, 'Nội dung đã thay đổi ở phiên khác. Tải lại trước khi lưu.');
    return json(res, 200, storage === 'videos' ? editableVideos(saved) : saved);
  }
  if (req.method === 'POST' && action === 'upload-links') {
    const { banner } = await body(req, 1024);
    return json(res, 200, await createImageUploadLinks(banner === true));
  }
  if (req.method === 'POST' && action === 'upload') {
    if (req.headers['content-type'] === 'application/octet-stream') {
      const image = await binaryBody(req, maxImageBytes);
      return json(res, 201, await uploadImages(image, query.get('banner') === '1'));
    }
    const { image, banner } = await body(req, 4_250_000);
    return json(res, 201, await uploadImages(image, banner === true));
  }
  if (req.method === 'GET' && action === 'leads') {
    const raw = Number(query.get('page') || 1);
    const page = Number.isSafeInteger(raw) && raw >= 1 && raw < 100_000 ? raw : 1;
    const sql = db();
    const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ${(page - 1) * 50}`;
    return json(res, 200, { rows: rows.slice(0, 50), more: rows.length > 50 });
  }
  if (req.method === 'PATCH' && action === 'leads') {
    const { id, status } = await body(req, 2048);
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ||
        typeof status !== 'string' || !Object.hasOwn(leadStatuses, status)) {
      throw new HttpError(400, 'Yêu cầu hoặc trạng thái không hợp lệ.');
    }
    const [saved] = await db()`UPDATE leads SET status = ${status}, status_updated_at = now()
        WHERE id = ${id} RETURNING id, status`;
    if (!saved) throw new HttpError(404, 'Không tìm thấy yêu cầu.');
    return json(res, 200, saved);
  }
  throw new HttpError(404, 'Không tìm thấy chức năng.');
});
