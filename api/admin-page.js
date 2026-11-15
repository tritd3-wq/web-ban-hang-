import { authConfigured, signedIn } from '../server/auth.js';
import { method, route } from '../server/http.js';

const head = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Quản trị · Viettel Đồng Nai</title><link rel="stylesheet" href="/fonts/viettel/beausans.css">
<link rel="stylesheet" href="/admin.css"></head>`;
const notification = '<p id="adminStatus" class="admin-toast" role="status" aria-atomic="true"></p>';

export default route(async (req, res) => {
  method(req, ['GET']);
  const admin = await signedIn(req);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https://vercel.com; img-src 'self' https: data: blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  res.end(head + (admin ? `<body><header class="admin-top"><strong>Viettel Đồng Nai <span>Quản trị website</span></strong>
    <div><a href="/" target="_blank" rel="noopener">Xem website ↗</a> <button id="logout" class="secondary" type="button">Đăng xuất</button></div></header>
    <div class="admin-layout"><nav id="adminNav" aria-label="Mục quản trị"></nav>
    <main><h1 id="sectionTitle">Quản trị nội dung</h1><div id="editor"></div></main></div>${notification}
    <script type="module" src="/admin.js"></script></body>` : `<body class="login-page"><main class="login-card">
    <a href="/">← Về website</a><p class="brand">Viettel Đồng Nai</p><h1>Đăng nhập quản trị</h1>
    ${authConfigured() ? `<form id="login"><label>Tài khoản<input name="username" required maxlength="120" autocomplete="username"></label>
    <label>Mật khẩu<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label>
    <button type="submit">Đăng nhập</button></form>${notification}
    <script type="module" src="/admin-login.js"></script>` : '<p>Chưa cấu hình tài khoản quản trị.</p>'}</main></body>`) + '</html>');
});
