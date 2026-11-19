/* =========================================================
   pages-it8.js — اللي اتاخد من it-administration (v1.2) وكان ناقص هنا — بهوية Three Pillars
   • الإخلاء: الجهات الست بالترتيب (Pending/Clear/Not Clear) + نموذج F05 + النسخة الموقعة + تحقق HR
     واعتماد IT مقفول طول ما فيه إيميل نشط أو عهدة
   • التعيين: مهام IT (مرحلة 5) تنفيذ ← دليل ← اعتماد — والتفعيل مقفول قبل الاعتماد
   • F01 استمارة التقديم للطباعة (فاضية أو متعبية) · دباجة لكل فرع على المطبوعات الجديدة
   • القوائم المنسدلة قابلة للتعديل · مركز التقارير (13 تقرير) · سجل تدقيق مربوط بالـ hash
   • نسخة احتياطية من بيانات النظام واستعادة متحقق منها (SHA-256)
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {}, X = global.ITX;
  const today = () => U.today();
  const esc = s => U.esc(s);
  const me = () => X.me().name || '';
  const render = () => global.Router.render();
  const isHR = () => ['admin', 'hr'].includes(X.role());
  const capture = (el, key, fn) => { if (el['_h_' + key]) el.removeEventListener('click', el['_h_' + key], true); const h = location.hash, g = e => { if (location.hash === h) fn(e); }; el['_h_' + key] = g; el.addEventListener('click', g, true); };
  const stop = e => { e.stopPropagation(); e.preventDefault(); };

  // ================= SHA-256 متزامن (للسجل المربوط بالـ hash) =================
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(str) {
    const b = new TextEncoder().encode(str), l = b.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(b); m[l] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  Fin.sha256 = sha256;

  // ================= القوائم المنسدلة القابلة للتعديل =================
  const LISTS = {
    conds: ['الحالات الفنية للأجهزة', () => ['جديد', 'ممتاز', 'جيد', 'مقبول', 'به عيوب', 'تالف']],
    offReasons: ['أسباب الإخلاء', () => ['استقالة', 'إنهاء خدمة', 'انتهاء عقد', 'نقل لشركة / فرع تاني', 'إجازة', 'أخرى']],
    candSources: ['مصادر التقديم', () => ['QR Code', 'Google Form', 'استقبال', 'إحالة', 'LinkedIn', 'Wuzzuf / Bayt']],
    expCats: ['فئات المصروفات', () => ['أجهزة', 'ملحقات ومستهلكات', 'صيانة', 'اشتراكات وتراخيص', 'إنترنت واتصالات', 'دومينات واستضافة', 'خدمات', 'أخرى']],
    docTypes: ['أنواع ملفات الشركة', () => ['NDA', 'اللائحة الداخلية', 'عقد العمل', 'سياسة العهد', 'أخرى']],
    monSizes: ['مقاسات الشاشات', () => ['17"', '18.5"', '19"', '20"', '21.5"', '22"', '23"', '24"', 'IPS 23"', 'IPS 24"', '27"', 'AIO', 'LTP', 'mob', 'NO']],
    military: ['الموقف التجنيدي', () => ['أدى الخدمة', 'معفى', 'مؤجل', 'لم يحن موعده']],
    payMethods: ['طرق الدفع', () => ['تحويل بنكي', 'كاش', 'شيك', 'بطاقة', 'محفظة']],
  };
  Fin.LISTS = LISTS;
  Fin.list = (key, def) => { const v = (((global.DB && global.DB.settings) || {}).lists || {})[key]; return Array.isArray(v) && v.length ? v.slice() : (def || (LISTS[key] ? LISTS[key][1]() : [])); };
  // الحالات الفنية مستخدمة كمصفوفة ثابتة في الكود القديم ← نحدّثها في مكانها
  const applyConds = () => { if (Array.isArray(Fin.CONDS)) Fin.CONDS.splice(0, Fin.CONDS.length, ...Fin.list('conds')); };
  // البيانات بتتحمّل بعد السكربتات ← نطبّق القوائم بعد Store.load
  const baseLoad = global.Store.load;
  global.Store.load = function () { const r = baseLoad.apply(this, arguments); try { applyConds(); } catch (e) {} return r; };
  P.lists = function (el) {
    const L = (DB.settings.lists = DB.settings.lists || {});
    el.innerHTML = `<div class="page-head"><div><h1>📋 القوائم المنسدلة</h1><p class="sub">مفيش حاجة ثابتة: ضيف أو عدّل أو شيل أي اختيار — كل سطر = اختيار. الأقسام بتيجي من شيت الجرد بس (قراءة)، والحالات السبع والفئات العشر زي الشيت.</p></div><div class="actions"><button class="btn primary" data-l="save">💾 حفظ الكل</button></div></div>
      <div class="tri-grid">${Object.entries(LISTS).map(([k, [t]]) => `<div class="panel"><h3>${esc(t)}</h3><textarea data-list="${k}" rows="8" style="width:100%">${esc(Fin.list(k).join('\n'))}</textarea>${L[k] ? `<button class="link small" data-l="reset" data-k="${k}">رجوع للافتراضي</button>` : '<span class="muted small">افتراضي</span>'}</div>`).join('')}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return;
      if (b.dataset.l === 'save') { el.querySelectorAll('[data-list]').forEach(t => { const v = t.value.split('\n').map(s => s.trim()).filter(Boolean), def = LISTS[t.dataset.list][1](); if (JSON.stringify(v) !== JSON.stringify(def)) L[t.dataset.list] = v; else delete L[t.dataset.list]; }); applyConds(); C.audit('تعديل', 'القوائم المنسدلة', Object.keys(L).join('، ')); global.Store.save(); UI.toast('اتحفظت القوائم'); render(); }
      if (b.dataset.l === 'reset') { delete L[b.dataset.k]; applyConds(); global.Store.save(); render(); } };
  };

  // ================= الدباجة لكل فرع =================
  const lh = co => (((DB.settings || {}).letterheads || {})[co || '']) || {};
  Fin.letterhead = function (co, title, en) {
    const B = global.BRAND || {}, L = lh(co);
    return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${B.accent || '#c94f08'};padding-bottom:8px;margin-bottom:10px">
      <img src="${esc(L.logo || B.logo || '')}" style="height:56px" alt="">
      <div style="text-align:center"><div style="font-size:20px;font-weight:700">${esc(title || '')}</div>${en ? `<div style="font-size:12px;color:#555" dir="ltr">${esc(en)}</div>` : ''}</div>
      <div style="text-align:left;font-size:11px;line-height:1.6"><b>${esc(B.company || '')}</b>${co ? ' · ' + esc(co) : ''}${L.address ? '<br>' + esc(L.address) : ''}${L.phone ? '<br><span dir="ltr">' + esc(L.phone) + '</span>' : ''}${L.email ? '<br><span dir="ltr">' + esc(L.email) + '</span>' : ''}</div></div>`;
  };
  Fin.letterFoot = co => { const L = lh(co); return L.footer ? `<div style="border-top:1px solid #ccc;margin-top:18px;padding-top:6px;font-size:10px;color:#666;text-align:center">${esc(L.footer)}</div>` : ''; };
  const baseOrgs = P.orgs;
  if (baseOrgs) P.orgs = function (el) {
    baseOrgs(el);
    const cos = (X.settings().companies || []).map(c => c.name), all = (DB.settings.letterheads = DB.settings.letterheads || {});
    el.insertAdjacentHTML('beforeend', `<div class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>🧾 الدباجة على المطبوعات</h2><p class="muted small">لكل ${esc(X.coLabel())}: العنوان والتليفون والتذييل — بتظهر على استمارة التقديم وإخلاء الطرف وطلبات الشراء وإقرار استلام العمل.</p></div><button class="btn primary sm" data-lh="save">حفظ الدباجة</button></div>
      <div class="tri-grid">${cos.map(c => { const L = all[c] || {}; return `<div><h3>${X.optChip('company', c)}</h3>${UI.field({ label: 'العنوان', name: 'lh_address_' + c, value: L.address || '' })}${UI.field({ label: 'التليفون', name: 'lh_phone_' + c, value: L.phone || '', attrs: 'dir="ltr"' })}${UI.field({ label: 'الإيميل', name: 'lh_email_' + c, value: L.email || '', attrs: 'dir="ltr"' })}${UI.field({ label: 'التذييل', name: 'lh_footer_' + c, value: L.footer || '' })}</div>`; }).join('')}</div></div>`);
    capture(el, 'lh', e => { if (!e.target.closest('[data-lh]')) return; stop(e); const d = UI.form(el);
      cos.forEach(c => { all[c] = { address: d['lh_address_' + c] || '', phone: d['lh_phone_' + c] || '', email: d['lh_email_' + c] || '', footer: d['lh_footer_' + c] || '' }; });
      global.Store.save(); UI.toast('اتحفظت الدباجة'); });
  };

  // ================= F01 — استمارة التقديم =================
  Fin.printApplication = function (c) {
    c = c || {}; const blank = !c.id, co = (X.settings().companies[0] || {}).name, priv = isHR();
    const v = x => blank ? '' : esc(x == null ? '' : x), line = (l, x, w) => `<td style="width:${w || 18}%;background:#f6f6f6"><b>${l}</b></td><td>${v(x)}&nbsp;</td>`;
    const rows = (n, cols) => Array.from({ length: n }, () => `<tr>${cols.map(() => '<td style="height:26px"></td>').join('')}</tr>`).join('');
    const lines = s => String(s || '').split('\n').filter(Boolean);
    const iv = k => (c.interviews || []).filter(i => i.kind === k && i.evaluatedAt).slice(-1)[0] || {};
    const crit = (k, list) => list.map(([key, l]) => `<tr><td>${l}</td><td style="text-align:center">${!blank && priv && iv(k).crit ? (iv(k).crit[key] != null ? iv(k).crit[key] + ' / 10' : '') : '&nbsp;&nbsp;&nbsp; / 10'}</td></tr>`).join('');
    const T = 'style="width:100%;border-collapse:collapse;margin:6px 0" border="1" cellpadding="5"';
    UI.print(`<div dir="rtl" style="font-family:Cairo,Tahoma;font-size:12.5px">${Fin.letterhead(co, 'استمارة طلب توظيف', 'Application Form for Employment')}
      <table ${T}><tr>${line('تاريخ الطلب', c.appliedAt)}${line('الوظيفة المطلوبة', c.jobTitle)}${line('الراتب المتوقع', c.expectedSalary)}</tr>
      <tr>${line('الاسم', c.name)}${line('تاريخ الميلاد', c.birthDate)}${line('الموقف التجنيدي', c.military)}</tr>
      <tr>${line('الحالة الاجتماعية', c.marital)}${line('الرقم القومي', priv ? c.nationalId : (blank ? '' : '🔒'))}${line('الهاتف', c.phone)}</tr>
      <tr>${line('العنوان', priv || blank ? c.address : '🔒')}${line('المؤهل', c.qualification)}${line('سنة التخرج', c.gradYear)}</tr></table>
      <b>الأعمال السابقة</b><table ${T}><tr style="background:#f6f6f6"><th>الشركة</th><th>من / إلى</th><th>الوظيفة</th><th>الراتب</th><th>سبب ترك العمل</th></tr>${blank ? rows(3, [1, 2, 3, 4, 5]) : lines(c.prevJobs).map(s => `<tr><td colspan="5">${esc(s)}</td></tr>`).join('') || rows(2, [1, 2, 3, 4, 5])}</table>
      <b>الدورات</b><table ${T}><tr style="background:#f6f6f6"><th>اسم الدورة</th><th>الفترة</th><th>المحاضر</th><th>ملاحظات</th></tr>${blank ? rows(2, [1, 2, 3, 4]) : lines(c.courses).map(s => `<tr><td colspan="4">${esc(s)}</td></tr>`).join('') || rows(1, [1, 2, 3, 4])}</table>
      <b>المراجع</b><table ${T}><tr style="background:#f6f6f6"><th>الاسم</th><th>الوظيفة</th><th>الهاتف</th></tr>${blank ? rows(2, [1, 2, 3]) : lines(c.refs).map(s => `<tr><td colspan="3">${esc(s)}</td></tr>`).join('') || rows(1, [1, 2, 3])}</table>
      <table ${T}><tr>${line('مدة الإخطار قبل ترك العمل الحالي', c.noticePeriod, 30)}</tr></table>
      <p>توقيع المتقدم: ____________________ &nbsp;&nbsp; التاريخ: ____/____/______</p>
      <div style="border:2px solid #222;padding:6px;margin-top:8px"><b>For Company Use Only — لا يظهر للمتقدم</b>
        <div style="display:flex;gap:10px"><table ${T}><tr style="background:#f6f6f6"><th colspan="2">HR Feedback</th></tr>${crit('hr', [['pastExp', 'Past EXP'], ['why', 'Why'], ['strength', 'Strength'], ['weakness', 'Weakness'], ['future', 'Future plans']])}<tr><td>Note</td><td>${!blank && priv ? esc(iv('hr').notes || '') : ''}</td></tr></table>
        <table ${T}><tr style="background:#f6f6f6"><th colspan="2">Technical Feedback</th></tr>${crit('tech', [['performance', 'Performance'], ['behavior', 'Behavior'], ['team', 'Team Dynamic'], ['skills', 'Skills']])}<tr><td>Note</td><td>${!blank && priv ? esc(iv('tech').notes || '') : ''}</td></tr></table></div>
        <div>ملاحظات مقابلة ثالثة: ________________________________________________</div></div>${Fin.letterFoot(co)}</div>`);
  };

  // ================= الإخلاء: الجهات الست بالترتيب + F05 =================
  const AUTH = [['mgr', 'إدارة الموظف / المدير المباشر'], ['it', 'IT (حاسبات واتصالات)'], ['office', 'مدير المكتب'], ['finance', 'المالية / الحسابات (سلف وعهدة مالية)'], ['hr', 'HR (بطاقة وظيفية ومفاتيح)'], ['ceo', 'الإدارة العليا / المدير التنفيذي']];
  const AST = { pending: ['Pending', 'warn'], clear: ['Clear ✓', 'good'], notclear: ['Not Clear', 'bad'] };
  const authOf = cy => { cy.auth = cy.auth || {}; AUTH.forEach(([k]) => { cy.auth[k] = cy.auth[k] || { status: 'pending' }; }); return cy.auth; };
  // اعتماد IT مقفول طول ما فيه عهدة أو إيميل نشط أو بند IT مفتوح
  const itBlock = cy => { const why = []; const cus = X.custody(cy.empId).filter(x => x.group === 'asset'); if (cus.length) why.push('عهدة لسه معاه: ' + cus.map(x => x.code).join('، '));
    const mb = (DB.mailboxes || []).filter(b => b.holderId === cy.empId && b.status === 'active'); if (mb.length) why.push('إيميل نشط: ' + mb.map(b => b.address).join('، '));
    const it = cy.items.filter(i => /IT/.test(i.owner) && !i.done && i.stage <= 4); if (it.length) why.push(it.length + ' بند IT مفتوح'); return why; };
  const paperState = cy => { const a = authOf(cy); if (cy.hrVerifiedAt) return 'HR Verified'; if (cy.signedCopy) return 'Signed Copy Uploaded'; if (a.it.status === 'clear') return AUTH.every(([k]) => a[k].status === 'clear') ? 'Signatures Complete' : 'Ready for Print · Signatures Pending'; return 'IT Pending'; };
  Fin.printClearance = function (cy) {
    const s = X.staff(cy.empId), a = authOf(cy), priv = isHR(), T = 'style="width:100%;border-collapse:collapse;margin:6px 0" border="1" cellpadding="6"';
    const back = cy.items.filter(i => ['recvAsset', 'recvLine'].includes(i.key));
    UI.print(`<div dir="rtl" style="font-family:Cairo,Tahoma;font-size:12.5px">${Fin.letterhead(s.company, 'نموذج إخلاء طرف', 'Clearance Form — F05')}
      <table ${T}><tr><td style="background:#f6f6f6;width:16%"><b>الاسم</b></td><td>${esc(s.name || '')}</td><td style="background:#f6f6f6;width:16%"><b>الرقم الوظيفي</b></td><td dir="ltr">${esc(s.empNo || '')}</td></tr>
      <tr><td style="background:#f6f6f6"><b>الإدارة / القسم</b></td><td>${esc(s.dept || '')}</td><td style="background:#f6f6f6"><b>المسمى</b></td><td>${esc(s.role || '')}</td></tr>
      <tr><td style="background:#f6f6f6"><b>الرقم القومي</b></td><td dir="ltr">${priv ? esc(s.nationalId || '') : ''}</td><td style="background:#f6f6f6"><b>سبب الإخلاء</b></td><td>${esc(cy.reason || '')} · آخر يوم: ${esc(cy.date || '')}</td></tr></table>
      <table ${T}><tr style="background:#f6f6f6"><th>#</th><th>الجهة</th><th>اسم المسؤول</th><th>التوقيع</th><th>التاريخ</th><th>Clear</th><th>Not Clear / السبب</th></tr>
      ${AUTH.map(([k, l], i) => { const x = a[k]; return `<tr><td>${i + 1}</td><td>${l}</td><td>${esc(x.by || '')}</td><td style="width:14%"></td><td>${esc(x.at || '')}</td><td style="text-align:center">${x.status === 'clear' ? '☑' : '☐'}</td><td>${x.status === 'notclear' ? '☑ ' + esc(x.note || '') : '☐'}</td></tr>`; }).join('')}</table>
      ${back.length ? `<b>عهد IT المستلمة</b><table ${T}><tr style="background:#f6f6f6"><th>الكود</th><th>البند</th><th>الحالة عند الاستلام</th><th>التاريخ</th></tr>${back.map(i => `<tr><td dir="ltr">${esc(i.ref)}</td><td>${esc(i.label)}</td><td>${esc(i.condition || (i.done ? 'اتسلم' : 'لسه'))}</td><td>${esc(i.at || i.doneAt || '')}</td></tr>`).join('')}</table>` : ''}
      <p style="font-size:11px;color:#555">اعتماد IT الإلكتروني يثبت الجزء التقني بس، ومش بيسوّي باقي الجهات. الإخلاء مش بيتقفل نهائي بمجرد الطباعة — لازم النسخة الموقعة تترفع وHR تتحقق.</p>${Fin.letterFoot(s.company)}</div>`);
    if (!cy.printedAt) { cy.printedAt = today(); C.upsert('cycles', cy, 'طباعة إخلاء'); }
  };
  function setAuth(cy, k) {
    const a = authOf(cy), i = AUTH.findIndex(x => x[0] === k), prev = AUTH.slice(0, i).find(([pk]) => a[pk].status !== 'clear');
    if (prev) return UI.toast('بالترتيب: لازم «' + prev[1] + '» تبقى Clear الأول', 'warn');
    if (k === 'it') { const why = itBlock(cy); if (why.length) return UI.toast('اعتماد IT مقفول: ' + why.join(' · '), 'err'); }
    const x = a[k];
    UI.modal({ title: AUTH[i][1] + ' — ' + X.nm(cy.empId), saveLabel: 'تسجيل', body: `<div class="grid2">${UI.field({ label: 'الحالة', name: 'status', type: 'select', options: Object.entries(AST).map(([v, l]) => ({ value: v, label: l[0] })), value: x.status })}${UI.field({ label: 'اسم المسؤول', name: 'by', value: x.by || me() })}${UI.field({ label: 'التاريخ', name: 'at', type: 'date', value: x.at || today() })}${UI.field({ label: 'سبب Not Clear / ملاحظات', name: 'note', value: x.note || '', full: true })}</div>`,
      onSave: m => { const d = UI.form(m.el); if (d.status === 'notclear' && !d.note) throw new Error('اكتب سبب Not Clear');
        a[k] = { status: d.status, by: d.by, at: d.at, note: d.note, recordedBy: me(), recordedAt: new Date().toISOString() };
        // لو جهة رجعت Pending/Not Clear ← اللي بعدها يرجع Pending (الترتيب)
        if (d.status !== 'clear') AUTH.slice(i + 1).forEach(([nk]) => { if (a[nk].status === 'clear') a[nk] = { status: 'pending' }; });
        C.upsert('cycles', cy, 'جهة إخلاء'); X.event(cy.no + ': ' + AUTH[i][1] + ' ← ' + AST[d.status][0], { ref: cy.no, empId: cy.empId, cycleId: cy.id }); render(); } });
  }

  // ================= التعيين: مهام IT تنفيذ ← دليل ← اعتماد =================
  const taskState = i => !i.done ? ['لم يُنفّذ', 'muted'] : i.skipped ? ['متخطي', 'muted'] : !i.evidence ? ['منفّذ · مستني دليل', 'warn'] : !i.approved ? ['مستني اعتماد', 'info'] : ['معتمد ✓', 'good'];
  const pendingApprovals = cy => cy.items.filter(i => i.stage === 5 && i.done && !i.skipped && !i.approved);

  const baseCycle = P.cycle;
  if (baseCycle) P.cycle = function (el, id) {
    baseCycle(el, id);
    const cy = C.find('cycles', id); if (!cy) return;
    const grid = el.querySelector('.cyc-grid');
    if (cy.type === 'offboard') {
      const a = authOf(cy), why = itBlock(cy), ps = paperState(cy);
      grid.insertAdjacentHTML('beforebegin', `<div class="panel"><div class="panel-head"><div><h2>✍ جهات الإخلاء الست (بالترتيب)</h2><p class="muted small">الحالة الورقية: <b>${esc(ps)}</b> — HR تقدر تطبع النموذج بعد اعتماد IT حتى قبل توقيعها.</p></div>
        <div class="actions"><button class="btn" data-f5="print" ${a.it.status !== 'clear' ? 'title="بعد اعتماد IT"' : ''}>🖨 نموذج إخلاء الطرف F05</button>${isHR() ? `<button class="btn" data-f5="signed">📎 النسخة الموقعة${cy.signedCopy ? ' ✓' : ''}</button>${cy.signedCopy && !cy.hrVerifiedAt ? '<button class="btn primary" data-f5="verify">✔ تحقق HR</button>' : ''}` : ''}</div></div>
        <table class="tbl compact"><tbody>${AUTH.map(([k, l], i) => { const x = a[k]; return `<tr><td>${i + 1}</td><td><b>${l}</b>${k === 'it' && why.length && x.status !== 'clear' ? `<div class="t-bad small">🔒 ${esc(why.join(' · '))}</div>` : ''}</td><td><span class="badge b-${AST[x.status][1]}">${AST[x.status][0]}</span></td><td class="small">${esc(x.by || '')} ${esc(x.at || '')}${x.note ? '<div class="muted">' + esc(x.note) + '</div>' : ''}</td><td>${cy.status === 'open' ? `<button class="link" data-auth="${k}">تسجيل</button>` : ''}</td></tr>`; }).join('')}</tbody></table>
        ${cy.signedCopy ? `<p class="small">📎 <a href="${esc(cy.signedCopy.link)}" target="_blank" rel="noopener">النسخة الموقعة</a> · ${esc(cy.signedCopy.by || '')} ${esc(cy.signedCopy.at || '')}${cy.hrVerifiedAt ? ' · <b class="t-good">HR Verified ' + esc(cy.hrVerifiedAt) + '</b>' : ''}</p>` : ''}</div>`);
    } else {
      const t5 = cy.items.filter(i => i.stage === 5);
      if (t5.length) grid.insertAdjacentHTML('beforebegin', `<div class="panel"><div class="panel-head"><div><h2>🧰 مهام IT (مرحلة 5): تنفيذ ← دليل ← اعتماد</h2><p class="muted small">التفعيل (8) مقفول لحد ما كل مهمة تتعتمد. المعتمد غير المنفّذ.</p></div></div>
        <table class="tbl compact"><tbody>${t5.map(i => { const s = taskState(i); return `<tr><td><b>${esc(i.label)}</b><div class="muted small">${i.done ? 'نفّذها ' + esc(i.by || '') + ' ' + esc(i.doneAt || '') : ''}</div></td><td><span class="badge b-${s[1]}">${s[0]}</span>${i.evidence ? `<div class="small">${i.evidence.link ? `<a href="${esc(i.evidence.link)}" target="_blank" rel="noopener">📎 الدليل</a> ` : ''}${esc(i.evidence.note || '')}</div>` : ''}${i.approved ? `<div class="small muted">اعتمدها ${esc(i.approved.by)} ${esc(i.approved.at)}</div>` : ''}</td>
          <td>${i.done && !i.skipped && !i.approved ? `<button class="link" data-ev5="${i.id}">📎 دليل</button>` : ''}${i.done && i.evidence && !i.approved ? ` <button class="link" data-ap5="${i.id}">✔ اعتماد</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`);
    }
    capture(el, 'p8', e => {
      const t = e.target;
      const au = t.closest('[data-auth]'); if (au) { stop(e); return setAuth(cy, au.dataset.auth); }
      const f5 = t.closest('[data-f5]');
      if (f5) { stop(e); const k = f5.dataset.f5;
        if (k === 'print') { if (authOf(cy).it.status !== 'clear') return UI.toast('النموذج بيتطبع بعد اعتماد IT', 'warn'); return Fin.printClearance(cy); }
        if (k === 'signed') return UI.modal({ title: '📎 النسخة الموقعة من إخلاء الطرف', saveLabel: 'حفظ', body: `${UI.field({ label: 'رابط الملف على Google Drive (صورة أو PDF)', name: 'link', value: (cy.signedCopy || {}).link || '', attrs: 'dir="ltr"' })}<p class="muted small">الملف نفسه على Drive (الشركة ← القسم ← الموظف ← Clearance) — النظام بيحفظ الرابط بس.</p>`,
          onSave: m => { const d = UI.form(m.el); if (!/^https?:\/\//i.test(d.link || '')) throw new Error('حط رابط الملف'); cy.signedCopy = { link: d.link, by: me(), at: today() }; delete cy.hrVerifiedAt; C.upsert('cycles', cy, 'نسخة موقعة'); X.event(cy.no + ': اترفعت النسخة الموقعة', { ref: cy.no, empId: cy.empId, cycleId: cy.id }); render(); } });
        if (k === 'verify') { if (!AUTH.every(([ak]) => authOf(cy)[ak].status === 'clear')) return UI.toast('لسه فيه جهات مش Clear', 'err'); cy.hrVerifiedAt = today(); cy.hrVerifiedBy = me(); C.upsert('cycles', cy, 'تحقق HR'); X.event(cy.no + ': HR Verified', { ref: cy.no, empId: cy.empId, cycleId: cy.id }); return render(); }
      }
      // إغلاق الإخلاء: مش بمجرد الطباعة — الجهات الست + النسخة الموقعة + تحقق HR
      if (t.closest('[data-close]') && cy.type === 'offboard') { const a = authOf(cy), miss = AUTH.filter(([k]) => a[k].status !== 'clear').map(x => x[1]);
        if (miss.length || !cy.signedCopy || !cy.hrVerifiedAt) { stop(e); return UI.toast('الإغلاق النهائي محتاج: ' + [miss.length ? 'Clear من ' + miss.join('، ') : '', !cy.signedCopy ? 'النسخة الموقعة' : '', !cy.hrVerifiedAt ? 'تحقق HR' : ''].filter(Boolean).join(' · '), 'err'); } }
      const ev = t.closest('[data-ev5]'); if (ev) { stop(e); const i = cy.items.find(x => x.id === ev.dataset.ev5);
        return UI.modal({ title: '📎 دليل التنفيذ — ' + i.label, saveLabel: 'حفظ', body: `${UI.field({ label: 'رابط الدليل (صورة/سكرين على Drive)', name: 'link', value: (i.evidence || {}).link || '', attrs: 'dir="ltr"' })}${UI.field({ label: 'وصف الدليل', name: 'note', value: (i.evidence || {}).note || '', placeholder: 'مثال: الإيميل اتعمل وده سكرين لوحة الإدارة' })}`,
          onSave: m => { const d = UI.form(m.el); if (!d.link && !d.note) throw new Error('حط رابط أو وصف'); i.evidence = { link: d.link, note: d.note, by: me(), at: today() }; C.upsert('cycles', cy, 'دليل مهمة'); render(); } }); }
      const ap = t.closest('[data-ap5]'); if (ap) { stop(e); const i = cy.items.find(x => x.id === ap.dataset.ap5);
        if (i.by === me() && !(X.role() === 'admin' && confirm('انت اللي نفّذت المهمة — الاعتماد المفروض من حد تاني. تعتمدها برضه (مدير النظام)؟'))) return UI.toast('الاعتماد لازم من غير اللي نفّذ', 'warn');
        i.approved = { by: me(), at: today() }; C.upsert('cycles', cy, 'اعتماد مهمة'); X.event(cy.no + ': اتعتمدت «' + i.label + '»', { ref: cy.no, empId: cy.empId, cycleId: cy.id }); return render(); }
      // التفعيل مقفول قبل اعتماد مهام IT
      const dd = t.closest('[data-do]'); if (dd && cy.type === 'onboard') { const it = cy.items.find(x => x.id === dd.dataset.do); if (it && it.key === 'activate') { const p = pendingApprovals(cy); if (p.length) { stop(e); return UI.toast('التفعيل مستني اعتماد: ' + p.map(x => x.label).join('، '), 'err'); } } }
    });
  };

  // F01 من صفحة المرشح والمرشحين
  const baseCand = P.cand;
  if (baseCand) P.cand = function (el, id) {
    baseCand(el, id); const c = DB.candidates.find(x => x.id === id); if (!c) return;
    const a = el.querySelector('.page-head .actions'); if (a) a.insertAdjacentHTML('afterbegin', '<button class="btn ghost" data-f01>🖨 استمارة التقديم F01</button>');
    capture(el, 'f01', e => { if (e.target.closest('[data-f01]')) { stop(e); Fin.printApplication(c); } });
  };
  const baseCands = P.cands;
  if (baseCands) P.cands = function (el) {
    baseCands(el); const a = el.querySelector('.page-head .actions'); if (a) a.insertAdjacentHTML('afterbegin', '<button class="btn ghost" data-f01b>🖨 استمارة فاضية</button>');
    capture(el, 'f01b', e => { if (e.target.closest('[data-f01b]')) { stop(e); Fin.printApplication(null); } });
  };

  // ================= سجل تدقيق مربوط بالـ hash =================
  // الربط بيحصل وقت الحفظ: أي عمليات جديدة (من غير hash) في أول السجل بتتربط من الأقدم للأحدث
  const chain = () => { const A = DB.audit || []; let i = 0; while (i < A.length && !A[i].h) i++;
    for (let j = i - 1; j >= 0; j--) { const e = A[j], prev = A[j + 1]; e.by = e.by || me(); e.prev = prev ? prev.h || '' : ''; e.h = sha256(e.prev + '|' + e.at + '|' + e.action + '|' + e.entity + '|' + e.ref + '|' + (e.detail || '') + '|' + e.by); } };
  const baseSave = global.Store.save;
  global.Store.save = function () { try { chain(); } catch (e) { console.error(e); } return baseSave.apply(this, arguments); };
  Fin.verifyAudit = function () {
    const L = (DB.audit || []).slice().reverse(); let ok = 0, bad = null, legacy = 0;
    for (let i = 0; i < L.length; i++) { const e = L[i]; if (!e.h) { legacy++; continue; }
      const prevH = i && L[i - 1].h ? L[i - 1].h : ''; const h = sha256((e.prev || '') + '|' + e.at + '|' + e.action + '|' + e.entity + '|' + e.ref + '|' + (e.detail || '') + '|' + (e.by || ''));
      if (h !== e.h || (L[i - 1] && L[i - 1].h && e.prev !== prevH)) { bad = e; break; } ok++; }
    return { ok, bad, legacy };
  };
  const baseLog = P.itlog;
  if (baseLog) P.itlog = function (el) {
    baseLog(el);
    el.insertAdjacentHTML('beforeend', `<div class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>🔐 سجل التدقيق (مربوط بالـ hash)</h2><p class="muted small">كل عملية حفظ/تعديل/حذف/دخول مربوطة بالـ hash بتاع اللي قبلها — أي تعديل يدوي في السجل بيتكشف.</p></div><button class="btn" data-av>تحقق من سلامة السجل</button></div>
      ${UI.table({ rows: (DB.audit || []).slice(0, 60), empty: '—', columns: [{ label: 'الوقت', render: e => esc(X.time(e.at)) }, { label: 'العملية', render: e => esc(e.action) }, { label: 'البيان', render: e => esc(e.entity) + (e.ref ? ` <span class="muted small" dir="ltr">${esc(e.ref)}</span>` : '') }, { label: 'بواسطة', render: e => esc(e.by || '') }, { label: 'hash', render: e => e.h ? `<span class="mono small muted" dir="ltr">${e.h.slice(0, 10)}…</span>` : '<span class="muted small">قبل التفعيل</span>' }] })}</div>`);
    capture(el, 'av', e => { if (!e.target.closest('[data-av]')) return; stop(e); const r = Fin.verifyAudit(); UI.toast(r.bad ? '✕ السجل اتعدّل عند: ' + r.bad.at + ' · ' + r.bad.entity : '✓ السجل سليم — ' + r.ok + ' عملية مربوطة' + (r.legacy ? ' (+' + r.legacy + ' أقدم من التفعيل)' : ''), r.bad ? 'err' : 'ok'); });
  };

  // ================= نسخة احتياطية + استعادة متحقق منها =================
  const realDownload = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
  Fin.backupNow = function (tag) {
    const data = JSON.stringify(DB), at = new Date().toISOString(), meta = { app: 'ThreePillars-IT', version: 1, at, by: me(), sha256: sha256(data), size: data.length };
    realDownload('TP-IT-backup-' + at.slice(0, 16).replace(/[:T]/g, '-') + (tag ? '-' + tag : '') + '.json', JSON.stringify({ meta, data: JSON.parse(data) }));
    (DB.settings.backups = DB.settings.backups || []).unshift({ at, sha256: meta.sha256, size: meta.size, by: meta.by, tag: tag || '' }); DB.settings.backups.length = Math.min(DB.settings.backups.length, 30);
    C.audit('نسخة احتياطية', 'بيانات النظام', meta.sha256.slice(0, 12)); global.Store.save(); return meta;
  };
  Fin.restoreFrom = function (text) {
    let j; try { j = JSON.parse(text); } catch (e) { throw new Error('الملف مش JSON صالح'); }
    if (!j || !j.meta || !j.data || j.meta.app !== 'ThreePillars-IT') throw new Error('الملف مش نسخة احتياطية من النظام ده');
    const h = sha256(JSON.stringify(j.data)); if (h !== j.meta.sha256) throw new Error('✕ التحقق فشل: الملف اتعدّل أو اتلف (SHA-256 مش مطابق)');
    return j;
  };
  const baseSet = P.itsettings;
  if (baseSet) P.itsettings = function (el) {
    baseSet(el);
    const bl = (DB.settings.backups || []).slice(0, 5);
    el.insertAdjacentHTML('beforeend', `<div class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>💾 نسخة احتياطية من بيانات النظام</h2><p class="muted small">ملف واحد فيه كل بيانات النظام + بصمة SHA-256. الاستعادة بتتحقق من البصمة الأول، وبتاخد نسخة من الحالي قبل ما تستبدل. (الباسوردات بتفضل متشفّرة جوه الملف.)</p></div>
      <div class="actions"><button class="btn primary" data-bk="now">⬇ نسخة دلوقتي</button><label class="btn">⬆ استعادة من ملف<input type="file" accept=".json,application/json" data-bk="file" hidden></label></div></div>
      ${bl.length ? UI.table({ rows: bl, columns: [{ label: 'الوقت', render: b => esc(X.time(b.at)) }, { label: 'الحجم', render: b => Math.round(b.size / 1024) + ' KB' }, { label: 'SHA-256', render: b => `<span class="mono small" dir="ltr">${esc(b.sha256.slice(0, 16))}…</span>` }, { label: 'بواسطة', render: b => esc(b.by || '') }] }) : '<p class="muted">لسه مفيش نسخ</p>'}</div>`);
    capture(el, 'bk', e => { const b = e.target.closest('[data-bk="now"]'); if (b) { stop(e); const m = Fin.backupNow(); UI.toast('اتعملت نسخة · ' + m.sha256.slice(0, 12)); render(); } });
    const inp = el.querySelector('[data-bk="file"]');
    if (inp) inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
      try { const j = Fin.restoreFrom(r.result); if (!confirm('✓ البصمة سليمة — نسخة ' + j.meta.at + ' (' + (j.data.assets || []).length + ' جهاز).\nهتتعمل نسخة من البيانات الحالية الأول، وبعدين الاستعادة. نكمل؟')) return;
        Fin.backupNow('before-restore'); setTimeout(() => { global.Store.replace(j.data); C.audit('استعادة', 'بيانات النظام', j.meta.sha256.slice(0, 12)); global.Store.save(); UI.toast('اتعملت الاستعادة — بيعيد التحميل'); setTimeout(() => location.reload(), 900); }, 600);
      } catch (er) { UI.toast(er.message, 'err'); } }; r.readAsText(f); };
  };

  // ================= التحقق بخطوتين (MFA) من صفحة المستخدمين =================
  const qr = text => { if (typeof global.qrcode !== 'function') return ''; const q = global.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); };
  function enrollMfa(u) {
    const sec = global.Auth.newSecret(), uri = 'otpauth://totp/' + encodeURIComponent('Three Pillars IT:' + u.email) + '?secret=' + sec + '&issuer=' + encodeURIComponent('Three Pillars IT');
    UI.modal({ title: '🔐 تفعيل التحقق بخطوتين — ' + u.name, saveLabel: 'تفعيل', body: `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="width:180px">${qr(uri)}</div><div><p>1) افتح Google Authenticator أو Microsoft Authenticator وامسح الكود.</p><p class="small">أو اكتب المفتاح يدوي: <b class="mono" dir="ltr">${sec.replace(/(.{4})/g, '$1 ')}</b></p><p>2) اكتب الـ 6 أرقام اللي ظاهرين:</p>${UI.field({ label: 'الكود', name: 'code', attrs: 'dir="ltr" inputmode="numeric" maxlength="6"' })}</div></div>`,
      onSave: m => { const code = UI.form(m.el).code; global.Auth.totpVerify(sec, code).then(st => { if (!st) return UI.toast('الكود غلط — جرّب تاني', 'err'); u.mfaSecret = sec; u.mfaLastStep = st; u.mfaAt = today(); C.audit('تفعيل MFA', 'مستخدم', u.email); global.Store.save(); m.close(); UI.toast('✓ اتفعّل التحقق بخطوتين'); render(); }); return false; } });
  }
  const baseUsers = P.users;
  if (baseUsers) P.users = function (el) {
    baseUsers(el); const meU = X.me(), admin = X.role() === 'admin';
    el.querySelector('.page-head').insertAdjacentHTML('afterend', `<div class="panel"><div class="panel-head"><div><h2>🔐 التحقق بخطوتين (MFA)</h2><p class="muted small">بعد التفعيل الدخول محتاج الباسورد + كود من الموبايل. الكود مش بيتقبل مرتين. المدير يقدر يلغيه لو حد ضيّع موبايله.</p></div>${meU.mfaSecret ? '<span class="badge b-good">✓ مفعّل عندك</span>' : '<button class="btn primary" data-mfa="me">تفعيل لحسابي</button>'}</div>
      ${UI.table({ rows: (DB.users || []).filter(u => u.role !== 'client'), columns: [{ label: 'المستخدم', render: u => esc(u.name) + ` <span class="muted small" dir="ltr">${esc(u.email)}</span>` }, { label: 'MFA', render: u => u.mfaSecret ? `<span class="badge b-good">مفعّل ${esc(u.mfaAt || '')}</span>` : '<span class="badge b-muted">مش مفعّل</span>' }, { label: '', render: u => u.mfaSecret && (admin || u.id === meU.id) ? `<button class="link danger" data-mfa="off" data-id="${u.id}">إلغاء</button>` : '' }] })}</div>`);
    capture(el, 'mfa', e => { const b = e.target.closest('[data-mfa]'); if (!b) return; stop(e);
      if (b.dataset.mfa === 'me') return enrollMfa((DB.users || []).find(u => u.id === meU.id));
      if (b.dataset.mfa === 'off') { const u = DB.users.find(x => x.id === b.dataset.id); if (!confirm('إلغاء التحقق بخطوتين لـ ' + u.name + '؟')) return; delete u.mfaSecret; delete u.mfaLastStep; C.audit('إلغاء MFA', 'مستخدم', u.email); global.Store.save(); render(); } });
  };

  // ================= مركز التقارير (13 تقرير) =================
  const inRange = (d, s) => !d || ((!s.from || d >= s.from) && (!s.to || d <= s.to + 'z'));
  const col = (label, f) => ({ label, render: r => esc(f(r) == null ? '' : f(r)), text: f });
  const nm = id => X.nm(id);
  Fin.REPORTS = [
    { k: 'assets.register', g: 'الأصول', t: 'الأجهزة حسب القسم والفئة والحالة', rows: s => DB.assets.filter(a => !['retired', 'lost'].includes(a.status)), cols: [col('الكود', a => a.tag), col('الفئة', a => X.catCode(a)), col('الفرع', a => X.companyOf(a)), col('القسم', a => X.deptOf(a)), col('الحالة', a => X.sheetStatusOf(a)), col('الحالة الفنية', a => X.techCond(a)), col('الموظف', a => nm(a.holderId)), col('السيريال', a => a.serial)] },
    { k: 'assets.custody', g: 'الأصول', t: 'حركات العهد (تسليم / استرجاع / حجز)', date: true, rows: s => (DB.assetLog || []).filter(l => ['assign', 'return', 'reserve'].includes(l.kind) && inRange(l.date, s)), cols: [col('التاريخ', l => l.date), col('الحركة', l => (Fin.LOGK || {})[l.kind] || l.kind), col('الجهاز', l => ((DB.assets.find(a => a.id === l.assetId) || DB.lines.find(x => x.id === l.assetId)) || {}).tag || ''), col('الموظف', l => nm(l.holderId)), col('ملاحظة', l => l.note)] },
    { k: 'assets.maintenance', g: 'الأصول', t: 'الصيانات', date: true, rows: s => (DB.assetLog || []).filter(l => ['repair', 'repairDone'].includes(l.kind) && inRange(l.date, s)), cols: [col('التاريخ', l => l.date), col('الحركة', l => (Fin.LOGK || {})[l.kind] || l.kind), col('الجهاز', l => (DB.assets.find(a => a.id === l.assetId) || {}).tag || ''), col('المورد', l => l.vendor), col('التكلفة', l => l.cost)] },
    { k: 'assets.warranty', g: 'الأصول', t: 'الضمانات المنتهية والقريبة من الانتهاء', rows: () => DB.assets.filter(a => a.warrantyEnd && X.days(a.warrantyEnd) <= 60), cols: [col('الكود', a => a.tag), col('الجهاز', a => Fin.assetName(a)), col('نهاية الضمان', a => a.warrantyEnd), col('المتبقي', a => X.inDays(X.days(a.warrantyEnd)))] },
    { k: 'technical.subscriptions', g: 'الخدمات التقنية', t: 'الاشتراكات والتراخيص — الاستحقاق والرصيد', rows: () => (DB.subscriptions || []).concat(DB.tools || []), cols: [col('الكود', x => x.code), col('الاسم', x => x.name), col('التجديد', x => x.renewalDate), col('المستخدمين', x => (x.users || []).length), col('التكلفة', x => x.cost), col('العملة', x => x.currency)] },
    { k: 'journey.hires', g: 'رحلة الموظف', t: 'المعيّنون خلال الفترة', date: true, rows: s => (DB.cycles || []).filter(c => c.type === 'onboard' && c.status === 'done' && inRange(c.doneAt || c.date, s)), cols: [col('الرقم', c => c.no), col('الموظف', c => nm(c.empId)), col('القسم', c => X.staff(c.empId).dept), col('المباشرة', c => c.date), col('التفعيل', c => c.doneAt)] },
    { k: 'journey.applications', g: 'رحلة الموظف', t: 'التقديم والمقابلات حسب المرحلة', date: true, rows: s => (DB.candidates || []).filter(c => inRange(c.appliedAt, s)), cols: [col('Candidate ID', c => c.no), col('الاسم', c => c.name), col('الوظيفة', c => c.jobTitle), col('المصدر', c => c.source), col('الحالة', c => (X.CSTATUS[c.status] || [''])[0]), col('القرار', c => (c.decision || {}).result)] },
    { k: 'journey.offboarding', g: 'رحلة الموظف', t: 'إخلاءات الفترة', date: true, rows: s => (DB.cycles || []).filter(c => c.type === 'offboard' && inRange(c.date, s)), cols: [col('الرقم', c => c.no), col('الموظف', c => nm(c.empId)), col('السبب', c => c.reason), col('آخر يوم', c => c.date), col('الحالة الورقية', c => paperState(c)), col('الحالة', c => c.status === 'closed' ? 'Exited' : 'مفتوح')] },
    { k: 'technical.renewals', g: 'الخدمات التقنية', t: 'عدد مرات التجديد لكل خدمة', date: true, rows: s => { const m = {}; (DB.renewalEvents || []).filter(e => inRange(e.paidAt, s)).forEach(e => { const k2 = e.code || e.refId; m[k2] = m[k2] || { code: k2, kind: e.kind, n: 0, sum: 0, last: '' }; m[k2].n++; m[k2].sum += U.num(e.amount); if (e.paidAt > m[k2].last) m[k2].last = e.paidAt; }); return Object.values(m); }, cols: [col('الكود', r => r.code), col('النوع', r => r.kind), col('عدد مرات التجديد', r => r.n), col('إجمالي المدفوع', r => r.sum), col('آخر تجديد', r => r.last)] },
    { k: 'technical.usage', g: 'الخدمات التقنية', t: 'رصيد الباقات والتوكنز عبر الفترة', date: true, rows: s => (DB.usageSnapshots || []).filter(x => inRange(x.date, s)), cols: [col('التاريخ', x => x.date), col('الكود', x => ((DB.netPackages || []).concat(DB.tools || []).find(r => r.id === x.refId) || {}).code), col('المستخدم', x => x.used), col('المصدر', x => x.source)] },
    { k: 'technical.backups', g: 'الخدمات التقنية', t: 'تأكيدات النسخ الاحتياطي', date: true, rows: s => (DB.backupLog || []).filter(b => inRange(b.date, s)), cols: [col('التاريخ', b => b.date), col('الشريحة', b => b.code), col('إيميل الباك أب', b => b.email), col('بواسطة', b => b.by), col('ملاحظة', b => b.note)] },
    { k: 'finance.spend', g: 'المالية', t: 'مصروف IT (مدفوع / مفوتر / متوقع)', rows: () => { const st = Fin.finStages ? Fin.finStages() : {}; return [['متوقع', st.forecast], ['ملتزم', st.committed], ['مفوتر', st.invoiced], ['مدفوع', st.paid], ['مستحق', st.due]].map(([k2, v]) => ({ k: k2, v: U.round(v || 0) })); }, cols: [col('البند', r => r.k), col('المبلغ (العملة الأساسية)', r => r.v)] },
    { k: 'finance.purchases', g: 'المالية', t: 'مسار طلبات الشراء', date: true, rows: s => (DB.purchaseRequests || []).filter(p => inRange(p.date, s)), cols: [col('الكود', p => p.code), col('التاريخ', p => p.date), col('القسم', p => p.dept), col('المورد', p => p.supplier), col('الإجمالي', p => U.sum(p.items || [], i => U.num(i.qty) * U.num(i.unitCost))), col('الحالة', p => p.status), col('الموافقة', p => (p.approval || {}).ref)] },
  ];
  P.reports = function (el) {
    const s = P.reports._s = P.reports._s || { from: '', to: '' };
    const groups = [...new Set(Fin.REPORTS.map(r => r.g))];
    el.innerHTML = `<div class="page-head"><div><h1>📊 مركز التقارير</h1><p class="sub">${Fin.REPORTS.length} تقرير جاهز — كل تقرير بيفتح "تجهيز تقرير" (اختيار الأعمدة والتجميع ← طباعة/PDF أو Excel)</p></div></div>
      <div class="toolbar"><label class="mini">من <input type="date" data-r="from" value="${esc(s.from)}"></label><label class="mini">إلى <input type="date" data-r="to" value="${esc(s.to)}"></label><span class="muted small">الفترة بتتطبق على التقارير اللي ليها تاريخ (📅)</span></div>
      <div class="tri-grid">${groups.map(g => `<div class="panel"><h2>${esc(g)}</h2>${Fin.REPORTS.filter(r => r.g === g).map(r => `<div class="row-line"><span>${r.date ? '📅 ' : ''}${esc(r.t)} <small class="muted">(${r.rows(s).length})</small></span><button class="btn sm" data-rep="${r.k}">تجهيز</button></div>`).join('')}</div>`).join('')}</div>`;
    el.onchange = e => { const i = e.target.closest('[data-r]'); if (i) { s[i.dataset.r] = i.value; render(); } };
    el.onclick = e => { const b = e.target.closest('[data-rep]'); if (!b) return; const r = Fin.REPORTS.find(x => x.k === b.dataset.rep);
      UI.reportBuilder({ title: r.t, columns: r.cols, csvName: r.k, filters: r.date && (s.from || s.to) ? [{ key: 'per', label: 'الفترة', options: [] }] : [] }, r.rows(s), { q: '', per: r.date && (s.from || s.to) ? (s.from || '…') + ' ← ' + (s.to || '…') : '' }, el); };
  };
})(window);
