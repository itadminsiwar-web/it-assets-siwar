/* =========================================================
   tp-staff.js — موظفين Three Pillars: الكود الوظيفي الثابت + الإيميل
   • كل موظف ليه كود ثابت (Siw-EMP-001…) — نفس الكود على أي جهاز/متصفح.
   • بيتطبق بعد كل مزامنة مع الشيت (ومع فتح النظام): بيدوّر على الموظف بالاسم (أو اسم مختصر)،
     ولو مش موجود بيضيفه، ويحط الكود والإيميل، ويعمل للإيميل سجل في "إيميلات الشركة".
   • الموظفين اللي هنا محميين: المزامنة مع الشيت مش بتمسحهم حتى لو مالهمش جهاز في الشيت.
   • لإضافة موظف: زوّد سطر بكود جديد (متغيّرش أكواد الموجودين).
   ========================================================= */
(function (global) {
  'use strict';
  const LIST = [
    // HR
    { code: 'Siw-EMP-001', name: 'رغد', email: 'hr.siwar00@gmail.com', dept: 'HR' },
    // Sales
    { code: 'Siw-EMP-002', name: 'اسلام', aka: ['إسلام'], email: 'salesmanager.siwar@gmail.com', dept: 'sales manager', role: 'Sales Manager' },
    { code: 'Siw-EMP-003', name: 'خيرى محمد خيرى', aka: ['خيرى', 'خيري'], email: 'sales1.siwar@gmail.com', dept: 'Sales' },
    { code: 'Siw-EMP-004', name: 'احمد عبداللطيف', email: 'sales2.siwar@gmail.com', dept: 'Sales' },
    { code: 'Siw-EMP-005', name: 'عبدالباسط', email: 'salesfollowup.siwar@gmail.com', dept: 'Sales', role: 'Sales Follow-up' },
    // Telesales
    { code: 'Siw-EMP-006', name: 'ريم', email: 'telesales2.siwar@gmail.com', dept: 'tele sales' },
    { code: 'Siw-EMP-007', name: 'الاء محمود', email: 'telesales1.siwar@gmail.com', dept: 'tele sales' },
    { code: 'Siw-EMP-008', name: 'سلمى سامى محمد', aka: ['سلمى'], email: 'telesales03.siwar@gmail.com', dept: 'tele sales' },
    { code: 'Siw-EMP-009', name: 'مريم', email: 'mariamsiwar1@gmail.com', dept: 'tele sales' },
    { code: 'Siw-EMP-010', name: 'محمد يسرى', aka: ['يسرى', 'يسري'], email: 'telesales04.siwar@gmail.com', dept: 'tele sales' },
    { code: 'Siw-EMP-011', name: 'ديما', email: 'telesales05.siwar@gmail.com', dept: 'tele sales' },
    // في شيت الجرد (لسه من غير إيميل)
    { code: 'Siw-EMP-012', name: 'رضوى', email: 'telesalesmanager.siwar@gmail.com', dept: 'tele manager', role: 'Tele Sales Manager' },
    { code: 'Siw-EMP-013', name: 'م ابراهيم', dept: 'GM' },
    { code: 'Siw-EMP-014', name: 'محمود ابراهيم', dept: 'IT' },
    { code: 'Siw-EMP-015', name: 'محمد طارق', dept: 'Sales' },
    { code: 'Siw-EMP-016', name: 'احمد عبدالناصر', dept: 'Sales' },
  ];
  // تطبيع الأسامي: المسافات، الهمزات، الياء/الألف المقصورة، التاء المربوطة
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/[إأآ]/g, 'ا').replace(/ي/g, 'ى').replace(/ة/g, 'ه');
  const names = e => [e.name].concat(e.aka || []).map(norm);

  function apply(DB) {
    if (!DB || !Array.isArray(DB.team)) return 0;
    if (!Array.isArray(DB.mailboxes)) DB.mailboxes = [];
    const company = ((((DB.itSettings || {}).companies) || [])[0] || {}).name || 'Siwar';
    let changed = 0;
    // مرة واحدة: شيل الجرد التجريبي القديم (كان على أجهزة اتشالت)
    if (!DB.tpStkV1) { DB.stocktakes = []; DB.seq = DB.seq || {}; DB.seq.c_STK = 0; DB.tpStkV1 = true; changed++; }
    // مرة واحدة: شيل إيميلات البيانات التجريبية (@company.com) وابدأ أكواد الإيميلات من 001
    if (!DB.tpMailV1) {
      DB.mailboxes = DB.mailboxes.filter(b => b.source === 'hr' || !/@(company\.com|seg\.example)$/i.test(b.address || ''));
      DB.seq = DB.seq || {}; DB.seq.c_MAIL = 0;
      const order = LIST.map(e => (e.email || '').toLowerCase());
      DB.mailboxes.sort((a, b) => (order.indexOf(a.address) + 1 || 999) - (order.indexOf(b.address) + 1 || 999))
        .forEach(b => { if (global.ITX && global.ITX.mailCode) b.code = global.ITX.mailCode(); });
      DB.tpMailV1 = true; changed++;
    }
    LIST.forEach(e => {
      const ns = names(e);
      let m = DB.team.find(t => t.empNo === e.code) || DB.team.find(t => ns.includes(norm(t.name)));
      if (!m) { m = { id: U.uid(), name: e.name, dept: e.dept || '', company, active: true, source: 'hr', createdAt: new Date().toISOString() }; DB.team.push(m); changed++; }
      const set = (k, v) => { if (v && m[k] !== v) { m[k] = v; changed++; } };
      set('empNo', e.code);
      set('email', e.email);
      if (!m.dept && e.dept) set('dept', e.dept);
      if (!m.role && e.role) set('role', e.role);
      if (!m.company) set('company', company);
      m.hrList = true; // محمي من المسح في وضع "نسخة من الشيت"
      if (e.email) {
        let b = DB.mailboxes.find(x => String(x.address || '').toLowerCase() === e.email.toLowerCase());
        if (!b) {
          b = { id: U.uid(), kind: 'personal', address: e.email.toLowerCase(), holderId: m.id, provider: 'Gmail', status: 'active', members: [], createdAt: U.today(), source: 'hr' };
          if (global.ITX && global.ITX.mailCode) b.code = global.ITX.mailCode();
          DB.mailboxes.push(b); changed++;
        } else if (b.holderId !== m.id && b.kind !== 'shared' && !b.free && b.status !== 'free') { b.holderId = m.id; changed++; } // الخالي يفضل خالي
      }
    });
    return changed;
  }
  // ================= الشرائح السعودي (من شيت الشرائح) =================
  // phone = كود الموبايل اللي فيه الشريحة · lastPaid = آخر دفع · renew = التجديد القادم
  const LINES_V = 1; // زوّده لو غيّرت القايمة عشان تتطبق تاني (التعديلات من النظام بعد كده بتفضل)
  const LINES = [
    { code: 'Siw-KSA-001', holder: 'رضوى', number: '+966569379477', phone: 'siwar-Mobile-001', carrier: 'موبايلي', lastPaid: '2026-09-07', renew: '2026-12-07' },
    { code: 'Siw-KSA-002', holder: 'اسلام', number: '+966125784416', phone: 'siwar-Mobile-002', carrier: 'موبايلي', lastPaid: '2026-09-07', renew: '2026-12-07' },
    { code: 'Siw-KSA-003', holder: 'اسلام', number: '+966125784733', phone: 'siwar-Mobile-003', carrier: 'موبايلي', lastPaid: '2026-09-07', renew: '2026-12-07' },
    { code: 'Siw-KSA-004', holder: 'رضوى', number: '+966567734867', phone: 'siwar-Mobile-004', carrier: 'موبايلي', lastPaid: '2026-09-07', renew: '2026-12-07' },
    { code: 'Siw-KSA-005', holder: 'رضوى', number: '+966573939584', phone: 'siwar-Mobile-005', carrier: 'موبايلي', lastPaid: '2026-09-07', renew: '2026-12-07' },
    { code: 'Siw-KSA-006', holder: 'رضوى', number: '+966573939757', phone: 'siwar-Mobile-005', carrier: 'STC', lastPaid: '2026-09-07', renew: '2026-12-07' },
    { code: 'Siw-KSA-007', holder: 'م ابراهيم', number: '+966573939209', phone: '', carrier: 'موبايلي', lastPaid: '2026-09-07', renew: '2026-12-07', purpose: 'الأساسية' },
  ];
  // كود الاستعلام / الشحن لكل شركة اتصالات
  const CARRIER_CODES = { 'زين': '*144#', 'موبايلي': '*222#', 'STC': '*150#' };

  function applyLines(DB) {
    if (!DB || !Array.isArray(DB.lines) || DB.tpLinesV === LINES_V) return 0;
    const codes = LINES.map(l => l.code);
    // الشرائح السعودي = القايمة دي بالظبط (اللي مش فيها كانت تجريبية)
    DB.lines = DB.lines.filter(l => l.country !== 'SA' || codes.includes(l.code));
    LINES.forEach(e => {
      let l = DB.lines.find(x => x.code === e.code);
      if (!l) { l = { id: U.uid(), code: e.code, createdAt: new Date().toISOString() }; DB.lines.push(l); }
      const m = (DB.team || []).find(t => norm(t.name) === norm(e.holder));
      Object.assign(l, { country: 'SA', number: e.number, carrier: e.carrier, kind: 'voice', currency: 'SAR', lastPaid: e.lastPaid, renewDate: e.renew, phoneTag: e.phone || '',
        purpose: e.purpose || '', plan: '', cost: 0, iccid: '', whatsapp: false, owner: 'الشركة', company: 'Siwar',
        status: m ? 'assigned' : 'stock', holderId: m ? m.id : '', assignedAt: m ? (l.holderId === m.id && l.assignedAt ? l.assignedAt : e.lastPaid) : '' });
    });
    DB.tpLinesV = LINES_V;
    return 1;
  }
  // ================= باقات الإنترنت = خطوط WE اللي في السكربت (Desktop\we\we_sheet.json) =================
  // الجيجات المتبقية وميعاد التجديد بييجوا من السكربت ← شيت WE ← النظام (مش بتتكتب هنا)
  const NET_V = 2; // 2: الخط التاني اتصحح لـ 0505160640
  const NETS = [
    { code: 'NET-001', number: '0504033807' },
    { code: 'NET-002', number: '0505160640' },
  ];
  function applyNet(DB) {
    if (!DB || !Array.isArray(DB.netPackages) || DB.tpNetV === NET_V) return 0;
    const codes = NETS.map(n => n.code);
    DB.netPackages = DB.netPackages.filter(x => codes.includes(x.code));
    // القراءات القديمة كانت تجريبية — القراءات الحقيقية بتيجي من السكربت
    DB.usageSnapshots = (DB.usageSnapshots || []).filter(s => s.refType !== 'net');
    NETS.forEach(n => {
      let x = DB.netPackages.find(p => p.code === n.code);
      if (!x) { x = { id: U.uid(), code: n.code, createdAt: new Date().toISOString(), users: [], history: [] }; DB.netPackages.push(x); }
      Object.assign(x, { name: 'WE ' + n.number, account: n.number, provider: 'WE', currency: 'EGP', cycle: 'monthly', status: 'active', portal: 'https://my.te.eg',
        quota: 0, used: 0, renewalDate: '', cost: 0, branch: '', lastFetch: '' });
    });
    DB.seq = DB.seq || {}; DB.seq.c_NET = Math.max(DB.seq.c_NET || 0, NETS.length);
    DB.tpNetV = NET_V;
    return 1;
  }
  global.TPStaff = { LIST, apply: DB => apply(DB) + applyLines(DB) + applyNet(DB), norm, LINES, CARRIER_CODES, NETS };
})(window);
