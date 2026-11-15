import { initialize } from '../server/db.js';

await initialize();
console.log('Đã khởi tạo Neon. Nội dung đã chỉnh được giữ nguyên.');
