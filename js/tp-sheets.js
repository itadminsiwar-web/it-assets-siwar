/* =========================================================
   tp-sheets.js — ربط شيتات Three Pillars بالسيستم
   • شيت الإيميلات: أي إيميل جديد في الشيت ← يظهر في "الإيميلات والحسابات" (من غير الباسوردات خالص)
     وصاحب الإيميل لو اسم جديد ← يتضاف للموظفين بكود Siw-EMP جديد (ومحمي من المسح)
   • استمارة التقديم (Google Form بالـ QR): كل رد جديد ← مرشح جديد في "التوظيف والمقابلات"
   • خطوط اتشالت (مش بتاعتنا) ← ميرجعوش تاني من شيت WE أو الإضافة
   كله بيشتغل مع المزامنة، ومن غير نت النظام شغال عادي (بيكمل لما النت يرجع)
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, X = global.ITX;
  const S = () => X.settings();
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const key = s => norm(s).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

  // ---------- خطوط مش بتاعتنا ----------
  const IGN = () => { const it = DB.itSettings = DB.itSettings || {}; if (!it.netIgnore) it.netIgnore = { numbers: ['0502365818'], codes: [] }; return it.netIgnore; };
  const digits = v => String(v || '').replace(/\D/g, '').replace(/^20/, '0');
  X.netIgnored = (code, r) => { const g = IGN(), nums = [r && r.account, r && r.number, r && r.name, code].map(digits).filter(Boolean); return g.codes.includes(String(code || '').toUpperCase()) || nums.some(n => g.numbers.some(x => n.endsWith(digits(x)))); };
  function purgeNets() {
    const g = IGN(), gone = (DB.netPackages || []).filter(x => X.netIgnored(x.code, x)); if (!gone.length) return 0;
    const ids = new Set(gone.map(x => x.id)); gone.forEach(x => { if (x.code && !g.codes.includes(x.code.toUpperCase())) g.codes.push(x.code.toUpperCase()); });
    DB.netPackages = DB.netPackages.filter(x => !ids.has(x.id)); DB.usageSnapshots = (DB.usageSnapshots || []).filter(s => !ids.has(s.refId));
    global.Store.save(); return gone.length;
  }

  // ---------- الموظف من الاسم (جديد ← كود Siw-EMP التالي) ----------
  function staffByName(name, dept, src) {
    const n = norm(name); if (!n) return null;
    let m = (DB.team || []).find(t => key(t.name) === key(n) || (t.aka || []).some(a => key(a) === key(n)));
    if (!m) {
      const max = Math.max(0, ...(DB.team || []).map(t => +((String(t.empNo || '').match(/EMP-(\d+)$/i) || [])[1] || 0)));
      const pfx = ((DB.team || []).map(t => t.empNo).find(c => /EMP-\d+$/i.test(c || '')) || 'Siw-EMP-0').replace(/\d+$/, '');
      m = { id: U.uid(), name: n, dept: dept || '', empNo: pfx + String(max + 1).padStart(3, '0'), company: (S().companies || [])[0] ? S().companies[0].name : '', active: true, source: src, createdAt: new Date().toISOString() };
      DB.team.push(m); X.event('👤 موظف جديد من ' + (src === 'mails' ? 'شيت الإيميلات' : 'الشيت') + ': ' + n + ' (' + m.empNo + ')', { kind: 'sync' });
    }
    return m;
  }

  // ---------- شيت الإيميلات (من غير باسوردات) ----------
  const MCOL = {
    address: ['الإيميل', 'الايميل', 'الإيميل الأساسي', 'البريد', 'البريد الإلكتروني', 'email', 'e-mail', 'mail', 'الحساب', 'account'],
    holder: ['اسم الموظف', 'الموظف', 'الاسم', 'صاحب الإيميل', 'employee', 'name', 'owner'],
    dept: ['القسم', 'department', 'dept'], code: ['الكود', 'كود الإيميل', 'code'], provider: ['المزود', 'المزوّد', 'provider'],
    kind: ['النوع', 'type', 'kind'], status: ['الحالة', 'الحاله', 'status'], note: ['ملاحظات', 'ملاحظه', 'notes', 'note'],
  };
  const SECRET_H = /pass|pswd|pwd|باسورد|كلمة ?(السر|المرور)|كلمه|رمز|otp|2fa|recovery/i; // أعمدة الباسوردات بتتجاهل تمامًا
  X.importMailSheet = function (text) {
    const all = X.csv2D(text); if (all.length < 2) return { added: 0, updated: 0, staff: 0 };
    const H = all[0].map(h => String(h).trim()), col = k => H.findIndex(h => !SECRET_H.test(h) && MCOL[k].some(a => a.toLowerCase() === h.toLowerCase()));
    const C = {}; Object.keys(MCOL).forEach(k => { C[k] = col(k); });
    if (C.address < 0) { const i = H.findIndex((h, j) => !SECRET_H.test(h) && all.slice(1, 6).some(r => /@/.test(r[j] || ''))); C.address = i; } // عمود فيه @
    if (C.address < 0) throw new Error('مش لاقي عمود الإيميل في الشيت');
    const st0 = (DB.team || []).length; let added = 0, updated = 0;
    all.slice(1).forEach(r => {
      const v = k => C[k] >= 0 ? norm(r[C[k]]) : '', addr = v('address').toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return;
      let b = DB.mailboxes.find(x => String(x.address || '').toLowerCase() === addr) || (v('code') && DB.mailboxes.find(x => String(x.code || '').toUpperCase() === v('code').toUpperCase()));
      const free = /خال/.test(v('status')); // الصف الأخضر في الشيت = الإيميل خالي (مش مع حد) ← الاسم اللي جنبه مش بيتسجل صاحبه
      const m = v('holder') && !free ? staffByName(v('holder'), v('dept'), 'mails') : null;
      const kind = /مشترك|shared/i.test(v('kind')) ? 'shared' : /خدم|service/i.test(v('kind')) ? 'service' : 'personal';
      const stt = /موقوف|مقفول|suspend|inactive|متوقف/i.test(v('status')) ? 'suspended' : 'active';
      if (!b) {
        b = { id: U.uid(), code: v('code') || X.mailCode(), address: addr, kind, holderId: m ? m.id : '', free, dept: free ? 'IT' : '', provider: v('provider') || (/gmail\.com$/.test(addr) ? 'Gmail' : ''), status: free && stt === 'active' ? 'free' : stt, members: [], note: v('note'), createdAt: U.today(), source: 'mailsheet' };
        DB.mailboxes.push(b); added++; X.event('✉️ إيميل جديد من الشيت: ' + addr + (free ? ' (خالي)' : ''), { kind: 'sync', ref: b.code });
      } else {
        const before = JSON.stringify([b.holderId, b.provider, b.kind, b.status, !!b.free]);
        if (free) { if (b.holderId) X.event('✉️ ' + addr + ' بقى خالي (الصف أخضر في الشيت) — كان مع ' + X.nm(b.holderId), { kind: 'sync', ref: b.code }); b.holderId = ''; b.free = true; b.dept = 'IT'; if (b.status === 'active') b.status = 'free'; }
        else if (b.free || b.status === 'free') { b.free = false; b.dept = ''; if (b.status === 'free') b.status = 'active'; if (m && b.kind !== 'shared') b.holderId = m.id; } else if (m && b.kind !== 'shared') b.holderId = m.id;
        if (v('provider')) b.provider = v('provider'); if (v('kind')) b.kind = kind; if (/موقوف|مقفول|suspend|inactive|متوقف/i.test(v('status'))) b.status = 'suspended';
        if (JSON.stringify([b.holderId, b.provider, b.kind, b.status, !!b.free]) !== before) updated++;
      }
      if (m && !m.email && kind === 'personal') m.email = addr;
    });
    global.Store.save(); return { added, updated, staff: (DB.team || []).length - st0 };
  };

  // ---------- ردود استمارة التقديم (QR) ← المرشحين ----------
  const FCOL = { name: 'الاسم', phone: 'الهاتف', email: 'الإيميل', jobTitle: 'الوظيفة المطلوبة', expectedSalary: 'الراتب المتوقع', birthDate: 'تاريخ الميلاد', gender: 'النوع', military: 'الموقف التجنيدي', marital: 'الحالة الاجتماعية', address: 'العنوان', nationalId: 'الرقم القومي', qualification: 'المؤهل', gradYear: 'سنة التخرج', years: 'سنين الخبرة', noticePeriod: 'مدة الإخطار قبل ترك العمل الحالي' };
  X.importApplications = function (text) {
    const all = X.csv2D(text); if (all.length < 2) return 0;
    const H = all[0].map(h => String(h).trim()), at = H.findIndex(h => /timestamp|الطابع الزمني|طابع زمني/i.test(h)), find = t => H.findIndex(h => h === t || h.startsWith(t));
    let n = 0;
    all.slice(1).forEach(r => {
      const g = t => { const i = find(t); return i >= 0 ? norm(r[i]) : ''; };
      const name = g('الاسم'); if (!name) return;
      const fk = (at >= 0 ? r[at] : '') + '|' + g('الهاتف') + '|' + name;
      if ((DB.candidates || []).some(c => c.formKey === fk)) return;
      const c = { id: U.uid(), no: X.nextCode('CAN'), formKey: fk, source: 'QR Code', status: 'applied', interviews: [], checkpoints: [], appliedAt: U.today(), createdAt: new Date().toISOString() };
      Object.entries(FCOL).forEach(([k, t]) => { const v = g(t); if (v) c[k] = v; });
      if (c.gender) c.gender = /أنث|female/i.test(c.gender) ? 'female' : 'male';
      if (c.military === 'لا ينطبق') c.military = '';
      c.prevJobs = g('الأعمال السابقة'); c.courses = g('الدورات'); c.refs = g('المراجع');
      DB.candidates.push(c); n++;
      X.event('🧑‍💼 طلب توظيف جديد من الـ QR: ' + c.name + ' (' + c.no + ') — ' + (c.jobTitle || ''), { kind: 'sync', ref: c.no });
      if (global.Platform && global.Platform.notify) global.Platform.notify({ to: ['hr', 'admin'], title: '🧑‍💼 طلب توظيف جديد: ' + c.name, link: 'it.html#/cand/' + c.id, icon: '🧑‍💼' });
    });
    if (n) global.Store.save(); return n;
  };

  // ---------- شيت الأرقام (الشرائح السعودية + اللي مع الوكيل) ----------
  const CARRIER = { mobily: 'موبايلي', zain: 'زين', stc: 'STC' };
  X.importNumbersSheet = function (text) {
    const all = X.csv2D(text); if (all.length < 2) return { added: 0, updated: 0 };
    const H = all[0].map(h => String(h).trim()), g = (r, n) => { const i = H.indexOf(n); return i >= 0 ? norm(r[i]) : ''; };
    let added = 0, updated = 0;
    all.slice(1).forEach(r => {
      const code = g(r, 'الكود'), num = g(r, 'الرقم').replace(/\D/g, ''); if (!code || !num) return;
      const number = /^966/.test(num) ? '+' + num : num;
      let l = DB.lines.find(x => String(x.code || '').toUpperCase() === code.toUpperCase()) || DB.lines.find(x => String(x.number || '').replace(/\D/g, '').endsWith(num.slice(-9)));
      const isNew = !l; if (isNew) { l = { id: U.uid(), code, country: 'SA', kind: 'voice', status: 'stock', holderId: '', currency: 'SAR', createdAt: new Date().toISOString(), source: 'numbersheet' }; DB.lines.push(l); }
      const before = JSON.stringify(l), holder = g(r, 'المستلم'), st = g(r, 'الحالة');
      const co = (S().companies || []).find(c => [c.code, c.name].some(v => String(v || '').toLowerCase() === g(r, 'الشركة').toLowerCase()));
      Object.assign(l, { code, number, country: 'SA', company: co ? co.name : g(r, 'الشركة') });
      const car = g(r, 'شركة الاتصالات'); if (car) l.carrier = CARRIER[car.toLowerCase()] || car;
      ['السريال:iccid', 'آخر دفع:lastPaid', 'التجديد القادم:renewDate', 'كود الهاتف:phoneTag', 'إيميل الباك أب:backupEmail', 'ملاحظة:note'].forEach(p => { const [h, k] = p.split(':'), v = g(r, h); if (v) l[k] = v; });
      // المستلم: موظف عندنا ← عهدة معاه · غير كده (الوكيل/حد برّه) ← الاسم بس
      const m = holder && (DB.team || []).find(t => key(t.name) === key(holder) || (t.aka || []).some(a => key(a) === key(holder)));
      if (/وكيل/.test(st)) { l.possession = 'مع الوكيل في السعودية'; if (!m) { l.holderId = ''; l.purpose = holder; if (l.status === 'assigned') l.status = 'stock'; } }
      if (m && /مستخدم/.test(st)) { if (l.holderId !== m.id) { l.holderId = m.id; l.assignedAt = l.assignedAt || U.today(); } l.status = 'assigned'; }
      else if (!m && holder && !/وكيل/.test(st)) { l.purpose = holder; }
      if (isNew) { added++; X.event('📶 شريحة جديدة من شيت الأرقام: ' + code + ' · ' + number, { kind: 'sync', ref: code }); } else if (JSON.stringify(l) !== before) updated++;
    });
    // الشيت هو المرجع: أي شريحة سعودية اتشالت من الشيت ← تتشال من السيستم (بس لو الشيت اتقرا فيه صفوف)
    const codes = new Set(all.slice(1).map(r => g(r, 'الكود').toUpperCase()).filter(Boolean));
    let removed = 0;
    if (codes.size) {
      const gone = DB.lines.filter(l => l.country === 'SA' && !codes.has(String(l.code || '').toUpperCase()));
      const ids = new Set(gone.map(l => l.id)); removed = gone.length;
      if (removed) { DB.lines = DB.lines.filter(l => !ids.has(l.id)); DB.assetLog = (DB.assetLog || []).filter(x => !ids.has(x.assetId)); X.event('📶 اتشال ' + removed + ' شريحة مش موجودة في شيت الأرقام: ' + gone.map(l => l.code).join('، '), { kind: 'sync' }); }
    }
    global.Store.save(); return { added, updated, removed };
  };

  // ---------- شيت مراجعة الباقات (المتبقي يوميًا لكل خط) ----------
  X.importUsageReview = function (text) {
    const all = X.csv2D(text), hi = all.findIndex(r => r.some(c => /^date$/i.test(String(c).trim()))); if (hi < 0) return { added: 0 };
    const H = all[hi].map(h => String(h).trim()), blocks = [];
    H.forEach((h, i) => { if (/^date$/i.test(h)) { const nums = []; for (let j = i + 1; j < H.length && H[j] && !/^date$/i.test(H[j]); j++) nums.push([j, H[j].replace(/\D/g, '')]); blocks.push([i, nums]); } });
    const net = d => (DB.netPackages || []).find(x => String(x.account || x.name || '').replace(/\D/g, '').endsWith(d));
    const iso = s => { const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : ''; };
    // لحد ما ترتيب أعمدة الشيت يتأكد: القراءات بتتحفظ لوحدها (DB.usageReview) ومش بتدخل في حسابات الاستهلاك والتوقع
    if (!(DB.itSettings || {}).usageReviewConfirmed) {
      const rows = [];
      all.slice(hi + 1).forEach(r => blocks.forEach(([di, nums]) => { const dt = iso(r[di]); if (!dt) return; nums.forEach(([ci, d]) => { const raw = String(r[ci] || '').trim(); if (/^\d+(\.\d+)?$/.test(raw)) rows.push({ date: dt, number: d, remaining: +raw }); }); }));
      const before = (DB.usageSnapshots || []).length; DB.usageSnapshots = (DB.usageSnapshots || []).filter(s => s.source !== 'شيت مراجعة الباقات');
      DB.usageReview = rows; global.Store.save(); return { added: rows.length, updated: 0, held: true, removedFromCalc: before - DB.usageSnapshots.length };
    }
    let added = 0; const latest = {};
    all.slice(hi + 1).forEach(r => blocks.forEach(([di, nums]) => {
      const dt = iso(r[di]); if (!dt) return;
      nums.forEach(([ci, d]) => { const raw = String(r[ci] || '').trim(); if (!/^\d+(\.\d+)?$/.test(raw)) return; const x = net(d); if (!x) return;
        const rem = +raw; if (DB.usageSnapshots.some(s => s.refId === x.id && s.date === dt)) return;
        const used = U.num(x.quota) > 0 ? Math.max(0, U.num(x.quota) - rem) : null;
        DB.usageSnapshots.push({ id: U.uid(), refType: 'net', refId: x.id, code: x.code, date: dt, used: used == null ? undefined : used, remaining: rem, source: 'شيت مراجعة الباقات' }); added++;
        if (!latest[x.id] || dt > latest[x.id].dt) latest[x.id] = { dt, used, x }; });
    }));
    // آخر قراءة من الشيت بتبقى الحالية بس لو أحدث من أي قراءة تانية
    Object.values(latest).forEach(({ dt, used, x }) => { const newer = DB.usageSnapshots.some(s => s.refId === x.id && s.date > dt); if (!newer && used != null) x.used = used; });
    if (added) global.Store.save(); return { added, updated: 0 };
  };

  // ---------- الشيتات المربوطة (جاهزة — بتتقري عن طريق سكربت حسابك لأنها خاصة) ----------
  const DEFAULT_LINKS = {
    lines: { id: '1XgwsEt_IP3WK8Us9fq0odAq61_ZhzkOr6zv8BRUokvg', action: 'lines', title: 'الشرائح (شيت الأرقام)' },
    mailboxes: { id: '1IpUJZUPanKRmTlSUvdvIa7C2egTBp52iSC9zPb4W_G8', action: 'mails', title: 'الإيميلات (من غير باسوردات)' },
    usageReview: { id: '1g7Op2kI9i5wXN12bbKaV1ie5Fra_p4OkjfjJ3UUA1og', action: 'read', title: 'مراجعة الباقات' },
  };
  function ensureLinks() {
    const it = DB.itSettings = DB.itSettings || {}, L = (it.pageSheets = it.pageSheets || {}); let ch = false;
    Object.entries(DEFAULT_LINKS).forEach(([k, v]) => { if (!L[k] || (L[k].id === v.id && !L[k].action)) { L[k] = Object.assign({}, L[k] || {}, v, { url: 'https://docs.google.com/spreadsheets/d/' + v.id + '/edit', auto: true }); ch = true; } });
    if (ch) global.Store.save();
  }

  // ---------- مع كل مزامنة ----------
  const script = () => { const t = S().twoWay || {}; return t.url && t.secret ? t : null; };
  const baseSync = X.sync;
  X.sync = async function () {
    const r = await baseSync.apply(this, arguments);
    try { purgeNets(); } catch (e) {}
    const t = script();
    if (t) { // الاستمارة (عن طريق السكربت — شيت الردود مش لازم يبقى عام)
      try { const res = await fetch(t.url + '?action=apps&secret=' + encodeURIComponent(t.secret) + '&t=' + Date.now()); const txt = await res.text(); if (!/^\s*\{/.test(txt)) { const n = X.importApplications(txt); if (r) r.applications = { added: n }; } } catch (e) { /* من غير نت ← المرة الجاية */ }
    }
    return r;
  };
  global.TPSheets = { purgeNets: () => { try { ensureLinks(); } catch (e) {} return purgeNets(); } };
})(window);
