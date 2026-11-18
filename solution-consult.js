import { byId, cash, digits, el, openDialog, sendJson } from './ui.js';
import { emailValid, phoneValid } from './site-model.js';

export function setupConsult(content) {
  const { contact, home, services, customServices = [], interests } = content;
  const main = byId('form');
  const confirmation = byId('success');
  const popup = el('dialog');
  popup.id = 'solutionConsult';
  popup.setAttribute('aria-labelledby', 'scTitle');
  popup.innerHTML = `<button type="button" class="sc-close" aria-label="Đóng đăng ký tư vấn">×</button><h2 id="scTitle"></h2>
    <div class="sc-layout"><div><form id="scForm"><label>Họ và tên *<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label>
    <label>Số điện thoại (tùy chọn)<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label>
    <label>Email xác nhận *<input name="email" type="email" required maxlength="180" autocomplete="email"></label>
    <label class="sc-consent"><input name="consent" type="checkbox" required><span></span></label>
    <label class="lead-bot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <button type="submit" class="sc-submit">Gửi đăng ký tư vấn</button><p id="scStatus" role="status"></p></form>
    <div class="sc-contact"><span></span><strong></strong><a></a></div></div>
    <aside class="sc-plan"><span class="sc-eyebrow">THÔNG TIN GÓI ĐÃ CHỌN</span><h3 id="scPlan"></h3>
    <div class="sc-detail"><span>Thời gian sử dụng / Bảo hành</span><b id="scTerm"></b></div>
    <div class="sc-detail"><span>Giá gói</span><strong id="scPrice"></strong></div><p id="scVat"></p>
    <p>Chuyên viên sẽ liên hệ xác nhận gói dịch vụ và hướng dẫn triển khai.</p>
    <button type="button" id="scChange">Chọn gói khác</button></aside></div>`;
  document.body.append(popup);
  popup.querySelector('.sc-consent span').textContent = home.formConsent;
  popup.querySelector('.sc-contact span').textContent = contact.brand;
  popup.querySelector('.sc-contact strong').textContent = contact.person;
  const call = popup.querySelector('.sc-contact a');
  call.href = 'tel:' + digits(contact.hotline);
  call.textContent = contact.hotline;
  const change = byId('scChange');
  popup.querySelector('.sc-close').onclick = () => popup.close();
  let selection;

  const requested = new URLSearchParams(location.search).get('dich-vu');
  for (const item of [...services, ...customServices, ...interests]) {
    const label = el('label', 'check');
    const input = el('input');
    input.type = 'checkbox';
    input.name = 'products';
    input.value = item.id;
    input.checked = item.id === requested;
    label.append(input, el('span', '', item.name));
    byId('choices').append(label);
  }

  function bind(form, status, currentSelection) {
    let id;
    form.addEventListener('input', () => { id = undefined; });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('[type=submit]');
      if (submit.disabled) return;
      const values = new FormData(form);
      const current = currentSelection();
      const phone = String(values.get('phone') || '').trim();
      const email = String(values.get('email') || '').trim();
      const products = current ? [current.service.id] : values.getAll('products');
      if (!emailValid(email) || (phone && !phoneValid(phone)) || !products.length) {
        status.textContent = !products.length ? 'Vui lòng chọn ít nhất một dịch vụ.' : 'Email hoặc số điện thoại chưa hợp lệ.';
        return;
      }
      if (!globalThis.crypto?.randomUUID) {
        status.textContent = 'Vui lòng mở website qua HTTPS hoặc gọi ' + contact.hotline + '.';
        return;
      }
      id ??= crypto.randomUUID();
      const payload = {
        id, name: values.get('name'), phone, email, company: values.get('company') || '',
        needs: values.get('needs') || '', consent: values.get('consent') === 'on',
        website: values.get('website') || '', planId: current?.plan?.id || '', products
      };
      const inputs = [...form.elements].filter(input => !input.disabled);
      inputs.forEach(input => { input.disabled = true; });
      status.textContent = 'Đang gửi yêu cầu…';
      try {
        const result = await sendJson('/api/leads', payload);
        status.textContent = '';
        form.reset();
        id = undefined;
        byId('copyStatus').textContent = '';
        byId('summary').textContent = result.id;
        byId('mailStatus').textContent = result.emailStatus === 'sent'
          ? 'Đã tiếp nhận yêu cầu và gửi email xác nhận.'
          : 'Đã tiếp nhận yêu cầu. Bạn có thể liên hệ ' + contact.hotline + ' khi cần hỗ trợ.';
        openDialog(confirmation);
      } catch (error) {
        status.textContent = error.message;
      } finally {
        inputs.forEach(input => { input.disabled = false; });
      }
    });
    return () => { id = undefined; };
  }
  bind(main, byId('status'), () => null);
  const resetPopupRequest = bind(byId('scForm'), byId('scStatus'), () => selection);
  byId('copyInfo').onclick = async () => {
    try {
      await navigator.clipboard.writeText(byId('summary').textContent);
      byId('copyStatus').textContent = 'Đã sao chép mã yêu cầu.';
    } catch {
      byId('copyStatus').textContent = 'Bạn có thể chọn và sao chép mã phía trên.';
    }
  };

  return (service, plan, back) => {
    if (byId('scForm').querySelector('[type=submit]').disabled) {
      openDialog(popup);
      return;
    }
    if (selection?.plan?.id !== plan?.id || selection?.service.id !== service.id) resetPopupRequest();
    selection = { service, plan };
    byId('scTitle').textContent = (plan ? 'Đăng ký mua gói ' : 'Đăng ký tư vấn ') + service.name;
    popup.querySelector('.sc-submit').textContent = plan ? 'Xác nhận đăng ký mua gói' : 'Gửi đăng ký tư vấn';
    byId('scPlan').textContent = plan?.name || service.name;
    byId('scTerm').textContent = plan?.term || 'Theo gói dịch vụ lựa chọn';
    byId('scPrice').textContent = plan ? cash(plan.price) : 'Liên hệ tư vấn';
    byId('scVat').textContent = plan?.vat || '';
    byId('scStatus').textContent = '';
    change.hidden = !back;
    change.onclick = back || null;
    openDialog(popup);
  };
}
