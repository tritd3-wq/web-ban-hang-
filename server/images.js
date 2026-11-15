import { put, del } from '@vercel/blob';
import sharp from 'sharp';
import { HttpError } from './http.js';

export const maxImageBytes = 3 * 1024 * 1024;

async function makeWebp(input, widths) {
  const valid = Buffer.isBuffer(input) || (typeof input === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(input));
  if (!valid) throw new HttpError(400, 'Ảnh không hợp lệ.');
  const file = Buffer.isBuffer(input) ? input : Buffer.from(input, 'base64');
  if (file.length > maxImageBytes) throw new HttpError(413, 'Ảnh tối đa 3 MiB.');
  const image = sharp(file, { limitInputPixels: 24_000_000 });
  try {
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error();
    return await Promise.all(widths.map(width =>
      image.clone().rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
    ));
  } catch {
    throw new HttpError(400, 'Chọn ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 24 megapixel.');
  }
}

export async function uploadImages(input, banner) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, 'Chưa cấu hình Vercel Blob.');
  const paths = banner ? ['banners/desktop.webp', 'banners/mobile.webp'] : ['images/website.webp'];
  const images = await makeWebp(input, banner ? [1600, 768] : [1600]);
  const signal = AbortSignal.timeout(12_000);
  const options = {
    access: 'public', addRandomSuffix: true, contentType: 'image/webp',
    abortSignal: signal
  };
  const results = await Promise.allSettled(paths.map((path, index) => put(path, images[index], options)));
  const urls = results.filter(result => result.status === 'fulfilled').map(result => result.value.url);
  if (urls.length !== paths.length) {
    if (urls.length) await del(urls, { abortSignal: AbortSignal.timeout(3000) }).catch(() => {});
    if (signal.aborted) throw new HttpError(504, 'Vercel Blob phản hồi quá lâu. Vui lòng thử tải lại.');
    const failure = results.find(result => result.status === 'rejected');
    console.error('Blob upload failed', failure.reason?.name);
    throw new HttpError(502, 'Không lưu được ảnh lên Vercel Blob. Vui lòng thử lại.');
  }
  return banner ? { desktop: urls[0], mobile: urls[1] } : { url: urls[0] };
}
