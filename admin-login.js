import { sendJson } from './ui.js';
import { report } from './admin-toast.js';

const form = document.getElementById('login');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('button');
  submit.disabled = true;
  report('Đang đăng nhập…');
  try {
    await sendJson('/api/admin?action=login', Object.fromEntries(new FormData(form)));
    location.replace('/admin');
  } catch (error) {
    report(error.message, true);
    submit.disabled = false;
  }
});
