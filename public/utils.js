function formatTime(ms) {
  if (ms < 0) ms = 0;
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const msec = String(ms % 1000).padStart(3, '0');
  return { h, m, s, msec };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatTime };
}
