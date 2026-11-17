import defaults from './site-defaults.js';
import { byId, digits, el, lines, request } from './ui.js';
import { setupConsult } from './solution-consult.js';
import { pricingDialog } from './pricing.js';
import { pageVisibilityDefaults, serviceVideos } from './site-model.js';

const select = selector => document.querySelector(selector);
const write = (selector, value) => { select(selector).textContent = value; };
function writeLines(target, value) {
  const parts = value.split('\n');
  target.replaceChildren();
  parts.forEach((part, index) => {
    if (index) target.append(el('br'));
    target.append(part);
  });
}

function updateContact({ contact, home, menu }) {
  const logo = select('nav .logo');
  logo.setAttribute('aria-label', contact.brand);
  logo.querySelector('img').src = contact.logo;
  logo.querySelector('img').alt = contact.brand;
  write('nav .logo small', contact.tagline);
  select('nav .links').replaceChildren(...menu.map(item => {
    const anchor = el('a', '', item.label);
    anchor.href = item.href;
    return anchor;
  }));
  const navCta = select('nav .btn');
  navCta.href = home.registerCtaLink;
  navCta.textContent = home.registerCta;
  const heroCta = select('.hero .actions .btn');
  heroCta.href = home.heroCtaLink;
  heroCta.textContent = home.heroCta;
  write('.hero-brand', contact.brand.toLocaleUpperCase('vi'));
  write('.portrait .name > strong', contact.brand);
  write('.portrait-person-name', contact.person);
  const photo = select('.portrait > img');
  photo.src = contact.portrait;
  photo.alt = contact.person + ' – ' + contact.brand;
  const qr = select('.register-qr');
  qr.src = contact.qr;
  qr.alt = 'Mã QR TAMMI của ' + contact.person;
  write('.connect-info h3', contact.person);
  write('.footer-contact h2', contact.brand.toLocaleUpperCase('vi'));
  write('.footer-contact p:first-of-type strong', [contact.person, contact.role].filter(Boolean).join(' - '));
  write('.footer-contact p:last-child strong', 'Địa chỉ: ' + contact.address);
  const contactEmail = el('a', '', contact.email);
  contactEmail.href = 'mailto:' + contact.email;
  const footer = select('.footer-contact');
  const emailLine = el('p', '', 'Email: ');
  emailLine.append(contactEmail);
  footer.insertBefore(emailLine, footer.lastElementChild);

  const phones = [
    ['.hero .actions .secondary', '', ''], ['.portrait .name a', 'span', ''],
    ['.connect-phone', '', 'Hotline '], ['.footer-contact a[href^="tel:"]', 'strong', ''],
    ['#floatingCall', '.floating-call-copy strong', '']
  ];
  for (const [selector, textSelector, prefix] of phones) {
    const link = select(selector);
    link.href = 'tel:' + digits(contact.hotline);
    link.setAttribute('aria-label', 'Gọi ' + contact.hotline);
    (textSelector ? link.querySelector(textSelector) : link).textContent = prefix + contact.hotline;
  }
  select('.solution-banner').setAttribute('aria-label', 'Thông tin và dịch vụ ' + contact.brand);
  write('.solution-ticker-copy', [contact.brand, 'Địa chỉ: ' + contact.address,
    'Hotline ' + contact.hotline, contact.ticker].filter(Boolean).join('. '));
}

function updateHome({ home, contact, services }) {
  document.title = home.pageTitle;
  select('meta[name=description]').content = home.metaDescription.replaceAll('{hotline}', contact.hotline);
  write('.hero .eyebrow', home.heroEyebrow);
  const title = select('.hero h1');
  title.replaceChildren(home.heroTitle, el('br'), el('em', '', home.heroAccent));
  write('.hero .lead', home.heroIntro);
  const [first, second, third] = select('.hero .mini').children;
  first.querySelector('b').textContent = String(services.length).padStart(2, '0');
  second.replaceChildren(el('b', '', home.miniMiddle), home.miniMiddleText);
  third.replaceChildren(el('b', '', home.miniLast), home.miniLastText);

  const labels = {
    '#posterTitle': home.bannerTitle,
    '#solutions > .head .eyebrow': home.solutionsEyebrow,
    '#solutions > .head > p': home.solutionsIntro,
    '.discover-eyebrow': home.videoEyebrow,
    '#discoverTitle': home.videoTitle,
    '.discover-heading > p': home.videoIntro,
    '.faq-eyebrow': home.faqEyebrow,
    '#faqTitle': home.faqTitle,
    '.register-contact .eyebrow': home.registerEyebrow,
    '.register-intro': home.registerIntro,
    '.connect-badge': home.contactBadge,
    '.connect-info p': home.contactIntro,
    '.connect-qr p': home.qrLabel,
    '#form h3': home.formTitle,
    '#submit': home.formButton,
    '.register-consent span': home.formConsent,
    '.thanks-eyebrow': home.thanksEyebrow
  };
  for (const [selector, value] of Object.entries(labels)) write(selector, value);
  writeLines(select('#solutions > .head h2'), home.solutionsTitle);
  writeLines(select('.register-contact h2'), home.registerTitle);
  const emoji = value => {
    const node = el('span', 'thanks-emoji', value);
    node.setAttribute('aria-hidden', 'true');
    return node;
  };
  byId('thanksTitle').replaceChildren(emoji('❤️'), ' ' + home.thanksTitle + ' ', emoji('❤️'));
  const message = lines(home.thanksMessage);
  select('.thanks-message').replaceChildren(...message.map((line, index) => {
    const p = el('p');
    p.append(emoji(['🌹', '🤝', '💐'][index % 3]), ' ', index === 2 ? el('strong', '', line) : line);
    return p;
  }));
  select('.thanks-slogan').replaceChildren(emoji('❤️'), ' ' + home.thanksSlogan);
}

function renderPosters(banners) {
  const stage = select('.poster-stage');
  const gallery = select('.poster-gallery');
  if (!banners.length) {
    gallery.hidden = true;
    return;
  }
  const pictures = banners.map((item, index) => {
    const picture = el('picture');
    const source = el('source');
    source.media = '(max-width: 768px)';
    source.srcset = item.mobile;
    const image = el('img');
    image.src = item.desktop;
    image.alt = item.alt;
    image.decoding = 'async';
    if (index) image.loading = 'lazy';
    picture.append(source, image);
    picture.hidden = index !== 0;
    return picture;
  });
  stage.replaceChildren(...pictures);
  if (pictures.length > 1) {
    let index = 0;
    setInterval(() => {
      pictures[index].hidden = true;
      index = (index + 1) % pictures.length;
      pictures[index].hidden = false;
    }, 5000);
  }
}

function renderFaq(items) {
  const wrap = select('.faq-list');
  byId('faq').hidden = !items.length;
  for (const { question, answer } of items) {
    const item = el('article', 'faq-item');
    const h = el('h3');
    const p = el('p');
    const qIcon = el('span', 'faq-question-icon', '?');
    const aIcon = el('span', 'faq-answer-icon', '✓');
    qIcon.setAttribute('aria-hidden', 'true');
    aIcon.setAttribute('aria-hidden', 'true');
    h.append(qIcon, question);
    p.append(aIcon, answer);
    item.append(h, p);
    wrap.append(item);
  }
}

function renderPageBlocks(items) {
  if (!items.length) return;
  const blocks = el('div', 'wrap page-blocks');
  for (const item of items) {
    const block = el('section', 'page-block');
    const copy = el('div');
    copy.append(el('h2', '', item.title), el('p', '', item.description));
    block.append(copy);
    if (item.image) {
      const image = el('img');
      image.src = item.image;
      image.alt = item.title;
      image.loading = 'lazy';
      image.decoding = 'async';
      block.classList.add('has-image');
      block.append(image);
    }
    blocks.append(block);
  }
  byId('register').before(blocks);
}

const styleMap = {
  tendoo: ['', 'tendoo-price', 0],
  'viettel-ca': ['ca-feature', 'ca-price', 1],
  vcontract: ['vcontract-feature', 'vcontract-price', 2],
  sinvoice: ['sinvoice-feature', 'sinvoice-price', 3],
  vbhxh: ['vbhxh-feature', 'vbhxh-price', 4],
  ftth: ['', 'ftth-price', 5]
};

function renderServices({ services, plans }, consult) {
  const cards = byId('cards');
  for (const [index, service] of services.entries()) {
    const [variant, priceClass] = styleMap[service.id];
    if (index % 2 === 0) cards.append(el('div', 'service-pair'));
    const card = el('article', ('card tendoo-feature ' + variant).trim());
    card.id = service.id;
    card.append(el('div', 'num', service.label), el('h3', '', service.title));
    if (service.description) card.append(el('p', '', service.description));
    const benefits = el('ul', 'tendoo-benefits');
    for (const benefit of lines(service.benefits)) benefits.append(el('li', '', benefit));
    if (benefits.childElementCount) card.append(benefits);
    const image = el('img', 'solution-image');
    image.alt = service.alt;
    image.src = service.image;
    image.loading = 'lazy';
    image.decoding = 'async';
    if (service.id === 'ftth') {
      image.className = '';
      const figure = el('figure', 'ftth-ad');
      const photo = el('div', 'ftth-photo');
      photo.append(image, el('strong', '', service.caption));
      figure.append(photo, el('figcaption', '', service.steps));
      card.append(figure);
    } else {
      const ratio = { 'viettel-ca': '1619/972', vcontract: '1576/998', sinvoice: '1534/1025', vbhxh: '1543/1019' }[service.id];
      if (ratio) image.style.aspectRatio = ratio;
      card.append(image);
    }
    const actions = el('div', 'tendoo-actions');
    const price = el('button', priceClass, 'Xem bảng giá');
    price.type = 'button';
    price.setAttribute('aria-haspopup', 'dialog');
    price.onclick = pricingDialog(service, plans.filter(plan => plan.service === service.id), consult);
    const register = el('button', 'tendoo-consult', 'Tôi muốn được tư vấn');
    register.type = 'button';
    register.onclick = () => consult(service);
    actions.append(price, register);
    card.append(actions);
    cards.lastElementChild.append(card);
  }
}

function renderDiscovery(items, services) {
  const wrap = select('.discover-options');
  byId('discover').hidden = !items.length;
  if (!items.length) return;
  const serviceById = new Map(services.map(item => [item.id, item]));
  function choose(item, index) {
    for (const [i, option] of [...wrap.children].entries()) option.setAttribute('aria-pressed', String(i === index));
    byId('discoverCategory').textContent = 'KHÁM PHÁ / ' + item.discoverTitle;
    byId('discoverName').textContent = item.videoName;
    byId('discoverDescription').textContent = item.videoDescription;
    const media = byId('discoverMedia');
    const external = byId('discoverExternal');
    external.href = item.youtube ? 'https://youtu.be/' + item.youtube : item.videoUrl;
    external.textContent = item.youtube ? 'Xem trên YouTube' : 'Mở video giới thiệu';
    if (item.youtube) {
      const button = el('button', 'discover-play');
      button.type = 'button';
      button.setAttribute('aria-label', 'Phát video ' + item.videoName);
      const thumb = el('img');
      thumb.src = 'https://i.ytimg.com/vi/' + item.youtube + '/hqdefault.jpg';
      thumb.alt = 'Video giới thiệu ' + item.videoName;
      thumb.loading = 'lazy';
      button.append(thumb, el('span', '', '▶'));
      button.onclick = () => {
        const iframe = el('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + item.youtube + '?autoplay=1';
        iframe.title = 'Video giới thiệu ' + item.videoName;
        iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        media.replaceChildren(iframe);
      };
      media.replaceChildren(button);
    } else {
      const video = el('video');
      video.src = item.videoUrl;
      const poster = serviceById.get(item.service)?.image;
      if (poster) video.poster = poster;
      video.controls = video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-label', 'Video giới thiệu ' + item.videoName);
      media.replaceChildren(video);
    }
    byId('discoverConsult').onclick = () => {
      const checkbox = [...byId('choices').querySelectorAll('input')].find(input => input.value === item.service);
      if (checkbox) checkbox.checked = true;
      byId('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  for (const [index, item] of items.entries()) {
    const button = el('button', 'discover-option');
    button.type = 'button';
    const label = el('span');
    label.append(el('strong', '', String(index + 1).padStart(2, '0') + '. ' + item.discoverTitle));
    button.append(label);
    if (item.service) {
      const mark = el('span', 'discover-wordmark discover-brand-' + styleMap[item.service][2]);
      mark.setAttribute('aria-hidden', 'true');
      button.append(mark);
    }
    button.onclick = () => choose(item, index);
    wrap.append(button);
  }
  choose(items[0], 0);
}

let content;
try {
  content = await request('/api/content');
} catch {
  content = defaults;
  if (location.protocol !== 'file:') {
    document.body.prepend(el('p', 'site-fallback', 'Chưa tải được nội dung mới nhất. Vui lòng tải lại trang hoặc liên hệ hotline.'));
  }
}
const visibility = content.pageVisibility ?? pageVisibilityDefaults;
const posters = visibility.posters ? content.banners : [];
const faq = visibility.faq ? content.faq : [];
const visibleServices = new Set(content.services.map(item => item.id));
const videos = visibility.videos
  ? (content.videos ?? serviceVideos(content.services)).filter(item => !item.service || visibleServices.has(item.service))
  : [];
const hiddenAnchors = new Set();
if (!posters.length) hiddenAnchors.add('#posterTitle');
if (!faq.length) hiddenAnchors.add('#faq');
if (!videos.length) hiddenAnchors.add('#discover');
updateContact({ ...content, menu: content.menu.filter(item => !hiddenAnchors.has(item.href)) });
updateHome(content);
renderPosters(posters);
renderFaq(faq);
renderPageBlocks(content.pageBlocks ?? []);
const consult = setupConsult(content);
renderServices(content, consult);
renderDiscovery(videos, content.services);
