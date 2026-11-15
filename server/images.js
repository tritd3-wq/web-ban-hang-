import { put, del } from '@vercel/blob';
import sharp from 'sharp';
import { HttpError } from './http.js';

export async function makeWebp(input) {
  const valid = typeof input === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(input);
  if (!valid) throw new HttpError(400, 'Ảnh không hợp lệ.');
  const file = Buffer.from(input, 'base64');
  if (file.length > 3 * 1024 * 1024) throw new HttpError(413, 'Ảnh tối đa 3 MiB.');
  const image = sharp(file, { limitInputPixels: 24_000_000 });
  try {
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error();
    return await Promise.all([1600, 768].map(width =>
      image.clone().rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
    ));
  } catch {
    throw new HttpError(400, 'Chọn ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 24 megapixel.');
  }
}

export async function uploadImages(input, banner) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, 'Chưa cấu hình Vercel Blob.');
  const [desktop, mobile] = await makeWebp(input);
  const options = {
    access: 'public', addRandomSuffix: true, contentType: 'image/webp',
    abortSignal: AbortSignal.timeout(12_000)
  };
  const main = await put(banner ? 'banners/desktop.webp' : 'images/website.webp', desktop, options);
  if (!banner) return { url: main.url };
  try {
    const small = await put('banners/mobile.webp', mobile, options);
    return { desktop: main.url, mobile: small.url };
  } catch (error) {
    await del(main.url).catch(() => {});
    throw error;
  }
}
