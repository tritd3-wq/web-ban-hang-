import { sendJson } from './ui.js';

const form = document.getElementById('login');
const status = document.getElementById('loginStatus');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('button');
  submit.disabled = true;
  status.textContent = 'Đang đăng nhập…';
  try {
    await sendJson('/api/admin?action=login', Object.fromEntries(new FormData(form)));
    location.replace('/admin');
  } catch (error) {
    status.textContent = error.message;
    submit.disabled = false;
  }
});
