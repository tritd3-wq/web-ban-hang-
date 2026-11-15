(() => {
  const banner = document.querySelector('.solution-banner');
  const message = banner.querySelector('.solution-ticker-copy');
  const repeat = message.cloneNode(true);
  repeat.setAttribute('aria-hidden', 'true');
  message.after(repeat);

  const pixelsPerSecond = 70;
  const updateDuration = () => {
    const seconds = message.getBoundingClientRect().width / pixelsPerSecond;
    banner.style.setProperty('--ticker-duration', `${seconds}s`);
  };

  banner.classList.add('is-running');
  updateDuration();
  new MutationObserver(() => {
    repeat.textContent = message.textContent;
    updateDuration();
  }).observe(message, { childList: true, characterData: true, subtree: true });
  new ResizeObserver(updateDuration).observe(message);
})();
