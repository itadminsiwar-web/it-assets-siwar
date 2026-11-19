/* =========================================================
   protect.js — وضع العرض المحمي (يعمل فقط لو APP_CONFIG.protect = true)
   تنبيه صريح: لا يوجد موقع يستطيع منع لقطة الشاشة 100% (أدوات النظام وكاميرا الموبايل
   تعمل خارج المتصفح). هذا الوضع يصعّب الالتقاط، ويجعل أي لقطة تحمل اسم من التقطها.
   ========================================================= */
(function (global) {
  'use strict';
  const CFG = global.APP_CONFIG || {};
  if (!CFG.protect) return;
  const root = document.documentElement;
  root.classList.add('protected');

  // ---------- 1) العلامة المائية ----------
  const wm = document.createElement('div');
  wm.className = 'wm-layer'; wm.setAttribute('aria-hidden', 'true');
  const shield = document.createElement('div');
  shield.className = 'wm-shield'; shield.innerHTML = '<div><b>🔒 عرض محمي — SEG</b><span>المحتوى سري ولا يُسمح بتصويره<br>Protected view · Screenshots are not allowed</span></div>';

  function stamp() { const d = new Date(); return d.toISOString().slice(0, 10) + ' ' + d.toTimeString().slice(0, 5); }
  function paint(who) {
    const line1 = (who || 'Protected view') + '  ·  ' + stamp();
    const line2 = ((global.BRAND || {}).companyEn || (global.BRAND || {}).company || 'SEG') + ' · Confidential · سري';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240"><g transform="rotate(-24 210 120)" font-family="Cairo, Segoe UI, sans-serif" fill="currentColor">
      <text x="210" y="112" font-size="15" font-weight="700" text-anchor="middle">${esc(line1)}</text>
      <text x="210" y="134" font-size="12.5" text-anchor="middle">${esc(line2)}</text></g></svg>`;
    // نسختان بلونين: داكن للخلفيات الفاتحة وفاتح للغامقة (تظهر في الوضعين)
    const enc = c => 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/currentColor/g, c)) + '")';
    wm.style.backgroundImage = enc('rgba(20,30,60,0.09)') + ',' + enc('rgba(255,255,255,0.07)');
    wm.style.backgroundPosition = '0 0, 210px 120px';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  let viewer = '';
  paint('');
  setInterval(() => paint(viewer), 60000); // تحديث الوقت كل دقيقة

  // من يشاهد؟ (متاح لأعضاء المنظمة والمدعوين؛ زائر الرابط العام يظهر "Protected view")
  (async () => {
    try {
      if (!global.claude || typeof global.claude.use !== 'function') return;
      const user = await global.claude.use('user'); if (!user) return;
      const me = await user.me();
      viewer = [me.name, me.email].filter(Boolean).join(' — ');
      if (viewer) paint(viewer);
    } catch (e) { /* بدون هوية: تبقى العلامة العامة */ }
  })();

  function mount() { document.body.appendChild(wm); document.body.appendChild(shield); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // ---------- 2) منع النسخ والقائمة والسحب والاختصارات ----------
  const isField = t => t && (t.closest && t.closest('input, textarea, select, [contenteditable="true"]'));
  document.addEventListener('contextmenu', e => { if (!isField(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', e => e.preventDefault());
  ['copy', 'cut'].forEach(ev => document.addEventListener(ev, e => { if (!isField(e.target)) { e.preventDefault(); } }));
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(k)) { e.preventDefault(); flash(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c', 's'].includes(k)) { e.preventDefault(); }
    if (k === 'f12') e.preventDefault();
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(k)) flash(); // macOS
  }, true);

  // ---------- 3) تغطية الشاشة عند Print Screen أو مغادرة الصفحة ----------
  let t;
  function flash(ms) { root.classList.add('wm-hide'); clearTimeout(t); t = setTimeout(() => root.classList.remove('wm-hide'), ms || 1500); }
  document.addEventListener('keyup', e => {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      flash(2500);
      try { navigator.clipboard && navigator.clipboard.writeText('SEG — Protected view. Screenshots are not allowed.').catch(() => {}); } catch (err) {}
    }
  }, true);
  // أدوات القص (Win+Shift+S) تسحب التركيز من الصفحة: نغطي المحتوى طالما الصفحة غير نشطة
  global.addEventListener('blur', () => root.classList.add('wm-hide'));
  global.addEventListener('focus', () => setTimeout(() => root.classList.remove('wm-hide'), 150));
  document.addEventListener('visibilitychange', () => { if (document.hidden) root.classList.add('wm-hide'); });
})(window);
