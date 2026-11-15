const status = document.getElementById('adminStatus');
let hideTimeout;

export function report(message, error = false) {
  clearTimeout(hideTimeout);
  status.dataset.error = String(error);
  status.textContent = message;
  if (message) {
    hideTimeout = setTimeout(() => { status.textContent = ''; }, 10_000);
  }
}
