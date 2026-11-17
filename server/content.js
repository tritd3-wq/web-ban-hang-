import defaults from '../site-defaults.js';
import { adminFields, emailValid, pageVisibilityDefaults, phoneValid, planGroups } from '../site-model.js';
import { db } from './db.js';
import { HttpError } from './http.js';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && /^[a-z0-9-]{1,72}$/.test(value);
const bad = field => { throw new HttpError(400, 'Kiểm tra lại trường ' + field + '.'); };
const text = (value, field, max = 4000) => typeof value === 'string' && value.length <= max ? value.trim() : bad(field);
function link(value, field) {
  const s = text(value, field, 2048);
  if (!s || /^#[a-zA-Z0-9_-]+$/.test(s) || /^(?:\/?[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(s) ||
      /^\/[a-zA-Z0-9_][a-zA-Z0-9_./-]*$/.test(s)) return s;
  if (/^https:\/\//.test(s)) {
    try { const url = new URL(s); if (url.hostname && !url.username && !url.password) return s; } catch {}
  }
  return bad(field);
}
function number(value, field, max) {
  if (value === null || value === '') return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > max) return bad(field);
  return value;
}

const required = {
  contact: ['brand', 'person', 'hotline', 'email', 'address', 'logo', 'portrait', 'qr'],
  home: ['pageTitle', 'heroTitle', 'heroCta', 'heroCtaLink', 'registerCta', 'registerCtaLink', 'formTitle', 'formButton', 'formConsent'],
  menu: ['label', 'href'], banners: ['alt', 'desktop', 'mobile'],
  services: ['name', 'label', 'title', 'image', 'alt', 'discoverTitle', 'videoName'],
  plans: ['name', 'vat'], faq: ['question', 'answer'], interests: ['name']
};
const urlFields = new Set(['href', 'logo', 'portrait', 'qr', 'desktop', 'mobile', 'image', 'videoUrl', 'priceSource', 'heroCtaLink', 'registerCtaLink']);
const numericFields = new Set(['price', 'old', 'discount', 'quantity', 'domestic', 'international']);

export function editableVideos(entry) {
  return {
    ...entry,
    data: entry.data.map(({ youtube, videoUrl, ...item }) => ({
      ...item, videoSource: youtube ? 'https://youtu.be/' + youtube : videoUrl
    }))
  };
}

function parseVideoSource(value) {
  const field = 'Link video';
  const source = link(value, field);
  if (!source) return { youtube: '', videoUrl: '' };

  const videoId = /^[\w-]{11}$/;
  if (videoId.test(source)) return { youtube: source, videoUrl: '' };
  if (!source.startsWith('https://')) {
    if (/\.mp4$/i.test(source)) return { youtube: '', videoUrl: source };
    return bad(field);
  }

  const url = new URL(source);
  const host = url.hostname;
  let id;
  if (host === 'youtu.be') {
    id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1];
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)\/?$/)?.[1];
  } else {
    return { youtube: '', videoUrl: source };
  }

  if (!videoId.test(id || '')) return bad(field);
  return { youtube: id, videoUrl: '' };
}

export async function prepareAdminEdit(section, id, data) {
  if (section === 'pageVisibility') {
    const keys = Object.keys(pageVisibilityDefaults);
    if (!object(data) || !keys.every(key => typeof data[key] === 'boolean')) return bad('hiển thị trang khách');
    return { storage: section, clean: Object.fromEntries(keys.map(key => [key, data[key]])) };
  }
  if (section === 'pageBlocks' || section === 'videos') {
    if (!Array.isArray(data) || data.length > 100) return bad('danh sách');
    const ids = new Set();
    const items = data.map(item => {
      if (!object(item) || !validId(item.id) || typeof item.enabled !== 'boolean' || ids.has(item.id)) return bad('mục nội dung');
      ids.add(item.id);
      const base = { id: item.id, enabled: item.enabled };
      if (section === 'pageBlocks') {
        const title = text(item.title, 'tiêu đề', 160);
        const description = text(item.description, 'nội dung');
        const image = link(item.image, 'ảnh');
        if (!title || !description) return bad('tiêu đề hoặc nội dung');
        return { ...base, title, description, image };
      }
      const service = text(item.service, 'dịch vụ', 72);
      const discoverTitle = text(item.discoverTitle, 'tiêu đề trong danh sách video', 160);
      const videoName = text(item.videoName, 'tên video', 160);
      const videoDescription = text(item.videoDescription, 'mô tả video');
      const source = parseVideoSource(item.videoSource);
      if ((service && !Object.hasOwn(planGroups, service)) || !discoverTitle || !videoName || !(source.youtube || source.videoUrl)) {
        return bad('dịch vụ, tên hoặc link video');
      }
      return { ...base, service, discoverTitle, videoName, videoDescription, ...source };
    });
    return { storage: section, clean: items };
  }
  if (['banners', 'plans', 'faq'].includes(section)) {
    return { storage: section, clean: validateSection(section, data) };
  }
  if (!Object.hasOwn(adminFields, section)) throw new HttpError(400, 'Mục quản trị không hợp lệ.');
  const fields = adminFields[section];
  if (!object(data) || Object.keys(data).length !== fields.length || !fields.every(key => Object.hasOwn(data, key))) {
    return bad('dữ liệu cần sửa');
  }

  const storage = section === 'contact' ? 'contact' : 'services';
  const [row] = await db()`SELECT data FROM site_content WHERE section = ${storage}`;
  if (!row) throw new Error('Run npm run db:init');
  if (storage === 'contact') return { storage, clean: validateSection(storage, { ...row.data, ...data }) };

  if (!row.data.some(item => item.id === id)) throw new HttpError(404, 'Không tìm thấy dịch vụ.');
  let changes = data;
  if (section === 'video') {
    const [managed] = await db()`SELECT 1 FROM site_content WHERE section = 'videos'`;
    if (managed) throw new HttpError(409, 'Danh sách video đã được cập nhật. Vui lòng tải lại trang.');
    const { videoSource, ...details } = data;
    changes = { ...details, ...parseVideoSource(videoSource) };
  }
  const updated = row.data.map(item => item.id === id ? { ...item, ...changes } : item);
  return { storage, clean: validateSection(storage, updated) };
}

export function validateSection(section, data) {
  if (!Object.hasOwn(defaults, section)) throw new HttpError(400, 'Mục quản trị không hợp lệ.');
  const sample = defaults[section];
  function validate(record, template) {
    if (!object(record)) return bad(section);
    const result = {};
    for (const key of Object.keys(template)) {
      const value = record[key];
      if (key === 'enabled') {
        if (typeof value !== 'boolean') return bad(key);
        result[key] = value;
      } else if (key === 'id') {
        if (!validId(value)) return bad(key);
        result[key] = value;
      } else if (numericFields.has(key)) {
        result[key] = number(value, key, key === 'discount' ? 100 : 10_000_000_000);
      } else {
        result[key] = urlFields.has(key) ? link(value, key) : text(value, key);
      }
    }
    if (required[section].some(key => !result[key])) throw new HttpError(400, 'Vui lòng điền các trường bắt buộc.');
    if (section === 'plans') {
      if (!Object.hasOwn(planGroups, result.service) || !Object.hasOwn(planGroups[result.service], result.group) || result.price === null) return bad('nhóm gói / giá');
      if (result.service === 'ftth' && (result.domestic === null || result.international === null)) return bad('tốc độ FTTH');
    }
    if (section === 'interests' && Object.hasOwn(planGroups, result.id)) return bad('mã lựa chọn tư vấn');
    if (section === 'services' && (!Object.hasOwn(planGroups, result.id) ||
        (result.youtube && (!/^[\w-]{11}$/.test(result.youtube) || result.videoUrl)))) return bad('mã dịch vụ / video');
    return result;
  }

  if (Array.isArray(sample)) {
    if (!Array.isArray(data) || data.length > (section === 'plans' ? 700 : 100)) return bad(section);
    const items = data.map(record => validate(record, sample[0]));
    if (new Set(items.map(item => item.id)).size !== items.length) return bad('mã trùng');
    if (section === 'services' && items.length !== sample.length) return bad('danh sách dịch vụ');
    return items;
  }
  const result = validate(data, sample);
  if (section === 'contact' && (!emailValid(result.email) || !phoneValid(result.hotline))) return bad('email / hotline');
  return result;
}
