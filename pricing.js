import { cash, el, lines, normalize, openDialog } from './ui.js';
import { planGroups } from './site-model.js';

const layouts = {
  tendoo: ['tendooPricing', 'td'],
  'viettel-ca': ['caPricing', 'ca-price'],
  vcontract: ['vcontractPricing', 'vc'],
  sinvoice: ['sinvoicePricing', 'si'],
  vbhxh: ['bhxhPricing', 'bh'],
  ftth: ['ftthPricing', 'ftth']
};

function button(text, action, className) {
  const item = el('button', className, text);
  item.type = 'button';
  item.onclick = action;
  return item;
}

function note(parent, service, className) {
  const hint = el('p', className, service.priceNote);
  if (service.priceSource) {
    const link = el('a', '', 'Xem nguồn bảng giá');
    link.href = service.priceSource;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    hint.append(' ', link);
  }
  parent.append(hint);
}

function setupFilters(body, prefix, groups, render) {
  const wrapper = el('div', prefix + '-filters');
  const query = el('input');
  query.type = 'search';
  query.placeholder = 'Tìm gói dịch vụ…';
  query.setAttribute('aria-label', 'Tìm gói dịch vụ');
  const filter = el('select');
  filter.setAttribute('aria-label', 'Loại gói dịch vụ');
  filter.add(new Option(prefix === 'bh' ? 'Gói V-BHXH đơn lẻ' : 'Tất cả gói dịch vụ', prefix === 'bh' ? 'single' : 'all'));
  for (const [id, label] of Object.entries(groups)) filter.add(new Option(label, id));
  if (prefix === 'bh') filter.add(new Option('Tất cả gói dịch vụ', 'all'));
  const update = () => render(normalize(query.value.trim()), filter.value);
  query.oninput = update;
  filter.onchange = update;
  wrapper.append(query, filter);
  body.append(wrapper);
  return update;
}

function renderCards(body, prefix, service, plans, buy) {
  const groups = planGroups[service.id];
  const count = el('p', prefix + '-count');
  count.setAttribute('role', 'status');
  const grid = el('div', prefix + '-grid');
  const update = prefix === 'ca-price' ? null : setupFilters(body, prefix, groups, (query, group) => {
    let visible = 0;
    for (const card of grid.children) {
      const matchesGroup = group === 'all' || card.dataset.group === group || (prefix === 'bh' && group === 'single' && card.dataset.group !== 'combo');
      card.hidden = !matchesGroup || !normalize(card.textContent).includes(query);
      if (!card.hidden) visible++;
    }
    count.textContent = visible ? visible + ' gói dịch vụ' : 'Không tìm thấy gói dịch vụ phù hợp.';
  });
  if (prefix === 'ca-price') body.append(el('h2', '', 'BẢNG GIÁ / CHÍNH SÁCH'), el('div', 'ca-price-category', 'TỔ CHỨC · USB TOKEN'));
  else body.append(count);
  body.append(grid);
  for (const [index, plan] of plans.entries()) {
    const featured = prefix !== 'ca-price' && ((!index && prefix !== 'vc') || plan.group === 'trial' && prefix === 'vc');
    const card = el('article', prefix + '-pack' + (featured ? ' ' + prefix + '-featured' : ''));
    card.dataset.group = plan.group;
    const amount = el('p', prefix + '-amount', cash(plan.price));
    amount.append(el('small', 'pricing-vat-note', '(' + plan.vat + ')'));
    card.append(el('h3', '', plan.name), amount);
    if (plan.old !== null) {
      const old = el('p', prefix + '-old');
      old.append(el('del', '', cash(plan.old)));
      if (plan.discount !== null) old.append(' ', el('span', '', '−' + plan.discount + '%'));
      card.append(old);
    }
    if (prefix === 'ca-price') {
      card.append(el('p', 'ca-price-description', plan.description));
      const list = el('ul');
      for (const line of lines(plan.details)) list.append(el('li', '', line));
      card.append(list);
    } else {
      const details = el('div', prefix + '-description');
      if (plan.description) details.append(el('p', '', plan.description));
      if (plan.quantity !== null) {
        const unit = prefix === 'vc' ? ' hợp đồng' : prefix === 'si' ? ' hóa đơn' : ' lao động';
        details.append(el('p', '', 'Số lượng: ' + plan.quantity.toLocaleString('vi-VN') + unit));
      }
      if (plan.term) details.append(el('p', '', 'Thời gian sử dụng: ' + plan.term));
      for (const line of lines(plan.details)) details.append(el('p', '', line));
      card.append(details);
    }
    card.append(button('Mua ngay', () => buy(plan), prefix + '-register'));
    grid.append(card);
  }
  if (!update && !plans.length) body.append(el('p', '', 'Chưa có gói cước hiển thị.'));
  update?.();
  note(body, service, prefix === 'ca-price' ? 'ca-price-caption' : prefix + '-source');
}

function renderTendoo(body, service, plans, buy) {
  body.append(el('h2', '', service.videoName + ' – Quản lý bán hàng thông minh'));
  const tabs = el('div', 'td-tabs');
  const layout = el('div', 'td-layout');
  const filters = el('aside');
  filters.append(el('h3', '', 'Bộ lọc'));
  const panel = el('div');
  const count = el('p');
  count.id = 'tdCount';
  count.setAttribute('role', 'status');
  const grid = el('div');
  grid.id = 'tdGrid';
  panel.append(count, grid);
  layout.append(filters, panel);
  body.append(tabs, layout);
  function field(label, tag) {
    const wrapper = el('label', '', label);
    const input = el(tag);
    wrapper.append(input);
    filters.append(wrapper);
    return input;
  }
  const query = field('Tìm kiếm từ khóa', 'input');
  query.type = 'search';
  const range = field('Khoảng giá', 'select');
  for (const value of [null, 0, 1_000_000, 3_000_000, 50_000_000]) {
    range.add(new Option(value === null ? 'Tất cả mức giá' : value ? 'Đến ' + cash(value) : 'Miễn phí', value ?? 'all'));
  }
  const term = field('Thời gian sử dụng', 'select');
  let group = 'packages';
  function render() {
    const visible = plans.filter(plan => plan.group === group && normalize(plan.name).includes(normalize(query.value.trim())) &&
      (range.value === 'all' || plan.price <= Number(range.value)) && (term.value === 'all' || plan.term === term.value));
    count.textContent = 'Đã lọc được ' + visible.length + ' kết quả';
    grid.replaceChildren();
    for (const plan of visible) {
      const card = el('article', 'td-price-card');
      const duration = el('p', 'td-duration');
      duration.append(el('span', '', 'Thời gian sử dụng'), el('b', '', plan.term || 'Liên hệ'));
      const total = el('div', 'td-total');
      const price = el('div');
      price.append(el('b', '', 'Tổng tiền:'), el('strong', '', cash(plan.price)));
      total.append(price, el('small', '', '(' + plan.vat + ')'));
      card.append(el('h3', '', plan.name), duration, total);
      for (const detail of [plan.description, ...lines(plan.details)].filter(Boolean)) card.append(el('p', '', detail));
      card.append(button('Mua ngay', () => buy(plan)));
      grid.append(card);
    }
  }
  function choose(value) {
    group = value;
    for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab.dataset.group === value));
    term.replaceChildren(new Option('Tất cả thời hạn', 'all'));
    for (const time of new Set(plans.filter(plan => plan.group === group).map(plan => plan.term).filter(Boolean))) term.add(new Option(time));
    render();
  }
  for (const [id, label] of Object.entries(planGroups.tendoo)) {
    const tab = button(label.toLocaleUpperCase('vi'), () => choose(id));
    tab.dataset.group = id;
    tabs.append(tab);
  }
  filters.append(button('Làm mới', () => { query.value = ''; range.value = 'all'; choose(group); }));
  query.oninput = range.onchange = term.onchange = render;
  choose(group);
  note(body, service, 'td-source');
}

function renderFtth(body, service, plans, buy) {
  for (const [group, title] of Object.entries(planGroups.ftth)) {
    const list = plans.filter(plan => plan.group === group);
    if (!list.length) continue;
    const section = el('section');
    const frame = el('div', 'ftth-table-scroll');
    frame.tabIndex = 0;
    frame.setAttribute('role', 'region');
    frame.setAttribute('aria-label', 'Bảng giá ' + title);
    const table = el('table');
    const headers = table.createTHead().insertRow();
    for (const label of ['Gói cước', 'Trong nước tối đa', 'Quốc tế tối thiểu',
      group === 'static' ? 'Loại IP' : 'Số lượng Mesh Wi-Fi', 'Giá cước', 'Mua ngay']) {
      const cell = el('th', '', label);
      cell.scope = 'col';
      headers.append(cell);
    }
    const rows = table.createTBody();
    for (const plan of list) {
      const row = rows.insertRow();
      const name = el('th', '', plan.name);
      name.scope = 'row';
      row.append(name);
      for (const value of [plan.domestic + ' Mbps', plan.international + ' Mbps', plan.option]) row.insertCell().textContent = value;
      const price = row.insertCell();
      price.className = 'ftth-plan-price';
      price.append(cash(plan.price), el('small', 'pricing-vat-note', '(' + plan.vat + ')'));
      row.insertCell().append(button('Mua ngay', () => buy(plan)));
    }
    frame.append(table);
    section.append(el('h3', '', title), frame);
    body.append(section);
  }
  if (!plans.length) body.append(el('p', '', 'Chưa có gói cước hiển thị.'));
  note(body, service, 'ftth-vat-note');
}

export function pricingDialog(service, plans, consult) {
  const [id, prefix] = layouts[service.id];
  const dialog = el('dialog');
  dialog.id = id;
  dialog.setAttribute('aria-labelledby', id + 'Title');
  const header = el('header', prefix + '-top');
  const title = el(prefix === 'td' || prefix === 'ca-price' ? 'strong' : 'h2', '',
    prefix === 'td' ? 'BẢNG GIÁ TENDOO' : prefix === 'ca-price' ? 'Viettel-CA – ' + service.name : 'Bảng giá ' + service.name);
  title.id = id + 'Title';
  const close = button('×', () => dialog.close(), prefix + '-close');
  close.setAttribute('aria-label', 'Đóng bảng giá');
  header.append(title, close);
  const body = el('div', prefix === 'ftth' ? 'ftth-pricing-body' : prefix + '-body');
  dialog.append(header, body);
  const open = () => { body.scrollTop = 0; openDialog(dialog); };
  const buy = plan => consult(service, plan, open);
  if (prefix === 'td') renderTendoo(body, service, plans, buy);
  else if (prefix === 'ftth') renderFtth(body, service, plans, buy);
  else renderCards(body, prefix, service, plans, buy);
  if (prefix === 'ca-price') {
    const footer = el('footer');
    footer.append(button('Đăng ký tư vấn', () => consult(service, null, open)));
    dialog.append(footer);
  }
  document.body.append(dialog);
  return open;
}
