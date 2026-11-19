// على صفحة النظام: بيعلن إن الإضافة موجودة، وبيوصل الطلبات للإضافة والنتايج للصفحة
document.documentElement.dataset.tpWe = chrome.runtime.getManifest().version;
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || e.data.source !== 'tp-it') return;
  if (e.data.type === 'TP_WE_REFRESH') chrome.runtime.sendMessage({ type: 'refresh', code: e.data.code, number: e.data.number, lines: e.data.lines });
});
chrome.runtime.onMessage.addListener(m => {
  if (m && typeof m.type === 'string' && m.type.startsWith('TP_WE_')) window.postMessage(Object.assign({ source: 'tp-we-ext' }, m), '*');
});
