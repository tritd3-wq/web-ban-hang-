export const el = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};
export const byId = id => document.getElementById(id);
export const lines = value => value.split('\n').map(s => s.trim()).filter(Boolean);
export const cash = value => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
export const digits = value => value.replace(/[^+\d]/g, '');
export const normalize = value => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

let activeDialog;
export function openDialog(dialog) {
  if (activeDialog === dialog && dialog.open) return;
  if (activeDialog?.open) activeDialog.close();
  activeDialog = dialog;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  if (dialog.id !== 'success') dialog.append(byId('floatingCall'));
  else document.body.append(byId('floatingCall'));
  dialog.addEventListener('close', () => {
    if (activeDialog !== dialog || dialog.open) return;
    activeDialog = null;
    document.body.style.overflow = '';
    document.body.append(byId('floatingCall'));
  }, { once: true });
}

export async function request(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Không thể kết nối. Vui lòng thử lại.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function sendJson(url, data, method = 'POST') {
  return request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
