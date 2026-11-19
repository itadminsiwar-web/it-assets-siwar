// جوه موقع WE: لو التاب ده مفتوح من زرار النظام ← يكتب الرقم، يختار Internet، يكتب الباسورد ويدوس Login مرة واحدة بس،
// ولو فيه كابتشا يستناك تكتبها، وبعد الدخول يقرا الجيجات المتبقية وميعاد التجديد ويرجّعهم للنظام.
(async () => {
  let job = null;
  for (let i = 0; i < 8 && !job; i++) { job = await chrome.runtime.sendMessage({ type: 'getJob' }); if (!job) await new Promise(r => setTimeout(r, 500)); }
  if (!job) return; // تاب WE عادي (مش من النظام)

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#c94f08;color:#fff;font:600 15px Segoe UI,Tahoma,sans-serif;padding:10px 16px;text-align:center;direction:rtl;box-shadow:0 2px 8px #0004';
  document.documentElement.appendChild(bar);
  let lastStatus = '';
  const VER = 'v' + chrome.runtime.getManifest().version;
  const status = t => { bar.textContent = '🔄 TP IT ' + VER + ' — ' + job.code + ' (' + job.number + '): ' + t; if (t !== lastStatus) { lastStatus = t; chrome.runtime.sendMessage({ type: 'status', text: t }); } };
  status('بيفتح الحساب…');

  let pwFix = 0, done = false, clicked = false, clickedAt = 0, pwSet = false, lastNav = Date.now(), navTries = 0, numAt = 0, typeTries = 0;
  const finish = res => { if (done) return; done = true; bar.style.background = res.ok ? '#0f766e' : '#b91c1c'; status(res.ok ? `تمام ✓ متبقي ${res.remaining} من ${res.quota} جيجا · التجديد ${res.renewalDate || '؟'} — رجعت للنظام` : '✕ ' + res.error); chrome.runtime.sendMessage({ type: 'result', result: res }); };

  // نفس منطق السكربت: باقة الإنترنت الأرضي (ADSL) الأول، وإلا أول باقة فيها remain
  const UNITS = { '1109': 'GB', '1108': 'MB' };
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function parse(data) {
    const body = (data && data.body) || [];
    if (!Array.isArray(body)) return null;
    const all = body.filter(u => u && typeof u === 'object' && 'remain' in u);
    // الإنترنت الأرضي = كل أرصدة ADSL مع بعض (WE بتجمعها في "Home Internet": الباقة + أي رصيد إضافي/مرحّل)
    // ولو مفيش ADSL: كل الأرصدة اللي وحدتها جيجا/ميجا (مش النقاط)
    let units = all.filter(u => String(u.freeUnitType || '').toUpperCase().startsWith('ADSL'));
    if (!units.length) units = all.filter(u => UNITS[String(u.measureUnit)]);
    if (!units.length) return null;
    const gb = (u, v) => v == null || v === '' ? 0 : Number(v) * (UNITS[String(u.measureUnit)] === 'MB' ? 1 / 1024 : 1), r2 = v => Math.round(v * 100) / 100;
    const sum = f => r2(units.reduce((s, u) => s + gb(u, u[f]), 0));
    // ميعاد التجديد من الرصيد الأساسي (الأكبر)
    const fu = units.slice().sort((a, b) => gb(b, b.total) - gb(a, a.total))[0], det = (fu.freeUnitBeanDetailList || [{}])[0] || {};
    const exp = fu.expireTime || det.expireTime;
    let renewalDate = exp ? iso(new Date(Number(exp))) : '';
    const days = det.remainingDaysForRenewal;
    if (!renewalDate && days != null) { const d = new Date(); d.setDate(d.getDate() + Number(days)); renewalDate = iso(d); }
    return { remaining: sum('remain'), used: sum('used'), quota: sum('total'), renewalDate, days: days != null ? Number(days) : null, name: fu.freeUnitTypeName || fu.tabName || 'Internet', parts: units.length,
      offers: [].concat(...units.map(u => (u.freeUnitBeanDetailList || []).map(x => x.offeringName))).filter(Boolean) };
  }

  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || !e.data.__tpwe) return;
    const { __tpwe: k, data } = e.data;
    if (k === 'auth') { const h = (data && data.header) || {}, rc = String(h.retCode); if (rc !== '0' && rc !== 'undefined') { const msg = h.retMsg || h.errorMsg || h.errorMessage || (data && (data.errorMsg || data.message)) || ''; finish({ ok: false, error: rc === '9999' ? 'WE قافلة الخط ده مؤقتًا (كود 9999 — locked)' + (msg ? ': ' + msg : '') + ' — الإضافة مش هتحاول عليه تاني لمدة ساعة عشان القفل مايتجددش. ماتجربش بإيدك قبلها.' : 'WE رفضت الدخول (' + TYPE + '): ' + (msg || 'من غير رسالة') + ' [كود ' + rc + ']' }); } }
    if (k === 'usage') { const r = parse(data); if (r) finish(Object.assign({ ok: true }, r)); }
  });

  const vis = el => !!(el && (el.offsetParent !== null || el.getClientRects().length));
  const text = () => document.body ? document.body.innerText || '' : '';
  const setVal = (el, v) => { const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value'); el.focus(); d.set.call(el, v); ['input', 'change', 'blur'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); };
  const press = el => ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
  // Service Type = Internet (قايمة WE: ant/nz-select مكتوب فيها "Select Type")
  const TYPE = job.type || 'Internet', TYPE_RE = new RegExp('^\\s*' + TYPE.replace(/\s+/g, '\\s*') + '\\s*$', 'i');
  const SELS = '.ant-select, nz-select, mat-select, .ng-select, select, [role=combobox]';
  const leaf = re => [...document.querySelectorAll('label, span, div, p, h4, h5')].find(e => !e.children.length && re.test(e.textContent) && vis(e));
  function typeBox() {
    const lab = leaf(/^\s*\*?\s*Service Type\s*\*?\s*:?\s*$/i);
    if (lab) { let n = lab; for (let i = 0; i < 6 && n; i++) { n = n.parentElement; const b = n && [...n.querySelectorAll(SELS)].find(vis); if (b) return b; } }
    return [...document.querySelectorAll(SELS)].find(vis) || null;
  }
  // القيمة المختارة بس (قايمة الاختيارات بتتعرض جوه نفس العنصر في موقع WE، فمينفعش نعتمد على كل النص)
  const isInternet = b => {
    if (!b) return false;
    if (b.tagName === 'SELECT') return TYPE_RE.test((b.options[b.selectedIndex] || {}).text || '');
    const it = b.querySelector('.ant-select-selection-item, .mat-select-value-text, .ng-value-label');
    return !!it && TYPE_RE.test(it.textContent);
  };
  async function selectInternet() {
    let box = typeBox();
    if (isInternet(box)) return 'ok';
    if (box && box.tagName === 'SELECT') { const o = [...box.options].find(x => TYPE_RE.test(x.text)); if (o) { box.value = o.value; box.dispatchEvent(new Event('change', { bubbles: true })); } return isInternet(box) ? 'ok' : 'open'; }
    const opener = box ? (box.querySelector('.ant-select-selector') || box) : leaf(/^\s*Select Type\s*$/i);
    if (!opener) return 'none';
    // القايمة لسه مقفولة (رمادي) لحد ما WE تتأكد من الرقم ← نستنى
    if (box && /ant-select-disabled|mat-select-disabled|ng-select-disabled/.test(box.className + ' ' + (box.parentElement || {}).className)) return 'wait';
    const si = box && box.querySelector('input'); if (si) { si.focus(); si.dispatchEvent(new FocusEvent('focus', { bubbles: true })); }
    press(opener); await sleep(800);
    let opts = [...document.querySelectorAll('.ant-select-item-option, nz-option-item, [role=option], mat-option, .ng-option')].filter(o => vis(o) && TYPE_RE.test(o.textContent));
    if (!opts.length) opts = [...document.querySelectorAll('li, div, span')].filter(o => vis(o) && !o.children.length && TYPE_RE.test(o.textContent));
    const opt = opts[opts.length - 1];
    if (!opt) return 'open';
    press(opt.closest('.ant-select-item-option, nz-option-item, [role=option], mat-option, .ng-option') || opt); await sleep(600);
    return isInternet(typeBox()) ? 'ok' : 'open';
  }

  const t0 = Date.now();
  while (!done && Date.now() - t0 < 5 * 60 * 1000) {
    await sleep(1000);
    if (done) break;
    const body = text();
    if (/maximum number of incorrect attempts|try again after|account (is )?locked|تجاوزت/i.test(body)) { finish({ ok: false, error: 'WE قفلت الدخول مؤقتًا — جرّب بعد ساعة' }); break; }
    if (/Please enter the code below|(ادخل|أدخل) الكود/i.test(body)) { bar.style.background = '#b45309'; status('⚠ WE طالبة كود تحقق: اكتب الكود اللي في الصورة ودوس Ok (الإضافة مستنياك)'); continue; }
    bar.style.background = '#c94f08';
    // بعد Login: لو WE كتبت رسالة غلط في الصفحة (مش في الرد) نوقف ونقول السبب بدل ما نستنى
    if (clicked && Date.now() - clickedAt > 2500 && [...document.querySelectorAll('input[type=password]')].some(vis)) {
      const m = body.match(/[^\n]*(incorrect|invalid|wrong|not correct|not valid|doesn'?t match|غير صحيح|خطأ|خاطئ)[^\n]*/i);
      if (m) { finish({ ok: false, error: 'WE قالت: ' + m[0].trim().slice(0, 140) }); break; }
    }
    const pw = [...document.querySelectorAll('input[type=password]')].find(vis);
    // Chrome بيملا باسورد محفوظ (ممكن قديم/غلط) بعد ما الإضافة تكتب ← نقفل الملء التلقائي للخانات دي
    if (pw && pw.getAttribute('autocomplete') !== 'new-password') { pw.setAttribute('autocomplete', 'new-password'); const u0 = [...document.querySelectorAll('input:not([type=password]):not([type=hidden])')].find(vis); if (u0) u0.setAttribute('autocomplete', 'off'); }
    const onLogin = /login/i.test(location.hash) || !!pw;
    if (onLogin && pw) {
      if (clicked) { status('مستني رد WE…'); continue; }
      // 1) الرقم (Service number)
      const num = [...document.querySelectorAll('input:not([type=password]):not([type=hidden]):not([type=checkbox]):not([type=radio])')].find(vis);
      if (num && num.value.replace(/\D/g, '') !== job.number) { setVal(num, job.number); numAt = Date.now(); status('كتب الرقم…'); continue; }
      // 2) Service Type = Internet (بيظهر بعد كتابة الرقم) — من غيره مفيش Login
      const st = await selectInternet();
      const needType = st !== 'none' || /Service Type|Select Type/i.test(text());
      if (st === 'wait') { status('مستني WE تفتح قايمة Service Type…'); if (num) num.dispatchEvent(new Event('blur', { bubbles: true })); continue; }
      if (needType && st !== 'ok') { typeTries++; status(typeTries > 10 ? 'مقدرتش أختار Service Type — اختار ' + TYPE + ' بإيدك ودوس Login' : 'بيختار Service Type = ' + TYPE + '… (محاولة ' + typeTries + ')'); continue; }
      if (!needType && Date.now() - numAt < 3000) continue; // استنى شوية يمكن قايمة Service Type تظهر
      // 3) الباسورد: باسورد الخط ده دايمًا (Chrome ممكن يكون ملا باسورد/رقم الخط اللي قبله)
      if (job.password && !pwSet) { setVal(pw, job.password); pwSet = true; await sleep(400); continue; }
      if (!job.password && !pw.value) { status('Service Type = ' + TYPE + ' ✓ — اكتب الباسورد ودوس Login'); continue; }
      // 4) قبل Login: نتأكد إن الرقم لسه رقم الخط ده ومختار Internet
      if (num && num.value.replace(/\D/g, '') !== job.number) { setVal(num, job.number); pwSet = false; continue; }
      if (!isInternet(typeBox())) continue;
      // آخر تأكيد قبل Login: الباسورد في الخانة = باسورد الخط ده بالظبط (لو Chrome غيّره ← نكتبه تاني)
      if (job.password && pw.value !== job.password) { pwFix = (pwFix || 0) + 1; status('Chrome غيّر الباسورد من المحفوظ عنده — بنرجّع باسورد الخط (' + pwFix + ')'); setVal(pw, job.password); await sleep(700); continue; }
      // 5) Login مرة واحدة بس عشان الحساب ميتقفلش
      const btn = [...document.querySelectorAll('button')].find(b => /^\s*(login|sign in|تسجيل الدخول|دخول)\s*$/i.test(b.textContent) && !b.disabled && vis(b));
      if (btn) { clicked = true; clickedAt = Date.now(); status('Service Type = ' + TYPE + ' ✓ — بيعمل لوجين…'); btn.click(); }
      else status('دوس Login');
      continue;
    }
    if (!onLogin) {
      status('جوه الحساب — بيجيب الجيجات…');
      if (Date.now() - lastNav > 12000 && navTries < 2) { navTries++; lastNav = Date.now(); if (navTries === 1) location.hash = '#/accountoverview'; else location.reload(); }
    }
  }
  if (!done) finish({ ok: false, error: 'الوقت خلص (5 دقايق) من غير ما الأرقام توصل' });
})();
