import { randomBytes, scryptSync } from 'node:crypto';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString().replace(/\r?\n$/, '');
if (password.length < 12 || password.length > 200) {
  console.error('Nhập mật khẩu 12–200 ký tự qua stdin.');
  process.exitCode = 1;
} else {
  const salt = randomBytes(16).toString('hex');
  console.log(salt + ':' + scryptSync(password, salt, 64).toString('hex'));
}
