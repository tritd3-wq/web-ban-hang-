import { createHash } from 'node:crypto';
import { db } from './db.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function route(handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await handler(req, res);
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(error.name, error.code || 'server_error');
      return json(res, error instanceof HttpError ? error.status : 500, {
        error: error instanceof HttpError ? error.message : 'Hệ thống đang bận. Vui lòng thử lại.'
      });
    }
  };
}

export function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

export function method(req, allowed) {
  if (!allowed.includes(req.method)) throw new HttpError(405, 'Phương thức không hỗ trợ.');
}

export function sameOrigin(req) {
  const deployed = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development';
  const protocol = deployed || req.socket.encrypted ? 'https:' : 'http:';
  if (!req.headers.host || req.headers.origin !== protocol + '//' + req.headers.host) {
    throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ.');
  }
}

async function readBytes(req, max) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new HttpError(413, 'Dữ liệu vượt dung lượng cho phép.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function binaryBody(req, max) {
  if (Number(req.headers['content-length']) > max) throw new HttpError(413, 'Ảnh tối đa 3 MiB.');
  const data = req.body ?? await readBytes(req, max);
  if (!Buffer.isBuffer(data)) throw new HttpError(400, 'Dữ liệu ảnh không hợp lệ.');
  if (data.length > max) throw new HttpError(413, 'Ảnh tối đa 3 MiB.');
  return data;
}

export async function body(req, max = 256_000) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'Định dạng yêu cầu không hỗ trợ.');
  }
  let data;
  try { data = req.body; } catch { throw new HttpError(400, 'JSON không hợp lệ.'); }
  if (data === undefined) {
    data = (await readBytes(req, max)).toString('utf8');
  }
  if (Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data ?? null)) > max) {
    throw new HttpError(413, 'Dữ liệu vượt dung lượng cho phép.');
  }
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { throw new HttpError(400, 'JSON không hợp lệ.'); }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Dữ liệu không hợp lệ.');
  return data;
}

export const hash = value => createHash('sha256').update(value).digest('hex');
export const clientIp = req => process.env.VERCEL
  ? String(req.headers['x-vercel-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  : req.socket.remoteAddress || 'unknown';

export async function limit(key, maximum, seconds) {
  const rateKey = key.split(':', 1)[0] + ':' + hash(key);
  const [row] = await db()`INSERT INTO rate_limits (rate_key, window_start, count)
    VALUES (${rateKey}, now(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start <= now() - (${seconds}::int * interval '1 second')
        THEN 1 ELSE LEAST(rate_limits.count + 1, ${maximum + 1}::int) END,
      window_start = CASE WHEN rate_limits.window_start <= now() - (${seconds}::int * interval '1 second')
        THEN now() ELSE rate_limits.window_start END RETURNING count`;
  if (row.count > maximum) throw new HttpError(429, 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.');
}
