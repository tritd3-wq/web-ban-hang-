import { byId, cash, el, request, sendJson } from './ui.js';
import { adminFields, emailStatuses, leadStatuses, planGroups } from './site-model.js';

const nav = byId('adminNav');
const host = byId('editor');
const status = byId('adminStatus');
const sections = {
  contact: 'Liên hệ', banners: 'Ảnh & poster', plans: 'Gói cước',
  leads: 'Yêu cầu tư vấn', faq: 'FAQ', video: 'Video'
};
const labels = {
  person: 'Tên chuyên viên', hotline: 'Hotline', email: 'Email liên hệ', address: 'Địa chỉ',
  portrait: 'Ảnh đại diện', qr: 'Ảnh QR TAMMI', name: 'Tên gói', alt: 'Mô tả ảnh',
  desktop: 'Ảnh máy tính', mobile: 'Ảnh điện thoại', description: 'Mô tả', image: 'Ảnh dịch vụ',
  discoverTitle: 'Tiêu đề trong danh sách video', videoName: 'Tên video', videoDescription: 'Mô tả video',
  videoSource: 'Link video',
  group: 'Nhóm gói', price: 'Giá (VNĐ)', old: 'Giá gốc (VNĐ)', discount: 'Mức giảm (%)', term: 'Thời hạn / bảo hành',
  vat: 'Ghi chú VAT', quantity: 'Số lượng', details: 'Chi tiết (mỗi ý một dòng)', domestic: 'Trong nước tối đa (Mbps)',
  international: 'Quốc tế tối thiểu (Mbps)', option: 'Loại IP / số Mesh Wi-Fi', question: 'Câu hỏi', answer: 'Câu trả lời'
};
const numberKeys = new Set(['price', 'old', 'discount', 'quantity', 'domestic', 'international']);
const longKeys = new Set(['description', 'videoDescription', 'details', 'answer']);
const imageKeys = new Set(['portrait', 'qr', 'image']);
const required = new Set(['person', 'hotline', 'email', 'address', 'portrait', 'qr', 'name',
  'alt', 'desktop', 'mobile', 'image', 'discoverTitle', 'videoName', 'price', 'vat', 'question', 'answer']);
let content, section, draft, selected, pending = false, dirty = false, listPage = 1, planService = 'tendoo', planQuery = '';
let imageMode = 'banners', imageService = 'tendoo', videoService = 'tendoo';
let renderSequence = 0;

function report(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}
function fail(error) {
  if (error.status === 401) location.replace('/admin');
  else report(error.message, true);
}
function button(text, action, secondary = false) {
  const btn = el('button', secondary ? 'secondary' : '', text);
  btn.type = 'button';
  btn.onclick = action;
  return btn;
}
function markDirty() {
  dirty = true;
  report('Có thay đổi chưa xuất bản.');
}
function guard() {
  return !pending && (!dirty || confirm('Rời mục này và bỏ các thay đổi chưa xuất bản?'));
}
window.addEventListener('beforeunload', event => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});
byId('logout').onclick = async () => {
  if (!guard()) return;
  try { await sendJson('/api/admin?action=logout', {}); dirty = false; location.replace('/admin'); }
  catch (error) { fail(error); }
};

function selectSection(next) {
  if (next === section || !guard()) return;
  section = next;
  draft = content[next] ? structuredClone(content[next].data) : null;
  selected = null;
  dirty = false;
  listPage = 1;
  report('');
  byId('sectionTitle').textContent = sections[next];
  for (const item of nav.children) {
    if (item.dataset.section === next) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  render();
}

function inputFor(key, record) {
  const label = el('label', longKeys.has(key) ? 'wide' : '', labels[key] || key);
  let input;
  if (key === 'group') {
    input = el('select');
    for (const [id, text] of Object.entries(planGroups[record.service])) input.add(new Option(text, id));
  } else {
    input = el(longKeys.has(key) ? 'textarea' : 'input');
    if (input.tagName === 'INPUT') input.type = numberKeys.has(key) ? 'number' : key === 'email' ? 'email' : key === 'hotline' ? 'tel' : 'text';
    if (numberKeys.has(key)) {
      input.min = '0';
      input.max = key === 'discount' ? '100' : '10000000000';
      input.step = '1';
    } else input.maxLength = 4000;
  }
  input.name = key;
  input.value = record[key] ?? '';
  input.required = required.has(key) || record.service === 'ftth' && (key === 'domestic' || key === 'international');
  label.append(input);
  return label;
}

const maxOriginalImageBytes = 10_000_000;
const maxUploadImageBytes = 3 * 1024 * 1024;

async function compressUpload(file) {
  if (file.size <= 256 * 1024 || typeof createImageBitmap !== 'function') return file;
  let image;
  try {
    image = await createImageBitmap(file);
    if (image.width * image.height > 24_000_000) return file;
    const scale = Math.min(1, 1600 / image.width, 2400 / image.height);
    const canvas = el('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    let webp = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.92));
    if (webp?.type === 'image/webp' && webp.size > maxUploadImageBytes) {
      webp = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));
    }
    if (webp?.type === 'image/webp' && webp.size < file.size) return webp;
  } catch {
    // The server can still validate and process the original file.
  } finally {
    image?.close();
  }
  return file;
}

function uploadControl(keys, form) {
  const area = el('div', 'wide');
  const line = el('div', 'upload-box');
  const file = el('input');
  file.type = 'file';
  file.accept = 'image/jpeg,image/png,image/webp';
  file.setAttribute('aria-label', keys.length === 2 ? 'Chọn ảnh poster' : 'Chọn ảnh ' + labels[keys[0]]);
  file.onchange = () => {
    file.setCustomValidity(file.files.length ? 'Bấm Tải ảnh lên trước khi lưu và xuất bản.' : '');
  };
  const img = el('img');
  img.alt = 'Xem trước ảnh ' + labels[keys[0]];
  const refresh = () => {
    const value = form.elements.namedItem(keys[0]).value;
    img.hidden = !value;
    if (value) img.src = value;
    else img.removeAttribute('src');
  };
  const upload = button('Tải ảnh lên', async () => {
    if (pending) return;
    const chosen = file.files[0];
    if (!chosen || chosen.size > maxOriginalImageBytes) return report('Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB.', true);
    pending = upload.disabled = file.disabled = true;
    report('Đang chuẩn bị ảnh…');
    const controller = new AbortController();
    let timeout;
    try {
      const image = await compressUpload(chosen);
      if (image.size > maxUploadImageBytes) {
        throw new Error('Trình duyệt chưa nén được ảnh này đủ nhỏ để tải lên. Hãy thử giảm kích thước ảnh hoặc đổi sang JPG.');
      }
      report('Đang tải ảnh lên…');
      timeout = setTimeout(() => controller.abort(), 35_000);
      const data = await request('/api/admin?action=upload&banner=' + (keys.length === 2 ? '1' : '0'), {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: image, signal: controller.signal
      });
      const urls = keys.length === 2 ? [data.desktop, data.mobile] : [data.url];
      if (urls.some(url => typeof url !== 'string' || !url.startsWith('https://'))) {
        throw new Error('Máy chủ chưa trả về link ảnh. Vui lòng thử tải lại.');
      }
      for (const [index, key] of keys.entries()) form.elements.namedItem(key).value = urls[index];
      file.value = '';
      file.setCustomValidity('');
      refresh();
      markDirty();
      report('Đã tải ảnh. Bấm lưu để xuất bản.');
    } catch (error) {
      if (controller.signal.aborted) report('Tải ảnh quá lâu. Vui lòng thử lại.', true);
      else fail(error);
    } finally {
      clearTimeout(timeout);
      pending = upload.disabled = file.disabled = false;
    }
  }, true);
  form.elements.namedItem(keys[0]).addEventListener('change', refresh);
  line.append(file, upload, img);
  area.append(line);
  area.append(el('p', 'upload-note', keys.length === 2
    ? 'Tối đa 10 MB. Poster được chuyển thành WebP cho hai kích thước màn hình.'
    : 'JPG, PNG hoặc WebP, tối đa 10 MB.'));
  refresh();
  return area;
}

function fieldsFor(record, form) {
  const grid = el('div', 'fields');
  form.append(grid);
  for (const key of Object.keys(labels)) {
    if (!Object.hasOwn(record, key)) continue;
    if (['domestic', 'international', 'option'].includes(key) && record.service !== 'ftth') continue;
    grid.append(inputFor(key, record));
    if (imageKeys.has(key)) grid.append(uploadControl([key], form));
  }
  if (Object.hasOwn(record, 'mobile')) grid.append(uploadControl(['desktop', 'mobile'], form));
  return form;
}

function valuesFrom(record, form) {
  const next = { ...record };
  for (const [key, value] of new FormData(form)) {
    next[key] = numberKeys.has(key) ? value === '' ? null : Number(value) : value.trim();
  }
  return next;
}

async function save(data, control, action = section, id) {
  if (pending) return;
  const storage = id ? 'services' : action;
  pending = control.disabled = true;
  report('Đang lưu…');
  try {
    const saved = await sendJson('/api/admin', { section: action, id, data, revision: content[storage].revision }, 'PUT');
    content[storage] = saved;
    if (storage === section) draft = structuredClone(saved.data);
    selected = null;
    dirty = false;
    render();
    report('Đã lưu và xuất bản.');
  } catch (error) { fail(error); }
  finally { pending = control.disabled = false; }
}

function newRecord() {
  const keys = Object.keys(content[section].data[0] || ({
    banners: { desktop: '', mobile: '', alt: '' },
    plans: { service: '', group: '', name: '', description: '', details: '', term: '', price: null, vat: '', old: null, discount: null,
      quantity: null, domestic: null, international: null, option: '' },
    faq: { question: '', answer: '' }
  })[section]);
  const record = { id: crypto.randomUUID(), enabled: true };
  for (const key of keys.filter(key => !['id', 'enabled'].includes(key))) record[key] = numberKeys.has(key) ? null : '';
  if (section === 'plans') {
    record.service = planService;
    record.group = Object.keys(planGroups[planService])[0];
    record.vat = planService === 'vbhxh' ? 'Không chịu VAT' : 'Đã bao gồm VAT';
  }
  return record;
}

function listEditor(panel) {
  const toolbar = el('div', 'toolbar');
  const list = el('div');
  if (section === 'plans') {
    const field = el('label', '', 'Dịch vụ');
    const select = el('select');
    select.id = 'planService';
    for (const service of content.services.data) select.add(new Option(service.name, service.id));
    select.value = planService;
    select.onchange = () => {
      if (pending || selected) { select.value = planService; return; }
      planService = select.value;
      planQuery = '';
      render();
    };
    field.append(select);
    const search = el('label', '', 'Tìm gói');
    const input = el('input');
    input.type = 'search';
    input.value = planQuery;
    input.oninput = () => { planQuery = input.value; fillList(); };
    search.append(input);
    toolbar.append(field, search);
  }
  toolbar.append(button('Thêm mới', () => {
    if (pending || selected) return;
    if (section === 'plans') planQuery = '';
    selected = newRecord();
    render();
    host.querySelector('.item-editor input')?.focus();
  }));
  panel.append(toolbar);
  if (selected) {
    const form = el('form', 'item-editor panel');
    form.append(el('h2', '', draft.some(item => item.id === selected.id) ? 'Sửa mục' : 'Thêm mục'));
    fieldsFor(selected, form);
    const controls = el('div', 'row-actions savebar');
    const apply = el('button', '', 'Lưu và xuất bản');
    apply.type = 'submit';
    const wasDirty = dirty;
    form.addEventListener('input', () => { dirty = true; });
    controls.append(apply, button('Hủy sửa', () => {
      if (pending) return;
      selected = null;
      dirty = wasDirty;
      report(dirty ? 'Có thay đổi chưa xuất bản.' : '');
      render();
    }, true));
    form.append(controls);
    form.onsubmit = event => {
      event.preventDefault();
      const record = valuesFrom(selected, form);
      const items = draft.some(item => item.id === record.id)
        ? draft.map(item => item.id === record.id ? record : item)
        : [...draft, record];
      save(items, apply);
    };
    panel.append(form);
  }
  panel.append(list);
  const canEdit = () => !pending && !selected;
  function fillList() {
    list.replaceChildren();
    const items = draft.filter(item => section !== 'plans' || item.service === planService);
    const displayed = items.filter(item => !planQuery || section !== 'plans' || item.name.toLocaleLowerCase('vi').includes(planQuery.toLocaleLowerCase('vi').trim()));
    if (!displayed.length) list.append(el('p', '', 'Không có mục phù hợp.'));
    for (const item of displayed) {
      const siblings = section === 'plans' ? items.filter(other => other.group === item.group) : items;
      const index = siblings.indexOf(item);
      const row = el('div', 'item-row');
      const info = el('div');
      const name = item.name || item.alt || item.question;
      info.append(el('strong', '', name));
      if (section === 'plans') info.append(el('small', '', cash(item.price) + ' · ' + planGroups[item.service][item.group]));
      const controls = el('div', 'row-actions');
      const toggle = el('label', 'checkbox', 'Hiển thị');
      const check = el('input');
      check.type = 'checkbox';
      check.checked = item.enabled;
      check.disabled = Boolean(selected);
      check.setAttribute('aria-label', 'Hiển thị ' + name);
      check.onchange = () => {
        if (!canEdit()) { check.checked = item.enabled; return; }
        item.enabled = check.checked;
        markDirty();
      };
      toggle.prepend(check);
      const edit = button('Sửa', () => {
        if (!canEdit()) return;
        selected = item;
        render();
        host.querySelector('.item-editor input')?.focus();
      }, true);
      edit.disabled = Boolean(selected);
      const moves = [-1, 1].map(direction => {
        const move = button(direction === -1 ? '↑' : '↓', () => {
          if (!canEdit()) return;
          const first = draft.indexOf(item), second = draft.indexOf(siblings[index + direction]);
          [draft[first], draft[second]] = [draft[second], draft[first]];
          fillList();
          markDirty();
        }, true);
        move.disabled = Boolean(selected) || !siblings[index + direction];
        move.setAttribute('aria-label', (direction === -1 ? 'Đưa lên ' : 'Đưa xuống ') + name);
        return move;
      });
      controls.append(toggle, edit, ...moves);
      row.append(info, controls);
      list.append(row);
    }
  }
  fillList();
  if (!selected) {
    const savebar = el('div', 'savebar');
    const publish = button('Lưu và xuất bản', () => save(draft, publish));
    savebar.append(publish);
    panel.append(savebar);
  }
}

async function leadEditor(panel, sequence) {
  report('Đang tải yêu cầu…');
  try {
    const { rows, more } = await request('/api/admin?action=leads&page=' + listPage);
    if (sequence !== renderSequence) return;
    report('');
    if (!rows.length) panel.append(el('p', '', 'Chưa có yêu cầu ở trang này.'));
    else {
      const wrap = el('div', 'table-scroll');
      const table = el('table');
      const header = table.createTHead().insertRow();
      for (const label of ['Mã / thời điểm', 'Khách hàng', 'Gói hoặc dịch vụ', 'Email xác nhận', 'Xử lý']) header.append(el('th', '', label));
      const tbody = table.createTBody();
      for (const lead of rows) {
        const row = tbody.insertRow();
        row.insertCell().append(el('code', '', lead.id), el('p', '', new Date(lead.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })));
        row.insertCell().append(el('strong', '', lead.name), el('p', '', lead.email), el('p', '', lead.phone),
          el('p', '', lead.company));
        row.insertCell().append(el('strong', '', lead.plan_name || lead.products.join(', ')), el('p', '', lead.needs));
        row.insertCell().append(el('strong', '', emailStatuses[lead.email_status]), el('p', '', lead.email_id));
        const cell = row.insertCell();
        const dropdown = el('select');
        dropdown.setAttribute('aria-label', 'Trạng thái ' + lead.id);
        for (const [id, text] of Object.entries(leadStatuses)) dropdown.add(new Option(text, id));
        dropdown.value = lead.status;
        dropdown.onchange = async () => {
          dropdown.disabled = true;
          try {
            const saved = await sendJson('/api/admin?action=leads', { id: lead.id, status: dropdown.value }, 'PATCH');
            lead.status = saved.status;
            if (sequence === renderSequence) report('Đã cập nhật trạng thái.');
          } catch (error) {
            dropdown.value = lead.status;
            if (sequence === renderSequence) fail(error);
          } finally { dropdown.disabled = false; }
        };
        cell.append(dropdown);
      }
      wrap.append(table);
      panel.append(wrap);
    }
    const paging = el('div', 'row-actions savebar');
    const back = button('Trang trước', () => { listPage--; render(); }, true);
    const next = button('Trang sau', () => { listPage++; render(); }, true);
    back.disabled = listPage === 1;
    next.disabled = !more;
    paging.append(back, el('span', '', 'Trang ' + listPage), next, button('Làm mới', render, true));
    panel.append(paging);
  } catch (error) { if (sequence === renderSequence) fail(error); }
}

function recordEditor(panel, action, record) {
  const fields = Object.fromEntries(adminFields[action].map(key => [key, record[key]]));
  if (action === 'video') {
    fields.videoSource = record.youtube ? 'https://youtu.be/' + record.youtube : record.videoUrl;
  }
  const form = fieldsFor(fields, el('form'));
  const savebar = el('div', 'savebar');
  const submit = el('button', '', 'Lưu và xuất bản');
  submit.type = 'submit';
  savebar.append(submit);
  form.append(savebar);
  form.oninput = markDirty;
  form.onsubmit = event => {
    event.preventDefault();
    save(valuesFrom(fields, form), submit, action, record.id);
  };
  panel.append(form);
}

function pick(panel, label, choices, value, onChange) {
  const field = el('label', '', label);
  const select = el('select');
  for (const [id, text] of choices) select.add(new Option(text, id));
  select.value = value;
  select.onchange = () => {
    if (!guard()) { select.value = value; return; }
    dirty = false;
    selected = null;
    report('');
    onChange(select.value);
    render();
  };
  field.append(select);
  const toolbar = el('div', 'toolbar');
  toolbar.append(field);
  panel.append(toolbar);
}

function serviceEditor(panel, action, id, onChange) {
  const services = content.services.data;
  pick(panel, 'Dịch vụ', services.map(item => [item.id, item.name]), id, onChange);
  if (action === 'video') {
    panel.append(el('p', 'upload-note', 'Dán link hoặc ID YouTube, hoặc đường dẫn MP4. Để trống để ẩn video.'));
  }
  recordEditor(panel, action, services.find(item => item.id === id));
}

function render() {
  const sequence = ++renderSequence;
  const panel = el('div', 'panel');
  host.replaceChildren(panel);
  if (section === 'leads') return leadEditor(panel, sequence);
  if (section === 'contact') return recordEditor(panel, 'contact', draft);
  if (section === 'video') return serviceEditor(panel, 'video', videoService, value => { videoService = value; });
  if (section === 'banners') {
    pick(panel, 'Loại ảnh', [['banners', 'Poster'], ['services', 'Ảnh minh họa dịch vụ']], imageMode, value => {
      imageMode = value;
      draft = structuredClone(content.banners.data);
    });
    if (imageMode === 'services') return serviceEditor(panel, 'service-image', imageService, value => { imageService = value; });
  }
  listEditor(panel);
}

try {
  content = await request('/api/admin');
  for (const [id, title] of Object.entries(sections)) {
    const tab = button(title, () => selectSection(id));
    tab.dataset.section = id;
    nav.append(tab);
  }
  selectSection('contact');
} catch (error) { fail(error); }
