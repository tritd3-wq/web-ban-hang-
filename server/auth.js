import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';
import { clientIp, hash, HttpError, limit } from './http.js';

const derive = promisify(scrypt);
const cookieName = 'viettel_admin';
const sessionSeconds = 8 * 60 * 60;
const token = req => String(req.headers.cookie || '').match(/(?:^|;\s*)viettel_admin=([0-9a-f]{64})(?:;|$)/)?.[1];
const cookie = (value, seconds) =>
  cookieName + '=' + value + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + seconds +
  (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development' ? '; Secure' : '');

export const authConfigured = () => Boolean(process.env.ADMIN_USERNAME &&
  /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(process.env.ADMIN_PASSWORD_HASH || ''));

export async function signedIn(req) {
  const value = token(req);
  if (!value || !authConfigured()) return false;
  const [row] = await db()`SELECT 1 FROM admin_sessions WHERE token_hash = ${hash(value)} AND expires_at > now()`;
  return Boolean(row);
}

export async function requireAdmin(req) {
  if (!await signedIn(req)) throw new HttpError(401, 'Vui lòng đăng nhập quản trị.');
}

export async function logIn(req, res, { username, password }) {
  if (!authConfigured()) throw new HttpError(503, 'Chưa cấu hình tài khoản quản trị.');
  await limit('admin:' + clientIp(req), 8, 900);
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 200) {
    throw new HttpError(401, 'Tài khoản hoặc mật khẩu chưa đúng.');
  }
  const [salt, digest] = process.env.ADMIN_PASSWORD_HASH.split(':');
  const actual = await derive(password, salt, 64);
  if (!timingSafeEqual(actual, Buffer.from(digest, 'hex')) || username !== process.env.ADMIN_USERNAME) {
    throw new HttpError(401, 'Tài khoản hoặc mật khẩu chưa đúng.');
  }
  const value = randomBytes(32).toString('hex');
  const sql = db();
  const previous = token(req);
  await sql.transaction([
    sql`DELETE FROM admin_sessions WHERE expires_at <= now() OR token_hash = ${previous ? hash(previous) : ''}`,
    sql`INSERT INTO admin_sessions (token_hash, expires_at)
        VALUES (${hash(value)}, now() + (${sessionSeconds}::int * interval '1 second'))`,
    sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`
  ]);
  res.setHeader('Set-Cookie', cookie(value, sessionSeconds));
}

export async function logOut(req, res) {
  const value = token(req);
  if (value) await db()`DELETE FROM admin_sessions WHERE token_hash = ${hash(value)}`;
  res.setHeader('Set-Cookie', cookie('', 0));
}
