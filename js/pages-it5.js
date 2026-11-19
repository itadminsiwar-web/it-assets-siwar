/* =========================================================
   pages-it5.js — دورة الموظف
   طلبات الاحتياج (REQ) ← المرشحين والمقابلات (CAN) ← التعيين 0–8 (ONB) ← الإخلاء X1–X9 (OFF)
   + العهد والإقرارات (DOC): الإقرار الموحد · ملاحق العهدة · كشف خلو الطرف · إقرار تسليم العهدة
   القاعدة: الإخلاء = دورة التعيين بالعكس — الملف ميتقفلش غير لما كل اللي اتعمل في التعيين يتلغي أو يرجع
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {}, X = global.ITX;
  const { $, $$ } = UI;
  const today = () => U.today();
  const esc = s => U.esc(s);
  const nm = id => X.nm(id), staff = id => X.staff(id);
  const act = (a, id, label, cls) => `<button class="link ${cls || ''}" data-act="${a}" data-id="${id || ''}">${label}</button>`;
  const meName = () => X.me().name || '';
  const cand = cy => cy && cy.candidateId ? DB.candidates.find(c => c.id === cy.candidateId) : null;
  const render = () => global.Router.render();
  const DEPTS = () => X.allDepts();
  const branches = () => [''].concat(...X.settings().companies.map(c => c.branches));
  const company0 = () => (X.settings().companies[0] || {}).name || '';
  const notify = (to, title, link, icon) => global.Platform && global.Platform.notify({ to, title, link: 'it.html' + link, icon: icon || '🔔' });

  // ================= بنود التعيين 0–8 =================
  function onItems() {
    const it = (stage, key, label, owner) => ({ id: U.uid(), stage, key, label, owner, done: false });
    return [
      it(0, 'req', 'فتح طلب احتياج (REQ) واعتماده', 'الإدارة'),
      it(1, 'apply', 'تسجيل المرشح (QR Code / Google Form) وإنشاء Candidate ID', 'الاستقبال / HR'),
      it(1, 'checkin', 'مراجعة الطلب وتسجيل الوصول وتنسيق موعد المقابلة', 'HR'),
      it(2, 'int1', 'المقابلة الأولى — HR: الانطباع والملاحظات والتوصية', 'HR'),
      it(2, 'int2', 'المقابلة الثانية — فني / مدير القسم', 'المدير'),
      it(2, 'evalDone', 'تجميع نتائج المقابلتين في ملف واحد للمراجعة', 'HR'),
      it(3, 'decision', 'اعتماد قرار التوظيف (Accepted)', 'صاحب القرار'),
      it(3, 'offer', 'إرسال العرض الوظيفي وقبوله', 'HR'),
      it(4, 'link', 'إرسال رابط Onboarding الشخصي للمرشح', 'HR'),
      it(4, 'checkpoints', 'مراجعة البيانات والعقد وNDA واللائحة (Digital Checkpoints)', 'المرشح'),
      it(4, 'hrVerify', 'تحقق HR من اكتمال المستندات والبيانات', 'HR'),
      it(4, 'whatsapp', 'تأكيد ميعاد المباشرة والساعة والعنوان على واتساب', 'HR'),
      it(5, 'reserve', 'حجز الجهاز (خالي ← محجوز)', 'IT'),
      it(5, 'email', 'إنشاء الإيميل والحسابات', 'IT'),
      it(5, 'mdm', 'تسجيل الجهاز على MDM وتفعيل MFA', 'IT'),
      it(5, 'sim', 'تجهيز الشريحة', 'IT'),
      it(5, 'tools', 'تخصيص التولات والتراخيص', 'IT'),
      it(6, 'arrive', 'تأكيد وصول الموظف في أول يوم (Check-in)', 'HR'),
      it(6, 'joinInfo', 'تأكيد الاسم والوظيفة والقسم وتاريخ المباشرة', 'HR'),
      it(6, 'handover', 'تسليم العهد فعليًا ومطابقة Asset ID والسيريال', 'IT'),
      it(6, 'review', 'مراجعة HR + IT النهائية للبيانات والعهد المستلمة فعليًا', 'HR + IT'),
      it(7, 'ack', 'توليد الإقرار الموحد (8 أقسام) وطباعته', 'تلقائي'),
      it(7, 'sign', 'توقيع الموظف ورقيًا على الإقرار النهائي', 'الموظف'),
      it(7, 'scan', 'مسح الإقرار الموقّع ضوئيًا ورفعه لملف الموظف', 'HR'),
      it(8, 'activate', 'إغلاق إجراءات الانضمام وتفعيل سجل الموظف (CAN ← EMP)', 'تلقائي'),
    ];
  }
  // البنود 0–4 بتتقفل تلقائي من ملف المرشح
  function syncOn(cy) {
    const c = cand(cy); if (!c || cy.type !== 'onboard') return;
    const iv = k => (c.interviews || []).find(i => i.kind === k && i.evaluatedAt);
    const allDocs = X.PRE_DOCS.every(d => d.need.every(a => (c.checkpoints || []).some(x => x.doc === d.key && x.action === a)));
    const auto = { req: !!c.reqId, apply: true, checkin: !!(c.arrivedAt || (c.interviews || []).some(i => i.attended)), int1: !!iv('hr'), int2: !!iv('tech'), evalDone: !!(iv('hr') && iv('tech')), decision: !!(c.decision && c.decision.result === 'accepted'), offer: !!c.offerAcceptedAt, link: !!c.linkSentAt, checkpoints: allDocs, hrVerify: !!c.docsVerifiedAt, whatsapp: !!c.joinConfirmSentAt };
    let ch = false;
    cy.items.forEach(i => { if (i.key in auto && auto[i.key] && !i.done) { i.done = true; i.doneAt = today(); i.by = 'تلقائي'; ch = true; } });
    const st = X.cycleStage(cy), ns = cy.status === 'done' ? 'active' : st <= 4 ? (c.docsVerifiedAt && c.joiningDate ? 'joining' : 'docs') : st === 5 ? 'joining' : st === 6 ? 'handover' : st === 7 ? 'signature' : 'signature';
    if (c.status !== ns && ['accepted', 'docs', 'joining', 'handover', 'signature'].includes(c.status)) { c.status = ns; ch = true; }
    if (ch) { C.upsert('cycles', cy, 'تعيين'); C.upsert('candidates', c, 'مرشح'); }
  }
  ITX_syncAll();
  function ITX_syncAll() { if (global.DB && DB.cycles) DB.cycles.filter(c => c.type === 'onboard' && c.status === 'open').forEach(syncOn); }

  // ================= بنود الإخلاء X1–X9 =================
  function offItems(empId, cyNo) {
    const it = (stage, key, label, owner, ref, extra) => Object.assign({ id: U.uid(), stage, key, label, owner, ref: ref || '', done: false }, extra || {});
    const items = [it(1, 'request', 'طلب الإخلاء: السبب وآخر يوم عمل', 'HR', cyNo), it(1, 'freeze', 'تجميد أي عهد جديدة على الموظف', 'تلقائي'), it(2, 'clearDoc', 'كشف خلو الطرف اتولّد من الإقرار والملاحق', 'تلقائي')];
    DB.assets.filter(a => a.holderId === empId && a.status === 'assigned').forEach(a => items.push(it(3, 'recvAsset', 'استلام ' + X.typeName(a) + ' ' + (Fin.assetName ? Fin.assetName(a) : '') + ' ومطابقة ' + (a.type === 'mobile' ? 'IMEI' : 'السيريال'), 'IT', a.tag, { refId: a.id })));
    DB.lines.filter(l => l.holderId === empId && l.status === 'assigned').forEach(l => items.push(it(3, 'recvLine', 'استلام الشريحة أو إيقافها', 'IT', l.code || l.number, { refId: l.id })));
    items.push(it(3, 'accounts', 'قفل الإيميل والحسابات وإلغاء MFA والصلاحيات', 'IT', 'M365 / CRM / VPN'), it(3, 'vault', 'تغيير الباسوردات المشتركة في الـ Vault', 'IT', 'Vault'), it(3, 'returnDoc', 'توقيع إقرار تسليم العهدة', 'الموظف + IT'));
    DB.assets.filter(a => a.holderId === empId && a.status === 'assigned' && ['laptop', 'mobile', 'desktop', 'tablet'].includes(a.type)).forEach(a => items.push(it(4, 'wipe', 'مسح ' + a.tag + ' وحذفه من MDM ورجوعه المخزن خالي', 'IT', a.tag, { refId: a.id })));
    items.push(it(4, 'licenses', 'إرجاع التراخيص ونقل حسابات التولات', 'IT', 'LIC / TOOL'), it(5, 'handoverWork', 'تسليم العمل والداتا لمدير القسم', 'الموظف + المدير'), it(5, 'exitDocs', 'إصدار مستندات الخروج (خطاب إخلاء الطرف / شهادة الخبرة)', 'HR'),
      it(6, 'finance', 'إخطار الحسابات للتسوية النهائية', 'HR'), it(7, 'exitInterview', 'مقابلة الخروج قبل آخر يوم', 'HR'), it(8, 'archive', 'الأرشفة والاحتفاظ: EMP يتقفل Exited والإيميل يتأرشف', 'HR + IT'), it(9, 'position', 'قرار الوظيفة: إلغاؤها أو فتح REQ لبديل', 'الإدارة'));
    return items;
  }
  const mark = (cy, item, extra) => { Object.assign(item, { done: true, doneAt: today(), by: meName() || 'النظام' }, extra || {}); C.upsert('cycles', cy, cy.type === 'onboard' ? 'تعيين' : 'إخلاء'); };
  // كشف خلو الطرف: يتولّد من الإقرار الموحد والملاحق + أي عهدة مش متسجلة فيهم
  function makeClearance(cy) {
    const uni = X.docsOf(cy.empId, 'unified'), ann = X.docsOf(cy.empId, 'annex'), parents = uni.concat(ann).map(d => d.no);
    const fromDocs = [].concat(...uni.concat(ann).map(d => d.items || [])), cur = X.custody(cy.empId), map = {};
    fromDocs.concat(cur.map(X.snap)).forEach(x => { map[x.t + ':' + x.id] = map[x.t + ':' + x.id] || Object.assign({}, x, { notInDocs: !fromDocs.some(f => f.t === x.t && f.id === x.id) }); });
    const items = Object.values(map).filter(x => x.t !== 'mail' || cur.some(c => c.id === x.id));
    const d = X.newDoc('clearance', cy.empId, { cycleId: cy.id, parents, items });
    return d;
  }

  // ================= بدء الإخلاء (X1) =================
  Fin.startOffboard = function (empId) {
    const s = staff(empId), ex = X.openOff(empId);
    if (ex) { global.Router.go('#/cycle/' + ex.id); return; }
    const cc = X.custodyCount(empId), mgr = (DB.mailboxes.find(b => b.holderId === (DB.team.find(m => m.dept === s.dept && /مدير|رئيس/.test(m.role || '') && m.id !== empId) || {}).id) || {}).address || '';
    UI.modal({
      title: 'طلب إخلاء — ' + s.name, saveLabel: 'فتح طلب الإخلاء',
      body: `<div class="grid2">${UI.field({ label: 'السبب', name: 'reason', type: 'select', options: (Fin.list ? Fin.list('offReasons') : ['استقالة', 'إنهاء خدمة', 'انتهاء عقد', 'نقل لشركة / فرع تاني', 'أخرى']) })}${UI.field({ label: 'آخر يوم عمل', name: 'date', type: 'date', value: U.addDays(today(), 7) })}
        ${UI.field({ label: 'تحويل إيميله بعد القفل إلى', name: 'forwardTo', value: mgr, attrs: 'dir="ltr"' })}${UI.field({ label: 'ملاحظات', name: 'note' })}</div>
        <p class="muted small">هيتعمل تلقائي: تجميد أي عهد جديدة عليه (X1) + كشف خلو الطرف من الإقرار والملاحق (X2) — معاه دلوقتي ${cc.assets} أصول و${cc.accounts} حسابات.</p>`,
      onSave: m => {
        const d = UI.form(m.el), no = X.nextCode('OFF');
        const cy = { id: U.uid(), no, type: 'offboard', empId, date: d.date, reason: d.reason, note: d.note, forwardTo: d.forwardTo, status: 'open', frozen: true, by: meName(), items: offItems(empId, no) };
        mark(cy, cy.items.find(i => i.key === 'request'), { by: meName() || 'HR' });
        X.event('اتفتح طلب إخلاء ' + no + ' · ' + d.reason + ' · آخر يوم ' + d.date, { ref: no, empId, cycleId: cy.id, by: meName() || 'الموارد البشرية' });
        mark(cy, cy.items.find(i => i.key === 'freeze'), { by: 'النظام' });
        X.event('اتجمّدت العهد الجديدة على ' + (s.empNo || s.name), { ref: s.empNo, empId, cycleId: cy.id, by: 'النظام' });
        const doc = makeClearance(cy); const cl = cy.items.find(i => i.key === 'clearDoc'); cl.ref = doc.no; mark(cy, cl, { by: 'النظام' });
        cy.docs = [doc.no];
        X.event('اتولّد كشف خلو الطرف ' + doc.no + ' (' + doc.items.filter(x => x.group === 'asset').length + ' أصول + ' + doc.items.filter(x => x.group === 'account').length + ' حسابات)', { ref: doc.no, empId, cycleId: cy.id, by: 'النظام' });
        s.status = 'leaving'; s.lastDay = d.date; C.upsert('team', s, 'إخلاء');
        C.upsert('cycles', cy, 'إخلاء');
        notify(['it', 'admin', 'hr'], '🚪 إخلاء ' + s.name + ' — آخر يوم ' + d.date, '#/cycle/' + cy.id, '🚪');
        global.Router.go('#/cycle/' + cy.id);
      },
    });
  };

  // ================= بدء التعيين =================
  function createOnboard(o) {
    const s = o.empId ? staff(o.empId) : { id: U.uid(), name: o.name, dept: o.dept, role: o.role, company: o.company || company0(), branch: o.branch, location: o.location || '', active: true, status: 'onboarding', startDate: o.date };
    if (!s.empNo) s.empNo = X.nextCode('EMP');
    s.status = s.status === 'active' ? 'active' : 'onboarding'; s.startDate = o.date || s.startDate; if (o.candidateId) s.candidateId = o.candidateId;
    C.upsert('team', s, 'موظف');
    const cy = { id: U.uid(), no: X.nextCode('ONB'), type: 'onboard', empId: s.id, candidateId: o.candidateId || '', date: o.date, status: 'open', by: meName(), items: onItems() };
    if (!o.candidateId) cy.items.filter(i => i.stage <= 4).forEach(i => { i.skipped = true; i.note = 'اتسجّل خارج النظام'; });
    C.upsert('cycles', cy, 'تعيين');
    const c = cand(cy); if (c) { c.empId = s.id; c.cycleId = cy.id; C.upsert('candidates', c, 'مرشح'); syncOn(cy); }
    X.event('اتفتح تعيين ' + cy.no + ' لـ ' + s.name + ' (' + s.empNo + ')' + (c ? ' من ' + c.no : '') + ' · المباشرة ' + o.date, { ref: cy.no, empId: s.id, cycleId: cy.id });
    notify(['it', 'admin'], '🟢 موظف جديد يبدأ ' + o.date + ': ' + s.name + ' — جهّز IT (مرحلة 5)', '#/cycle/' + cy.id, '🟢');
    return cy;
  }
  Fin.startOnboard = function (candidateId) {
    const c = candidateId && DB.candidates.find(x => x.id === candidateId);
    if (c) { if (c.cycleId) return global.Router.go('#/cycle/' + c.cycleId); const cy = createOnboard({ candidateId: c.id, name: c.name, dept: c.dept, role: c.jobTitle, branch: c.branch, company: c.company, date: c.joiningDate || U.addDays(today(), 7) }); return global.Router.go('#/cycle/' + cy.id); }
    UI.modal({
      title: 'تعيين مباشر (من غير ملف مرشح)', saveLabel: 'إنشاء سيكل التعيين',
      body: `<div class="grid2">${UI.field({ label: 'موظف موجود', name: 'empId', type: 'select', options: [{ value: '', label: '— موظف جديد —' }].concat((DB.team || []).filter(m => !X.isExited(m)).map(m => ({ value: m.id, label: m.name }))) })}${UI.field({ label: 'تاريخ المباشرة', name: 'date', type: 'date', value: U.addDays(today(), 3) })}
        ${UI.field({ label: 'الاسم', name: 'name' })}${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: DEPTS() })}${UI.field({ label: 'الوظيفة', name: 'role' })}${UI.field({ label: 'الفرع', name: 'branch', type: 'select', options: branches() })}</div>
        <p class="muted small">المراحل 0–4 (الاحتياج والتقديم والمقابلات والمستندات) هتتعلّم "اتسجّل خارج النظام". الأفضل تبدأ من <a href="#/cands">المرشحين</a>.</p>`,
      onSave: m => { const d = UI.form(m.el); if (!d.empId && !d.name) throw new Error('اكتب اسم الموظف'); const cy = createOnboard(d); global.Router.go('#/cycle/' + cy.id); },
    });
  };

  // ================= تنفيذ بنود التعيين =================
  function doOn(cy, item) {
    const s = staff(cy.empId), c = cand(cy), done = (extra, ev) => { mark(cy, item, extra); if (ev) X.event(ev, { empId: cy.empId, cycleId: cy.id, ref: (extra || {}).ref || item.ref || '' }); syncOn(cy); render(); };
    const k = item.key, need = key => { const i = cy.items.find(x => x.key === key); if (i && !i.done && !i.skipped) throw new Error('لازم الأول: ' + i.label); };
    try {
      if (item.stage <= 4 && c) return global.Router.go('#/cand/' + c.id);
      if (k === 'reserve') {
        const free = DB.assets.filter(a => ['ready', 'stock'].includes(a.status)).sort((a, b) => (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1));
        if (!free.length) return UI.toast('مفيش أجهزة خالية في المخزن', 'warn');
        return UI.modal({ title: 'حجز أجهزة لـ ' + s.name, saveLabel: 'حجز', body: `<p class="muted small">الخالي / الجاهز للتسليم الأول. الجهاز المحجوز ميتسلمش لحد تاني.</p><div class="chk-grid wide">${free.map(a => `<label class="chk"><input type="checkbox" data-a="${a.id}"> <b dir="ltr">${esc(a.tag)}</b> ${esc(Fin.assetName(a))} <small class="muted">${a.status === 'ready' ? 'خالي' : 'مخزن'}</small></label>`).join('')}</div>`,
          onSave: m => { const ids = $$('[data-a]', m.el).filter(i => i.checked).map(i => i.dataset.a); if (!ids.length) throw new Error('اختار جهاز'); const codes = ids.map(id => { const a = C.find('assets', id); Object.assign(a, { status: 'reserved', reservedFor: cy.empId, reservedAt: today() }); C.upsert('assets', a, 'حجز'); X.alog(a.id, 'reserve', { holderId: cy.empId, note: cy.no }); return a.tag; }); done({ ref: codes.join('، ') }, 'اتحجز ' + codes.join('، ') + ' لـ ' + s.name + ' (خالي ← محجوز)'); } });
      }
      if (k === 'email') return Fin.editMailbox(null, { kind: 'personal', holderId: cy.empId, __after: b => setTimeout(() => done({ ref: b.address }, 'اتعمل الإيميل ' + b.address + ' لـ ' + s.name), 30) });
      if (k === 'mdm') {
        const res = DB.assets.filter(a => a.reservedFor === cy.empId || (a.holderId === cy.empId && a.status === 'assigned')), mb = DB.mailboxes.filter(b => b.holderId === cy.empId && b.status === 'active');
        return UI.modal({ title: 'MDM و MFA — ' + s.name, saveLabel: 'تم', body: `<div class="chk-grid wide">${res.map(a => `<label class="chk"><input type="checkbox" data-m="${a.id}" ${a.mdm ? 'checked' : ''}> ${esc(a.tag)} على MDM</label>`).join('')}${mb.map(b => `<label class="chk"><input type="checkbox" data-f="${b.id}" ${b.mfa ? 'checked' : ''}> MFA على <span dir="ltr">${esc(b.address)}</span></label>`).join('')}</div>${!res.length ? '<p class="t-warn small">احجز الجهاز الأول.</p>' : ''}`,
          onSave: m => { $$('[data-m]', m.el).forEach(i => { const a = C.find('assets', i.dataset.m); a.mdm = i.checked; C.upsert('assets', a, 'MDM'); }); $$('[data-f]', m.el).forEach(i => { const b = C.find('mailboxes', i.dataset.f); b.mfa = i.checked; C.upsert('mailboxes', b, 'MFA'); }); done({}, 'اتسجّلت أجهزة ' + s.name + ' على MDM واتفعّل MFA'); } });
      }
      if (k === 'sim') {
        const free = DB.lines.filter(l => l.status === 'stock' && !l.reservedFor);
        return UI.modal({ title: 'تجهيز شريحة لـ ' + s.name, saveLabel: 'حفظ', body: UI.field({ label: 'الشريحة', name: 'lid', type: 'select', options: [{ value: '', label: '— مش محتاج شريحة —' }].concat(free.map(l => ({ value: l.id, label: (l.code || '') + ' · ' + Fin.fmtPhone(l.number) + ' · ' + l.carrier }))) }),
          onSave: m => { const id = UI.form(m.el).lid; if (!id) return done({ note: 'مش محتاج شريحة' }, ''); const l = C.find('lines', id); l.reservedFor = cy.empId; C.upsert('lines', l, 'حجز شريحة'); done({ ref: l.code }, 'اتجهزت الشريحة ' + l.code + ' لـ ' + s.name); } });
      }
      if (k === 'tools') {
        return UI.modal({ title: 'التولات والتراخيص — ' + s.name, saveLabel: 'تخصيص', wide: true, body: `<h3 class="h3s">التراخيص والاشتراكات</h3><div class="chk-grid wide">${DB.subscriptions.filter(x => x.status !== 'cancelled').map(x => `<label class="chk"><input type="checkbox" data-s="${x.id}" ${(x.users || []).includes(cy.empId) ? 'checked' : ''}> ${esc(x.name)} <small class="muted">(${(x.users || []).length}/${x.seats || '∞'})</small></label>`).join('')}</div>
            <h3 class="h3s">التولات</h3><div class="chk-grid wide">${DB.tools.filter(x => x.status !== 'cancelled').map(x => `<label class="chk"><input type="checkbox" data-t="${x.id}" ${(x.users || []).includes(cy.empId) ? 'checked' : ''}> ${esc(x.code)} ${esc(x.name)}</label>`).join('')}</div>`,
          onSave: m => { const S2 = $$('[data-s]', m.el).filter(i => i.checked).map(i => C.find('subscriptions', i.dataset.s)), T2 = $$('[data-t]', m.el).filter(i => i.checked).map(i => C.find('tools', i.dataset.t));
            S2.forEach(x => { if (!(x.users || []).includes(cy.empId) && x.seats && (x.users || []).length >= x.seats) throw new Error(x.name + ': كل المقاعد مستخدمة'); });
            S2.forEach(x => { if (!(x.users || []).includes(cy.empId)) { x.users = (x.users || []).concat(cy.empId); C.upsert('subscriptions', x, 'ترخيص'); } }); T2.forEach(x => { if (!(x.users || []).includes(cy.empId)) { x.users = (x.users || []).concat(cy.empId); C.upsert('tools', x, 'تول'); } });
            done({ ref: S2.map(x => x.code || x.name).concat(T2.map(x => x.code)).join('، ') }, 'اتخصص لـ ' + s.name + ': ' + S2.map(x => x.name).concat(T2.map(x => x.code)).join('، ')); } });
      }
      if (k === 'arrive') return done({ at: new Date().toISOString() }, 'وصل ' + s.name + ' أول يوم (Check-in)');
      if (k === 'joinInfo') return UI.modal({ title: 'بيانات المباشرة — ' + s.name, saveLabel: 'تأكيد', body: `<div class="grid2">${UI.field({ label: 'الاسم', name: 'name', value: s.name })}${UI.field({ label: 'الوظيفة', name: 'role', value: s.role })}${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: DEPTS(), value: s.dept })}${UI.field({ label: 'تاريخ المباشرة', name: 'startDate', type: 'date', value: s.startDate || cy.date })}${UI.field({ label: 'الفرع', name: 'branch', type: 'select', options: branches(), value: s.branch })}${UI.field({ label: 'المكان', name: 'location', type: 'select', options: ['القاهرة', 'الرياض', 'عن بُعد'], value: s.location })}</div>`,
        onSave: m => { Object.assign(s, UI.form(m.el)); C.upsert('team', s, 'موظف'); done({}, 'اتأكدت بيانات مباشرة ' + s.name); } });
      if (k === 'handover') {
        need('arrive');
        const res = DB.assets.filter(a => a.reservedFor === cy.empId && a.status === 'reserved'), ls = DB.lines.filter(l => l.reservedFor === cy.empId && l.status === 'stock');
        if (!res.length && !ls.length) return UI.toast('مفيش عهد محجوزة — احجز من مرحلة 5', 'warn');
        return UI.modal({ title: 'تسليم العهد فعليًا — ' + s.name, saveLabel: 'تسليم', wide: true, body: `<p class="muted small">قاعدة مهمة: متتسجلش العهدة مستلمة غير بعد التسليم الفعلي وتوثيق بياناتها. اكتب السيريال اللي على الجهاز.</p>
            ${res.map(a => `<div class="grid3">${UI.field({ label: a.tag + ' — ' + Fin.assetName(a), name: 'sn_' + a.id, placeholder: 'السيريال / IMEI', attrs: 'dir="ltr"' })}${UI.field({ label: 'الحالة', name: 'cond_' + a.id, type: 'select', options: Fin.CONDS, value: a.condition })}${UI.field({ label: 'الملحقات', name: 'acc_' + a.id, placeholder: 'شاحن، شنطة…' })}</div>`).join('')}
            ${ls.map(l => `<label class="chk"><input type="checkbox" name="ln_${l.id}" checked> تسليم الشريحة ${esc(l.code)} · <span dir="ltr">${Fin.fmtPhone(l.number)}</span></label>`).join('')}`,
          onSave: m => { const d = UI.form(m.el);
            res.forEach(a => { if (a.serial && String(d['sn_' + a.id] || '').toLowerCase() !== a.serial.toLowerCase()) throw new Error('السيريال مش مطابق لـ ' + a.tag + ' (المسجّل: ' + a.serial + ')'); });
            const codes = [];
            res.forEach(a => { Object.assign(a, { status: 'assigned', holderId: cy.empId, assignedAt: today(), reservedFor: '', condition: d['cond_' + a.id] }); C.upsert('assets', a, 'تسليم عهدة'); X.alog(a.id, 'assign', { holderId: cy.empId, condition: a.condition, note: (d['acc_' + a.id] || '') + ' · ' + cy.no }); codes.push(a.tag); });
            ls.forEach(l => { if (d['ln_' + l.id]) { Object.assign(l, { status: 'assigned', holderId: cy.empId, assignedAt: today(), reservedFor: '' }); C.upsert('lines', l, 'تسليم خط'); X.alog(l.id, 'assign', { holderId: cy.empId, note: cy.no }); codes.push(l.code); } });
            done({ ref: codes.join('، ') }, 'اتسلّم فعليًا لـ ' + s.name + ': ' + codes.join('، ') + ' (السيريال مطابق)'); } });
      }
      if (k === 'review') { need('handover'); return done({}, 'مراجعة HR + IT النهائية لعهد ' + s.name); }
      if (k === 'ack') {
        need('review');
        let d = X.docsOf(cy.empId, 'unified').find(x => x.cycleId === cy.id);
        if (!d) { d = X.newDoc('unified', cy.empId, { cycleId: cy.id, candidateId: cy.candidateId, items: X.custody(cy.empId).map(x => Object.assign(X.snap(x), { mark: 'received' })) }); cy.docs = (cy.docs || []).concat(d.no); }
        X.printDoc(d); return done({ ref: d.no }, 'اتولّد الإقرار الموحد ' + d.no + ' واتطبع للتوقيع');
      }
      if (k === 'sign') { need('ack'); const d = X.docsOf(cy.empId, 'unified').find(x => x.cycleId === cy.id); X.setDocStatus(d, 'signed'); return done({ ref: d.no }, ''); }
      if (k === 'scan') { need('sign'); const d = X.docsOf(cy.empId, 'unified').find(x => x.cycleId === cy.id); return X.uploadScan(d, () => done({ ref: d.no }, '')); }
      if (k === 'activate') {
        const left = cy.items.filter(i => i.key !== 'activate' && !i.done && !i.skipped); if (left.length) throw new Error('لسه ' + left.length + ' بنود: ' + left[0].label);
        s.status = 'active'; s.active = true; C.upsert('team', s, 'تفعيل موظف');
        if (c) { c.status = 'active'; c.activeAt = today(); C.upsert('candidates', c, 'مرشح'); }
        if (c && c.reqId) { const r = DB.requisitions.find(x => x.id === c.reqId); if (r) { r.filled = (r.filled || 0) + 1; if (r.filled >= (r.count || 1)) r.status = 'filled'; C.upsert('requisitions', r, 'طلب احتياج'); } }
        mark(cy, item, { by: 'النظام' }); cy.status = 'done'; cy.doneAt = today(); C.upsert('cycles', cy, 'تعيين');
        X.event((c ? c.no + ' ← ' : '') + s.empNo + ' · ' + s.name + ' بقى Active Employee', { ref: s.empNo, empId: s.id, cycleId: cy.id, by: 'النظام' }); return render();
      }
      // بند يدوي (أو 0–4 من غير مرشح)
      done({}, item.label + ' — ' + s.name);
    } catch (e) { UI.toast(e.message, 'err'); }
  }

  // ================= تنفيذ بنود الإخلاء =================
  function doOff(cy, item) {
    const s = staff(cy.empId), done = (extra, ev, by) => { mark(cy, item, extra); if (ev) X.event(ev, { empId: cy.empId, cycleId: cy.id, ref: (extra || {}).ref || item.ref || '', by }); render(); };
    const k = item.key, stageDone = n => cy.items.filter(i => i.stage === n && i.key !== 'returnDoc').every(i => i.done);
    try {
      if (k === 'recvAsset') { const a = C.find('assets', item.refId); if (!a || a.holderId !== cy.empId) return done({}, '');
        return UI.modal({ title: 'استلام ' + a.tag + ' من ' + s.name, saveLabel: 'استلام', body: `<div class="grid2">${UI.field({ label: (a.type === 'mobile' ? 'IMEI' : 'السيريال') + ' اللي على الجهاز', name: 'sn', attrs: 'dir="ltr"', placeholder: a.serial || '' })}${UI.field({ label: 'الحالة عند الاستلام', name: 'cond', type: 'select', options: Fin.CONDS, value: a.condition })}${UI.field({ label: 'ملاحظات (نواقص / أعطال)', name: 'note', full: true })}</div>`,
          onSave: m => { const d = UI.form(m.el); if (a.serial && d.sn.toLowerCase() !== a.serial.toLowerCase()) throw new Error('السيريال مش مطابق (المسجّل: ' + a.serial + ')'); Fin.returnIt(a, today(), d.cond, 'إخلاء ' + cy.no + (d.note ? ' · ' + d.note : '')); done({ condition: d.cond, at: today() }, 'اتسلّم ' + a.tag + ' من ' + s.name + ' ومطابقة ' + (a.type === 'mobile' ? 'IMEI' : 'السيريال') + (a.status === 'wipe' ? ' · مستني Wipe' : '')); } }); }
      if (k === 'recvLine') { const l = C.find('lines', item.refId); if (!l || l.holderId !== cy.empId) return done({}, '');
        return UI.modal({ title: 'الشريحة ' + (l.code || '') + ' — ' + Fin.fmtPhone(l.number), saveLabel: 'حفظ', body: UI.field({ label: 'الإجراء', name: 'how', type: 'select', options: [{ value: 'stock', label: 'استلامها ورجوعها المخزن' }, { value: 'suspended', label: 'إيقافها من شركة الاتصالات' }] }),
          onSave: m => { const how = UI.form(m.el).how; Object.assign(l, { status: how, holderId: '', assignedAt: '', lastHolder: cy.empId }); C.upsert('lines', l, 'شريحة'); X.alog(l.id, how === 'stock' ? 'return' : 'suspend', { holderId: cy.empId, note: cy.no }); done({ condition: how === 'stock' ? 'اتسلمت' : 'اتوقفت', at: today() }, (how === 'stock' ? 'اتسلمت الشريحة ' : 'اتوقفت الشريحة ') + (l.code || '') + ' من ' + s.name); } }); }
      if (k === 'accounts') {
        const mb = DB.mailboxes.filter(b => b.holderId === cy.empId && b.status === 'active'), sh = DB.mailboxes.filter(b => (b.members || []).includes(cy.empId)), u = (DB.users || []).find(x => x.email && s.email && x.email.toLowerCase() === s.email.toLowerCase() && !x.disabled);
        return UI.modal({ title: 'قفل الحسابات — ' + s.name, saveLabel: 'قفل', body: `<ul>${mb.map(b => `<li>قفل <b dir="ltr">${esc(b.address)}</b> وتحويله وإلغاء MFA</li>`).join('')}${sh.map(b => `<li>شيله من الإيميل المشترك <span dir="ltr">${esc(b.address)}</span></li>`).join('')}${u ? `<li>قفل حسابه على النظام (CRM) <span dir="ltr">${esc(u.email)}</span></li>` : ''}<li>إلغاء صلاحيات VPN والأنظمة التانية (من لوحاتها)</li></ul>${UI.field({ label: 'تحويل الإيميل إلى', name: 'fw', value: cy.forwardTo || '', attrs: 'dir="ltr"' })}`,
          onSave: m => { const fw = UI.form(m.el).fw; mb.forEach(b => { Object.assign(b, { status: 'suspended', forwardTo: fw || b.forwardTo, mfa: false, lockedAt: today() }); C.upsert('mailboxes', b, 'قفل إيميل'); }); sh.forEach(b => { b.members = (b.members || []).filter(x => x !== cy.empId); C.upsert('mailboxes', b, 'إيميل'); }); if (u) { u.disabled = true; u.passHash = 'disabled-' + U.uid(); global.Store.save(); }
            done({}, 'اتقفل الإيميل والحسابات واتلغى MFA والصلاحيات لـ ' + s.name + ' (M365 / CRM / VPN)'); } });
      }
      if (k === 'vault') { const v = X.settings().vaultUrl; return UI.modal({ title: 'تغيير الباسوردات المشتركة', saveLabel: 'اتغيرت', body: `<p>غيّر كل الباسوردات المشتركة اللي ${esc(s.name)} كان يعرفها (حسابات السوشيال، الواي فاي، حسابات الإعلانات…) من الـ Vault.</p>${v ? `<a class="btn ghost" href="${esc(v)}" target="_blank" rel="noopener">فتح الـ Vault ↗</a>` : '<p class="muted small">رابط الـ Vault من المزامنة والإعدادات.</p>'}<p class="muted small">🔒 الباسوردات نفسها مش بتتسجل في النظام.</p>`, onSave: () => done({}, 'اتغيرت الباسوردات المشتركة في الـ Vault بعد ' + s.name) }); }
      if (k === 'returnDoc') {
        if (!stageDone(3)) throw new Error('لسه فيه عهد معاه أو حسابات مش مقفولة (X3)');
        let d = DB.itDocs.find(x => x.kind === 'returnAck' && x.cycleId === cy.id);
        if (!d) { d = X.newDoc('returnAck', cy.empId, { cycleId: cy.id, items: cy.items.filter(i => ['recvAsset', 'recvLine'].includes(i.key)).map(i => { const a = C.find('assets', i.refId) || C.find('lines', i.refId) || {}; return { t: i.key === 'recvLine' ? 'line' : 'asset', id: i.refId, code: i.ref, type: a.number ? 'شريحة' : X.typeName(a), serial: a.serial || (a.number ? Fin.fmtPhone(a.number) : ''), label: a.number ? a.carrier : Fin.assetName(a), condition: i.condition, at: i.at }; }) }); cy.docs = (cy.docs || []).concat(d.no); item.ref = d.no; C.upsert('cycles', cy, 'إخلاء'); X.event('اتولّد إقرار تسليم العهدة ' + d.no, { ref: d.no, empId: cy.empId, cycleId: cy.id, by: 'النظام' }); }
        return UI.modal({ title: 'إقرار تسليم العهدة ' + d.no, body: `<p>${esc(X.DOCST[d.status][0])}</p><p class="muted small">الحسابات ماتصرفش التسوية النهائية قبل التوقيع.</p>`, extraButtons: `<button class="btn" data-p>🖨 طباعة</button><button class="btn primary" data-s>✍ اتوقّع</button>`,
          onOpen: m => { $('[data-p]', m.el).onclick = () => X.printDoc(d); $('[data-s]', m.el).onclick = () => { X.setDocStatus(d, 'signed'); m.close(); done({ ref: d.no }, ''); }; } });
      }
      if (k === 'wipe') { const a = C.find('assets', item.refId); const rv = cy.items.find(i => i.key === 'recvAsset' && i.refId === item.refId); if (rv && !rv.done) throw new Error('استلم الجهاز الأول'); if (!a || a.status !== 'wipe') return done({}, ''); return X.wipeAsset(a, cert => done({ ref: a.tag + ' · ' + cert.no }, '')); }
      if (k === 'licenses') {
        const subs = DB.subscriptions.filter(x => (x.users || []).includes(cy.empId)), tools = DB.tools.filter(x => (x.users || []).includes(cy.empId));
        return UI.modal({ title: 'التراخيص والتولات — ' + s.name, saveLabel: 'تنفيذ', wide: true, body: (subs.length ? `<h3 class="h3s">إرجاع التراخيص</h3>${subs.map(x => `<label class="chk"><input type="checkbox" data-s="${x.id}" checked> ${esc(x.name)}</label>`).join('')}` : '') + (tools.length ? `<h3 class="h3s">حسابات التولات</h3>${tools.map(x => `<div class="grid2"><span><b dir="ltr">${esc(x.code)}</b> ${esc(x.name)} <small dir="ltr">${esc(x.account || '')}</small></span>${UI.field({ label: 'نقل إلى', name: 'to_' + x.id, type: 'select', options: [{ value: '', label: '— إرجاع (من غير نقل) —' }].concat((DB.team || []).filter(m => !X.isExited(m) && m.id !== cy.empId).map(m => ({ value: m.id, label: m.name }))) })}</div>`).join('')}` : '') + (!subs.length && !tools.length ? '<p>مفيش تراخيص أو تولات عليه.</p>' : ''),
          onSave: m => { const d = UI.form(m.el), log = []; $$('[data-s]', m.el).filter(i => i.checked).forEach(i => { const x = C.find('subscriptions', i.dataset.s); x.users = x.users.filter(u => u !== cy.empId); C.upsert('subscriptions', x, 'ترخيص'); log.push('رجع ' + x.name); });
            tools.forEach(x => { x.users = x.users.filter(u => u !== cy.empId); const to = d['to_' + x.id]; if (to && !x.users.includes(to)) x.users.push(to); C.upsert('tools', x, 'تول'); log.push(x.code + (to ? ' اتنقل لـ ' + nm(to) : ' رجع')); });
            done({}, 'التراخيص والتولات: ' + (log.join('، ') || 'مفيش')); } });
      }
      if (k === 'finance') { const r = cy.items.find(i => i.key === 'returnDoc'); if (!r.done) throw new Error('مستني توقيع إقرار تسليم العهدة — الحسابات ماتصرفش قبله'); notify(['accountant', 'admin'], '🚪 تسوية نهائية: ' + s.name + ' (' + (s.empNo || '') + ') — العهد اتسلمت', '#/cycle/' + cy.id, '💰'); return done({}, 'اتبعت للحسابات إخطار التسوية النهائية لـ ' + s.name); }
      if (k === 'archive') {
        const left = cy.items.filter(i => i.stage < 8 && !i.done); if (left.length) throw new Error('لسه ' + left.length + ' بنود قبل الأرشفة: ' + left[0].label);
        Object.assign(s, { active: false, status: 'exited', leftAt: cy.date }); C.upsert('team', s, 'Exited');
        DB.mailboxes.filter(b => b.holderId === cy.empId && b.status === 'suspended').forEach(b => { b.status = 'archived'; b.archivedAt = today(); b.deleteAfter = U.addDays(today(), U.num(X.settings().mailRetentionDays) || 90); C.upsert('mailboxes', b, 'أرشفة إيميل'); });
        const c = DB.candidates.find(x => x.empId === cy.empId); if (c) { c.archivedAt = today(); C.upsert('candidates', c, 'أرشفة'); }
        return done({}, (s.empNo || s.name) + ' اتقفل Exited — الملف والإيميل اتأرشفوا (الحذف بعد ' + (X.settings().mailRetentionDays || 90) + ' يوم)');
      }
      if (k === 'position') return UI.modal({ title: 'قرار الوظيفة — ' + (s.role || '') + ' / ' + (s.dept || ''), saveLabel: 'حفظ', body: UI.field({ label: 'القرار', name: 'dec', type: 'select', options: [{ value: 'replace', label: 'فتح REQ لبديل' }, { value: 'cancel', label: 'إلغاء الوظيفة' }] }),
        onSave: m => { const dec = UI.form(m.el).dec; if (dec === 'replace') { const r = { id: U.uid(), no: X.nextCode('REQ'), title: s.role || 'بديل', dept: s.dept, company: s.company, branch: s.branch, count: 1, reason: 'replace', replacesEmpId: s.id, status: 'open', openedAt: today(), by: meName() }; C.upsert('requisitions', r, 'طلب احتياج'); done({ ref: r.no }, 'اتفتح ' + r.no + ' لبديل ' + s.name); } else done({}, 'اتلغت وظيفة ' + (s.role || '') + ' بعد ' + s.name); } });
      // يدوي: تسليم العمل، مستندات الخروج، مقابلة الخروج
      return UI.modal({ title: item.label, saveLabel: 'تم', body: UI.field({ label: 'ملاحظات', name: 'note', type: 'textarea', full: true }), onSave: m => done({ note: UI.form(m.el).note }, item.label + ' — ' + s.name) });
    } catch (e) { UI.toast(e.message, 'err'); }
  }
  function closeOff(cy) {
    const s = staff(cy.empId), left = cy.items.filter(i => !i.done), cus = X.custody(cy.empId);
    if (left.length) throw new Error('الملف ميتقفلش غير لما كل اللي اتعمل في التعيين يتلغي أو يرجع — لسه ' + left.length + ' بنود');
    if (cus.length) throw new Error('لسه عليه: ' + cus.map(x => x.code).join('، '));
    cy.status = 'closed'; cy.closedAt = today(); C.upsert('cycles', cy, 'إغلاق إخلاء');
    X.event('اتقفل الإخلاء ' + cy.no + ' — ' + s.name + ' Exited', { ref: cy.no, empId: cy.empId, cycleId: cy.id });
  }

  // ================= صفحة السيكل (التعيين / الإخلاء) =================
  const tabs = on => `<div class="seg-tabs"><a href="#/onboard" class="${on === 'onboard' ? 'on' : ''}">التعيين · 0 – 8</a><a href="#/offboard" class="${on === 'offboard' ? 'on' : ''}">الإخلاء · X1 – X9</a></div>`;
  P.cycle = function (el, id) {
    const cy = C.find('cycles', id); if (!cy) { el.innerHTML = '<div class="empty">السيكل مش موجود</div>'; return; }
    if (cy.type === 'onboard') syncOn(cy);
    const s = staff(cy.empId), off = cy.type === 'offboard', st = X.cycleStage(cy), c = cand(cy), done = X.cycleDone(cy), total = cy.items.length;
    const cus = X.custody(cy.empId), cc = X.custodyCount(cy.empId);
    const stages = off ? X.OFF_STAGES : X.ON_STAGES;
    const stState = n => { const its = cy.items.filter(i => i.stage === n); if (!its.length) return 'none'; if (its.every(i => i.done || i.skipped)) return 'done'; return n === st ? 'now' : 'todo'; };
    const SL = { done: ['تم', 'good'], now: ['جاري الآن', 'now'], todo: ['لم يبدأ', 'muted'], none: ['—', 'muted'] };
    const statusTxt = off ? (cy.status === 'closed' ? 'Exited' : 'Clearance Open') : (cy.status === 'done' ? 'Active Employee' : c ? X.CSTATUS[c.status][1] : 'Onboarding');
    // المسؤول عن البند: IT بينفّذ بنود IT، والـ HR بينفّذ الباقي، والمدير كله
    const canDo = i => { const r = X.role(); if (r === 'admin') return true; if (r === 'it') return /IT|تلقائي/.test(i.owner); return !/^IT$/.test(i.owner); };
    const btn = i => i.done ? `<span class="small muted">${i.doneAt || ''}${i.by && i.by !== 'تلقائي' ? ' · ' + esc(i.by) : ''}</span>` : i.skipped ? `<span class="small muted">${esc(i.note || 'متخطي')}</span>` : canDo(i) ? `<button class="btn sm" data-do="${i.id}">${off ? 'تنفيذ' : i.stage <= 4 && c ? 'ملف المرشح' : 'تنفيذ'}</button>` : `<span class="small muted">مسؤولية ${esc(i.owner)}</span>`;
    const lastLbl = off ? 'آخر يوم عمل' : 'تاريخ المباشرة';
    // زي التصميم: المكتمل فوق (متشطب) وبعده الباقي بترتيب المراحل
    const items = cy.items.slice().sort((a, b) => (a.done || a.skipped ? 0 : 1) - (b.done || b.skipped ? 0 : 1) || a.stage - b.stage);
    const logs = DB.itLog.filter(x => x.cycleId === cy.id || (x.empId === cy.empId && x.at >= (cy.createdAt || ''))).slice(0, 25);
    const docs = DB.itDocs.filter(d => d.empId === cy.empId && (d.cycleId === cy.id || (off && ['unified', 'annex'].includes(d.kind))));
    el.innerHTML = `<div class="page-head"><div><a href="#/itdash" class="back">→ الرجوع للـ Dashboard</a><h1>سيكل التعيين والإخلاء</h1><p class="sub">${off ? 'الإخلاء = دورة التعيين بالعكس: كل مرحلة بتلغي المرحلة اللي قصادها' : 'من طلب الاحتياج لحد ما الموظف يبقى Active — وكل عهدة مربوطة بكود الموظف'}</p></div>${tabs(cy.type)}</div>
      <div class="panel emp-head"><div class="emp-id"><span class="avatar">${esc((s.name || '؟').trim()[0])}</span><div><b>${esc(s.name || '')}</b><small><span dir="ltr">${esc(s.empNo || '')}</span> · ${esc(s.dept || '')} · ${esc(s.company || company0())} · ${lastLbl}: ${esc(cy.date || '')}${off && cy.reason ? ' · ' + esc(cy.reason) : ''}${c ? ` · <a href="#/cand/${c.id}" dir="ltr">${esc(c.no)}</a>` : ''}</small></div></div>
        <div class="emp-stats"><div><small>المرحلة الحالية</small><b>${cy.status === 'open' ? X.stageLabel(cy, st) : '✓'}</b></div><div><small>أصول في العهدة</small><b>${cc.assets}</b></div><div><small>البنود المكتملة</small><b>${done} / ${total}</b></div><div><small>الحالة</small><b class="${cy.status === 'open' ? (off ? 't-bad' : 't-warn') : 't-good'}">${statusTxt}</b></div></div></div>
      <div class="panel"><div class="panel-head"><h2>مراحل ${off ? 'الإخلاء X1 – X9' : 'التعيين 0 – 8'}</h2><span class="muted small">${off ? 'تحت كل مرحلة: مرحلة التعيين اللي بتلغيها' : 'تحت كل مرحلة: مرحلة الإخلاء اللي بتلغيها'}</span></div>
        <div class="stage-strip">${stages.map(x => { const ss = stState(x.n), l = SL[ss], und = off ? 'بيلغي مرحلة ' + x.undo : (X.undoneBy(x.n) ? 'بيتلغي في X' + X.undoneBy(x.n).n : ''); return `<div class="stg ${ss}"><div class="stg-top"><span class="stg-n">${off ? 'X' + x.n : x.n}</span><small>${l[0]}</small></div><b>${x.t}</b><small class="muted">${und}</small></div>`; }).join('')}</div></div>
      <div class="cyc-grid"><div class="panel"><div class="panel-head"><h2>${off ? 'كشف خلو الطرف (Checklist)' : 'قائمة التعيين (Checklist)'}</h2><span class="muted small">${done} من ${total} مكتمل</span></div>
          <ul class="cl">${items.map(i => `<li class="${i.done ? 'done' : i.skipped ? 'skip' : ''}"><span class="ck">${i.done ? '☑' : i.skipped ? '–' : '☐'}</span><span class="stc">${off ? 'X' + i.stage : i.stage}</span><div class="cl-body"><b>${esc(i.label)}</b><small>المسؤول: ${esc(i.owner)}${i.note ? ' · ' + esc(i.note) : ''}</small></div><span class="mono small cl-ref" dir="ltr">${esc(i.ref || '')}</span>${cy.status === 'open' ? btn(i) : ''}</li>`).join('')}</ul>
          ${off ? `<button class="btn block ${items.every(i => i.done) && !cus.length ? 'primary' : ''}" data-close ${cy.status !== 'open' ? 'disabled' : ''}>${cy.status === 'closed' ? '✓ الإخلاء اتقفل (Exited)' : 'إغلاق الإخلاء (Exited)'}</button><p class="muted small center">الملف ميتقفلش غير لما كل اللي اتعمل في التعيين يتلغي أو يرجع</p>`
            : `<p class="muted small center">${cy.status === 'done' ? '✓ اكتمل التعيين — Active Employee' : 'آخر بند (8) بيفعّل سجل الموظف بعد ما كل اللي قبله يخلص'}</p>`}</div>
        <div>
          <div class="panel"><div class="panel-head"><h2>${off ? 'العهدة اللي لازم ترجع' : 'العهدة المحجوزة والمسلّمة'}</h2><span class="muted small">من asset_assignments</span></div>
            ${UI.table({ rows: off ? cus.filter(x => x.group === 'asset' || x.t === 'tool').concat(DB.assets.filter(a => a.lastHolder === cy.empId && a.status === 'wipe').map(a => ({ t: 'wipe', id: a.id, code: a.tag, type: X.typeName(a), serial: a.serial }))) : DB.assets.filter(a => a.reservedFor === cy.empId).map(a => ({ t: 'res', id: a.id, code: a.tag, type: X.typeName(a), serial: a.serial })).concat(DB.lines.filter(l => l.reservedFor === cy.empId).map(l => ({ t: 'resl', code: l.code, type: 'شريحة', serial: Fin.fmtPhone(l.number) }))).concat(cus.filter(x => x.group === 'asset')), empty: off ? 'مفيش عهد معاه ✓' : 'لسه مفيش عهد', columns: [
              { label: 'الكود', render: x => `<span dir="ltr" class="mono">${esc(x.code)}</span>` }, { label: 'النوع', render: x => esc(x.type) }, { label: 'السيريال', render: x => `<span dir="ltr" class="mono small">${esc(x.serial || '—')}</span>` },
              { label: 'الحالة', render: x => x.t === 'wipe' ? '<span class="badge b-warn">اتسلم · بانتظار Wipe</span>' : x.t === 'res' || x.t === 'resl' ? '<span class="badge b-info">محجوز</span>' : off ? (x.t === 'tool' ? '<span class="badge b-warn">هيتنقل</span>' : '<span class="badge b-bad">لسه معاه</span>') : '<span class="badge b-good">اتسلم فعليًا</span>' }] })}
            ${Fin.printTPForm ? `<div class="doc-card"><span>🖨</span><div><b>بيان العهد — ${off ? 'إخلاء طرف' : 'تعيين جديد'}</b><small>فورم ${esc((global.BRAND || {}).company || 'الشركة')} الورقي متملي من بيانات الموظف وعهدته</small></div><button class="link" data-tpform>طباعة</button></div>` : ''}
            ${docs.map(d => `<div class="doc-card"><span>📄</span><div><b>${X.DOCK[d.kind][0]} <span dir="ltr">${esc(d.no)}</span></b><small>${d.kind === 'clearance' ? 'اتولّد من ' + esc((d.parents || []).join(' و ') || 'العهدة الحالية') : d.kind === 'returnAck' && d.status !== 'signed' && d.status !== 'archived' ? 'مستني آخر يوم · الحسابات ماتصرفش قبله' : esc(X.DOCST[d.status][0])}${d.scanName ? ' · 📎 ' + esc(d.scanName) : ''}</small></div><button class="link" data-doc="${d.id}">${d.kind === 'clearance' ? 'عرض' : 'طباعة'}</button></div>`).join('')}</div>
          <div class="panel"><h2>اللي اتعمل في التعيين ← بيتلغي في الإخلاء</h2>${X.REVERSE.map(r => `<div class="rev-row"><span>${esc(r[0])}</span><span class="muted">←</span><span>${esc(r[1])}</span><span class="badge b-muted" dir="ltr">${r[2]}</span></div>`).join('')}</div>
          <div class="panel"><h2>سجل الحركات</h2><ul class="tl">${logs.map(x => `<li><b>${esc(x.text)}</b><small>${esc(x.by || '')} · ${X.time(x.at)}</small></li>`).join('') || '<li class="muted">—</li>'}</ul></div>
        </div></div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-do]'); if (b) { const it = cy.items.find(i => i.id === b.dataset.do); (off ? doOff : doOn)(cy, it); return; }
      const dc = e.target.closest('[data-doc]'); if (dc) { X.printDoc(C.find('itDocs', dc.dataset.doc)); return; }
      if (e.target.closest('[data-tpform]')) { Fin.printTPForm(cy.empId, off ? 'offboard' : 'onboard'); return; }
      if (e.target.closest('[data-close]')) { try { closeOff(cy); render(); } catch (err) { UI.toast(err.message, 'err'); } }
    };
  };

  // ================= قوائم التعيين والإخلاء =================
  function cycleList(el, type) {
    const off = type === 'offboard', rows = DB.cycles.filter(c => c.type === type).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || (a.date || '').localeCompare(b.date || ''));
    rows.filter(c => !off && c.status === 'open').forEach(syncOn);
    const open = rows.filter(c => c.status === 'open');
    el.innerHTML = `<div class="page-head"><div><h1>${off ? 'الإخلاء (X1 – X9)' : 'التعيين (0 – 8)'}</h1><p class="sub">${off ? 'كل إخلاء بيلغي مرحلة التعيين اللي قصاده — والعهد بتتجمد أول ما الطلب يتفتح' : 'من طلب الاحتياج لحد Active Employee — المراحل 0–4 بتتقفل تلقائي من ملف المرشح'}</p></div>${tabs(type)}</div>
      <div class="actions mb">${off ? '<button class="btn primary" data-new>🚪 طلب إخلاء</button>' : '<a class="btn primary" href="#/cands">من المرشحين المقبولين</a><button class="btn" data-new>تعيين مباشر</button>'}</div>
      <div class="cards mk-cards">${(off ? X.OFF_STAGES : X.ON_STAGES).map(s2 => `<div class="card"><span>${off ? 'X' + s2.n : s2.n} · ${s2.t}</span><b>${open.filter(c => X.cycleStage(c) === s2.n).length}</b></div>`).join('')}</div>
      <div class="panel">${UI.table({ rows, empty: 'لا يوجد', columns: [
        { label: 'الرقم', render: c => `<a href="#/cycle/${c.id}" dir="ltr" class="mono"><b>${esc(c.no)}</b></a>` },
        { label: 'الموظف', render: c => `<a href="#/holder/${c.empId}">${esc(nm(c.empId))}</a><div class="muted small"><span dir="ltr">${esc(staff(c.empId).empNo || '')}</span> · ${esc(staff(c.empId).dept || '')}</div>` },
        { label: off ? 'آخر يوم' : 'المباشرة', render: c => `${c.date || ''}<div class="muted small">${X.inDays(X.days(c.date))}</div>` },
        { label: 'المرحلة', render: c => c.status === 'open' ? `<span class="badge b-${off ? 'bad' : 'info'}">${X.stageLabel(c, X.cycleStage(c))} · ${(off ? X.OFF_STAGES : X.ON_STAGES).find(s2 => s2.n === X.cycleStage(c)).t}</span>` : '<span class="badge b-good">✓</span>' },
        { label: 'التقدّم', render: c => `<span class="meter"><i style="width:${X.cycleDone(c) / c.items.length * 100}%"></i></span> ${X.cycleDone(c)}/${c.items.length}` },
        { label: off ? 'عهد لسه معاه' : 'جاهزية IT', render: c => off ? (X.custodyCount(c.empId).assets || '—') : (c.items.filter(i => i.stage === 5).every(i => i.done || i.skipped) ? '<span class="badge b-good">جاهز</span>' : X.days(c.date) <= 1 && c.status === 'open' ? '<span class="badge b-bad">متأخر</span>' : '<span class="badge b-warn">جاري التجهيز</span>') },
        { label: 'الحالة', render: c => off ? (c.status === 'closed' ? '<span class="badge b-muted">Exited</span>' : '<span class="badge b-bad">Clearance Open</span>') : (c.status === 'done' ? '<span class="badge b-good">Active Employee</span>' : '<span class="badge b-warn">جاري</span>') }] })}</div>
      ${(DB.moves || []).length ? `<p class="muted small">قوائم التعيين والإخلاء القديمة: <a href="#/moves">${DB.moves.length} عملية</a></p>` : ''}`;
    el.onclick = e => { if (!e.target.closest('[data-new]')) return; if (!off) return Fin.startOnboard();
      UI.modal({ title: 'طلب إخلاء — اختار الموظف', saveLabel: 'التالي', body: UI.field({ label: 'الموظف', name: 'sid', type: 'select', options: (DB.team || []).filter(m => !X.openOff(m.id) && (!X.isExited(m) || X.custodyCount(m.id).all)).map(m => ({ value: m.id, label: m.name + (m.empNo ? ' · ' + m.empNo : '') + (X.isExited(m) ? ' (مشي — معاه عهدة)' : '') })) }), onSave: x => { const sid = UI.form(x.el).sid; setTimeout(() => Fin.startOffboard(sid)); } }); };
  }
  P.onboard = el => cycleList(el, 'onboard');
  P.offboard = el => cycleList(el, 'offboard');

  // ================= طلبات الاحتياج (REQ) =================
  Fin.editReq = function (r) {
    r = r || { count: 1, reason: 'new', status: 'open', company: company0(), openedAt: today() };
    UI.modal({ title: r.id ? 'تعديل ' + r.no : 'طلب احتياج جديد', body: `<div class="grid2">${UI.field({ label: 'الوظيفة', name: 'title', value: r.title, required: true })}${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: DEPTS(), value: r.dept })}${UI.field({ label: 'العدد', name: 'count', type: 'number', value: r.count })}${UI.field({ label: 'السبب', name: 'reason', type: 'select', options: [{ value: 'new', label: 'وظيفة جديدة' }, { value: 'replace', label: 'بديل لموظف مشي' }], value: r.reason })}${UI.field({ label: 'الفرع', name: 'branch', type: 'select', options: branches(), value: r.branch })}${UI.field({ label: 'الاحتياجات التقنية المتوقعة', name: 'itNeeds', value: r.itNeeds, placeholder: 'لابتوب ماك + شريحة + Adobe' })}${UI.field({ label: 'ملاحظات', name: 'note', full: true, value: r.note })}</div>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['title', 'الوظيفة']]); const o = Object.assign({}, r, d); if (!o.no) o.no = X.nextCode('REQ'); o.by = o.by || meName(); C.upsert('requisitions', o, 'طلب احتياج'); if (!r.id) X.event('اتفتح ' + o.no + ' · ' + o.title + ' · ' + o.dept, { ref: o.no }); render(); } });
  };
  P.reqs = function (el) {
    UI.listPage(el, { title: 'طلبات الاحتياج', subtitle: 'مرحلة 0: فتح الوظيفة واعتمادها — وكل مرشح بيتربط بطلب', csvName: 'requisitions', actions: '<button class="btn primary" data-act="new">+ طلب احتياج</button>',
      filters: [{ key: 'st', options: [{ value: 'open', label: 'المفتوحة' }, { value: '', label: 'الكل' }, { value: 'filled', label: 'اتقفلت بالتعيين' }, { value: 'cancelled', label: 'اتلغت' }] }], initial: { st: 'open' },
      rows: s => DB.requisitions.filter(r => !s.st || r.status === s.st).slice().reverse(), searchText: r => [r.no, r.title, r.dept].join(' '), empty: 'لا توجد طلبات',
      columns: [{ label: 'الرقم', render: r => `<b dir="ltr" class="mono">${esc(r.no)}</b>`, text: r => r.no }, { label: 'الوظيفة', render: r => `<b>${esc(r.title)}</b><div class="muted small">${esc(r.dept || '')} · ${esc(r.branch || '')}</div>`, text: r => r.title },
        { label: 'السبب', render: r => r.reason === 'replace' ? 'بديل لـ ' + esc(nm(r.replacesEmpId) || '—') : 'جديدة', text: r => r.reason }, { label: 'العدد', cls: 'num', render: r => (r.filled || 0) + ' / ' + r.count },
        { label: 'المرشحين', cls: 'num', render: r => DB.candidates.filter(c => c.reqId === r.id).length }, { label: 'الاعتماد', render: r => r.approvedAt ? `<span class="badge b-good">معتمد</span><div class="muted small">${esc(r.approvedBy || '')}</div>` : (X.role() === 'admin' ? act('approve', r.id, 'اعتماد') : '<span class="badge b-warn">مستني الإدارة</span>') },
        { label: 'الحالة', render: r => ({ open: '<span class="badge b-info">مفتوح</span>', filled: '<span class="badge b-good">اتقفل</span>', cancelled: '<span class="badge b-muted">اتلغى</span>' })[r.status] || '' },
        { label: '', noExport: true, render: r => act('edit', r.id, 'تعديل') + (r.status === 'open' ? act('cancel', r.id, 'إلغاء', 'danger') : '') }],
      onAction: (k, id) => { const r = DB.requisitions.find(x => x.id === id); if (k === 'new') Fin.editReq(); if (k === 'edit') Fin.editReq(r);
        if (k === 'approve') { r.approvedAt = today(); r.approvedBy = meName(); C.upsert('requisitions', r, 'اعتماد'); X.event('اتعتمد ' + r.no, { ref: r.no }); render(); }
        if (k === 'cancel' && confirm('إلغاء ' + r.no + '؟')) { r.status = 'cancelled'; C.upsert('requisitions', r, 'إلغاء'); render(); } } });
  };

  // ================= المرشحين والمقابلات (CAN) =================
  const applyUrl = (q) => { const base = X.settings().onboardBase || (location.origin + location.pathname.replace(/[^/]*$/, '') + 'apply.html'); return base + (q || ''); };
  const qrSvg = text => { if (typeof global.qrcode !== 'function') return ''; const q = global.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); };
  Fin.editCand = function (c) {
    const isNew = !c; c = c || { source: 'استقبال', appliedAt: today(), status: 'applied', interviews: [], checkpoints: [] };
    UI.modal({ title: isNew ? 'مرشح جديد' : 'تعديل ' + c.no, body: `<div class="grid2">${UI.field({ label: 'الاسم', name: 'name', value: c.name, required: true })}${UI.field({ label: 'الموبايل', name: 'phone', value: c.phone, attrs: 'dir="ltr"' })}${UI.field({ label: 'الإيميل', name: 'email', value: c.email, attrs: 'dir="ltr"' })}
      ${UI.field({ label: 'طلب الاحتياج', name: 'reqId', type: 'select', options: [{ value: '', label: '— —' }].concat(DB.requisitions.filter(r => r.status === 'open' || r.id === c.reqId).map(r => ({ value: r.id, label: r.no + ' · ' + r.title }))), value: c.reqId })}
      ${UI.field({ label: 'الوظيفة', name: 'jobTitle', value: c.jobTitle })}${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: DEPTS(), value: c.dept })}${UI.field({ label: 'المصدر', name: 'source', type: 'select', options: (Fin.list ? Fin.list('candSources') : ['QR Code', 'Google Form', 'استقبال', 'إحالة', 'LinkedIn', 'Wuzzuf / Bayt']), value: c.source })}${UI.field({ label: 'سنين الخبرة', name: 'years', type: 'number', value: c.years })}${UI.field({ label: 'ملاحظات', name: 'note', full: true, value: c.note })}</div>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الاسم']]); if (d.reqId && !d.jobTitle) { const r = DB.requisitions.find(x => x.id === d.reqId); d.jobTitle = r.title; d.dept = r.dept; } const o = Object.assign({}, c, d); if (!o.no) o.no = X.nextCode('CAN'); C.upsert('candidates', o, 'مرشح'); if (isNew) X.event('اتسجل المرشح ' + o.no + ' · ' + o.name + ' (' + o.source + ')', { ref: o.no }); if (isNew) global.Router.go('#/cand/' + o.id); else render(); } });
  };
  P.cands = function (el) {
    const st = P.cands._s = P.cands._s || { status: '' }, K = Object.keys(X.CSTATUS);
    const rows = DB.candidates.filter(c => !c.archivedAt && (!st.status || c.status === st.status)).slice().sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
    el.innerHTML = `<div class="page-head"><div><h1>المرشحين والمقابلات</h1><p class="sub">من التقديم (QR Code / Google Form) للمقابلات والقرار — كل البيانات على سجل واحد للمرشح ثم الموظف من غير تكرار إدخال</p></div><div class="actions"><button class="btn" data-act="qr">▦ QR التقديم</button><button class="btn primary" data-act="new">+ مرشح</button></div></div>
      <div class="state-grid">${K.map(k => `<button class="state ${st.status === k ? 'on' : ''}" data-st="${k}"><b>${DB.candidates.filter(c => c.status === k && !c.archivedAt).length}</b><span>${X.CSTATUS[k][1]}</span><small>${X.CSTATUS[k][0]}</small></button>`).join('')}</div>
      <div class="panel">${UI.table({ rows, empty: 'لا يوجد مرشحين', columns: [
        { label: 'Candidate ID', render: c => `<a href="#/cand/${c.id}" dir="ltr" class="mono"><b>${esc(c.no)}</b></a>` }, { label: 'الاسم', render: c => `<a href="#/cand/${c.id}"><b>${esc(c.name)}</b></a><div class="muted small">${esc(c.source || '')} · ${c.appliedAt || ''}</div>` },
        { label: 'الوظيفة', render: c => esc(c.jobTitle || '') + `<div class="muted small">${esc(c.dept || '')}</div>` },
        { label: 'المقابلات', render: c => (c.interviews || []).map(i => `<span class="badge b-${i.evaluatedAt ? (i.recommendation === 'reject' ? 'bad' : 'good') : 'muted'}">${i.kind === 'hr' ? 'HR' : 'فني'}${i.score ? ' ' + i.score + '/5' : ''}</span>`).join(' ') || '—' },
        { label: 'المباشرة', render: c => c.joiningDate || '—' }, { label: 'الحالة', render: c => X.cBadge(c.status) }] })}</div>`;
    el.onclick = e => { const s2 = e.target.closest('[data-st]'); if (s2) { st.status = st.status === s2.dataset.st ? '' : s2.dataset.st; return render(); } const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'new') Fin.editCand();
      if (b.dataset.act === 'qr') { const u = X.settings().formUrl || applyUrl('?src=qr'); UI.modal({ title: 'QR Code للتقديم (الاستقبال)', body: `<div class="qr-box">${qrSvg(u)}<p dir="ltr" class="small">${esc(u)}</p><p class="muted small">اطبعه وحطه في الاستقبال، أو ابعت الرابط. التقديم بيعمل Candidate ID موحد على طول.</p></div>`, extraButtons: '<button class="btn" data-pq>🖨 طباعة</button>', onOpen: m => { $('[data-pq]', m.el).onclick = () => UI.print(UI.printHeader('قدّم على وظيفة', '', '', 'Apply now') + `<div class="qr-print">${qrSvg(u)}<p>امسح الكود بالموبايل وقدّم</p></div>`); } }); } };
  };
  P.cand = function (el, id) {
    const c = DB.candidates.find(x => x.id === id); if (!c) { el.innerHTML = '<div class="empty">المرشح مش موجود</div>'; return; }
    const priv = X.canSeePersonal(), req = DB.requisitions.find(r => r.id === c.reqId), cy = c.cycleId && C.find('cycles', c.cycleId);
    const iv = c.interviews || [], cps = c.checkpoints || [], dec = c.decision || {};
    const link = c.token ? applyUrl('#/onb/' + c.token) : '';
    const wa = () => { const d = c.joiningDate || '', msg = `أهلًا ${c.name} 👋\nميعاد المباشرة: ${d} الساعة ${c.joiningTime || '9:00 ص'}\nالعنوان: ${c.joiningAddress || ''}\nتعليمات الحضور: هات أصل البطاقة، وتعالى قبل الميعاد بـ 15 دقيقة.\nCandidate ID: ${c.no}`; return 'https://wa.me/' + String(c.phone || '').replace(/[^\d]/g, '').replace(/^0/, '20') + '?text=' + encodeURIComponent(msg); };
    const flow = ['applied', 'interview', 'hrEval', 'techEval', 'accepted', 'docs', 'joining', 'handover', 'signature', 'active'], idx = flow.indexOf(c.status);
    el.innerHTML = `<div class="page-head"><div><a href="#/cands" class="back">→ المرشحين</a><h1>${esc(c.name)} <span dir="ltr" class="mono">${esc(c.no)}</span> ${X.cBadge(c.status)}</h1><p class="sub">${esc(c.jobTitle || '')} · ${esc(c.dept || '')}${req ? ' · <span dir="ltr">' + esc(req.no) + '</span>' : ''} · ${esc(c.source || '')} · قدّم ${c.appliedAt || ''}</p></div>
      <div class="actions">${cy ? `<a class="btn primary" href="#/cycle/${cy.id}">سيكل التعيين ${esc(cy.no)}</a>` : c.decision && c.decision.result === 'accepted' ? '<button class="btn primary" data-act="start">بدء التعيين (0 – 8)</button>' : ''}${priv ? '<button class="btn ghost" data-act="edit">تعديل</button>' : ''}</div></div>
      <div class="flow">${flow.map((k, i) => `<span class="${i < idx ? 'past' : i === idx ? 'cur' : ''}">${X.CSTATUS[k][1]}</span>`).join('')}${c.status === 'rejected' ? '<span class="cur bad">Not Accepted</span>' : c.status === 'pending' ? '<span class="cur">Pending</span>' : ''}</div>
      <div class="dash-grid">
        <div class="panel"><h2>01 · التقديم والتسجيل</h2>${priv ? `<table class="tbl compact"><tbody><tr><td>الموبايل</td><td dir="ltr">${esc(c.phone || '—')}</td></tr><tr><td>الإيميل</td><td dir="ltr">${esc(c.email || '—')}</td></tr><tr><td>رقم الهوية</td><td dir="ltr">${esc(c.nationalId || '—')}</td></tr><tr><td>الخبرة</td><td>${esc(c.years || '—')} سنين</td></tr><tr><td>ملاحظات</td><td>${esc(c.note || '')}</td></tr></tbody></table>` : '<p class="muted small">🔒 البيانات الشخصية متاحة لـ HR والإدارة بس (صلاحيات حسب الدور الوظيفي).</p>'}
          <div class="row-line"><span>تسجيل الوصول في الاستقبال</span>${c.arrivedAt ? `<b>${X.time(c.arrivedAt)}</b>` : '<button class="btn sm" data-act="arrive">تسجيل وصول</button>'}</div></div>
        <div class="panel"><div class="panel-head"><h2>02 · المقابلات والتقييمات</h2><button class="btn sm" data-act="sched">+ تحديد مقابلة</button></div>
          ${iv.map(i => `<div class="iv"><div><b>${i.kind === 'hr' ? '1st Interview — HR' : '2nd Interview — Technical / Manager'}</b><small>${esc(i.at ? i.at.replace('T', ' ') : '')} · ${esc(i.interviewer || '')} · ${i.attended === false ? '<span class="t-bad">محضرش</span>' : i.attended ? 'حضر' : 'مستني'}</small>${i.evaluatedAt ? `<div>التقييم: <b>${i.score}/${i.scale || 5}</b> · التوصية: <b>${{ accept: 'قبول', reject: 'رفض', another: 'مقابلة تانية' }[i.recommendation] || ''}</b> · المقيّم: ${esc(i.evaluator || '')} · ${i.evaluatedAt}</div>${priv || X.role() !== 'it' ? `<div class="muted small">${esc(i.notes || '')}</div>` : ''}` : ''}</div>${!i.evaluatedAt ? `<button class="btn sm" data-ev="${i.id}">تسجيل التقييم</button>` : ''}</div>`).join('') || '<div class="muted small">لسه مفيش مقابلات</div>'}
          ${iv.some(i => i.kind === 'hr' && i.evaluatedAt) && iv.some(i => i.kind === 'tech' && i.evaluatedAt) ? '<p class="small t-good">✓ Interview Evaluation Completed — النتيجتين في ملف واحد</p>' : ''}</div>
        <div class="panel"><h2>03 · قرار التوظيف</h2>${dec.result ? `<p><b class="${dec.result === 'accepted' ? 't-good' : dec.result === 'rejected' ? 't-bad' : 't-warn'}">${{ accepted: '✓ Accepted', rejected: '✕ Not Accepted', pending: 'Pending', reschedule: 'Reschedule', another: 'Another Interview' }[dec.result]}</b> · ${esc(dec.by || '')} · ${dec.at || ''}</p><p class="muted small">${esc(dec.note || '')}</p>` : '<p class="muted small">لسه متاخدش قرار</p>'}
          <div class="actions"><button class="btn sm" data-act="decide">اعتماد القرار</button>${dec.result === 'accepted' ? (c.offerSentAt ? (c.offerAcceptedAt ? `<span class="badge b-good">العرض اتقبل ${c.offerAcceptedAt}</span>` : '<button class="btn sm" data-act="offerOk">العرض اتقبل</button>') : '<button class="btn sm" data-act="offer">إرسال العرض</button>') : ''}</div></div>
        <div class="panel"><h2>04 · المستندات قبل العمل (Pre-Onboarding)</h2>${dec.result !== 'accepted' ? '<p class="muted small">بتبدأ بعد القبول.</p>' : `
          <div class="row-line"><span>الرابط الشخصي</span>${link ? `<span><a href="${esc(link)}" target="_blank" rel="noopener" dir="ltr" class="small">فتح ↗</a> <button class="link" data-act="copy">نسخ</button> ${c.linkSentAt ? '<span class="badge b-good">اتبعت</span>' : '<button class="btn sm" data-act="sent">اتبعت</button>'}</span>` : '<button class="btn sm" data-act="token">إنشاء الرابط</button>'}</div>
          <table class="tbl compact"><thead><tr><th>المستند</th><th>الإصدار</th><th>اطلعت على</th><th>وافقت على</th></tr></thead><tbody>${X.PRE_DOCS.map(d => { const cp = a => cps.find(x => x.doc === d.key && x.action === a); const cell = a => !d.need.includes(a) ? '<span class="muted">—</span>' : cp(a) ? `<span class="t-good">✓</span> <small class="muted">${X.time(cp(a).at)}</small>` : '<span class="muted">☐</span>'; return `<tr><td>${d.t}</td><td dir="ltr">${d.ver}</td><td>${cell('read')}</td><td>${cell('agree')}</td></tr>`; }).join('')}</tbody></table>
          <p class="muted small">تأكيد القراءة وحده لا يعني توقيع العقد أو تسليم عهدة.</p>
          <div class="row-line"><span>تحقق HR من المستندات</span>${c.docsVerifiedAt ? `<b class="t-good">✓ ${c.docsVerifiedAt} · ${esc(c.docsVerifiedBy || '')}</b>` : '<button class="btn sm" data-act="verify">تأكيد</button>'}</div>
          <div class="grid3">${UI.field({ label: 'تاريخ المباشرة', name: 'joiningDate', type: 'date', value: c.joiningDate })}${UI.field({ label: 'الساعة', name: 'joiningTime', value: c.joiningTime || '9:00 ص' })}${UI.field({ label: 'العنوان', name: 'joiningAddress', value: c.joiningAddress || '' })}</div>
          <div class="actions"><button class="btn sm" data-act="saveJoin">حفظ الميعاد</button>${c.joiningDate && c.phone ? `<a class="btn sm" href="${wa()}" target="_blank" rel="noopener" data-act="wa">💬 تأكيد على واتساب</a>` : ''}${c.joinConfirmSentAt ? `<span class="badge b-good">اتبعت ${c.joinConfirmSentAt}</span>` : ''}</div>`}</div>
      </div>`;
    el.onclick = e => {
      const ev = e.target.closest('[data-ev]'); if (ev) return evaluate(c, iv.find(i => i.id === ev.dataset.ev));
      const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act, save = (msg) => { C.upsert('candidates', c, 'مرشح'); if (msg) X.event(msg, { ref: c.no, empId: c.empId }); if (cy) syncOn(cy); render(); };
      if (k === 'edit') Fin.editCand(c);
      if (k === 'arrive') { c.arrivedAt = new Date().toISOString(); save('وصل المرشح ' + c.no + ' الاستقبال'); }
      if (k === 'sched') UI.modal({ title: 'تحديد مقابلة — ' + c.name, saveLabel: 'حفظ', body: `<div class="grid2">${UI.field({ label: 'النوع', name: 'kind', type: 'select', options: [{ value: iv.some(i => i.kind === 'hr') ? 'tech' : 'hr', label: iv.some(i => i.kind === 'hr') ? '2nd — Technical / Manager' : '1st — HR' }, { value: iv.some(i => i.kind === 'hr') ? 'hr' : 'tech', label: iv.some(i => i.kind === 'hr') ? '1st — HR' : '2nd — Technical / Manager' }] })}${UI.field({ label: 'الميعاد', name: 'at', type: 'datetime-local', value: U.addDays(today(), 1) + 'T11:00' })}${UI.field({ label: 'المسؤول عن المقابلة', name: 'interviewer', value: meName() })}</div>`,
        onSave: m => { const d = UI.form(m.el); c.interviews = iv.concat([{ id: U.uid(), kind: d.kind, at: d.at, interviewer: d.interviewer, attended: null }]); if (['applied', 'pending'].includes(c.status)) c.status = 'interview'; save('اتحددت مقابلة ' + (d.kind === 'hr' ? 'HR' : 'فنية') + ' لـ ' + c.no + ' · ' + d.at.replace('T', ' ')); } });
      if (k === 'decide') UI.modal({ title: 'Final Hiring Decision — ' + c.name, saveLabel: 'اعتماد', body: `<div class="grid2">${UI.field({ label: 'القرار', name: 'result', type: 'select', options: [{ value: 'accepted', label: '✓ Accepted — للـ Pre-Onboarding' }, { value: 'rejected', label: '✕ Not Accepted — حفظ وإغلاق الطلب' }, { value: 'pending', label: 'Pending' }, { value: 'reschedule', label: 'Reschedule' }, { value: 'another', label: 'Another Interview' }], value: dec.result })}${UI.field({ label: 'صاحب القرار', name: 'by', value: meName() })}${UI.field({ label: 'ملاحظات', name: 'note', full: true })}</div>`,
        onSave: m => { const d = UI.form(m.el); c.decision = { result: d.result, by: d.by, at: today(), note: d.note }; c.status = d.result === 'accepted' ? 'accepted' : d.result === 'rejected' ? 'rejected' : d.result === 'pending' ? 'pending' : 'interview'; if (d.result === 'rejected') c.closedAt = today(); save('قرار التوظيف لـ ' + c.no + ': ' + d.result); } });
      if (k === 'offer') { c.offerSentAt = today(); save('اتبعت العرض الوظيفي لـ ' + c.no); }
      if (k === 'offerOk') { c.offerAcceptedAt = today(); save(c.no + ' قبل العرض'); }
      if (k === 'token') { c.token = U.uid() + U.uid(); c.status = 'docs'; save('اتعمل رابط Onboarding شخصي لـ ' + c.no); }
      if (k === 'copy') { try { navigator.clipboard.writeText(link); UI.toast('اتنسخ الرابط'); } catch (er) { prompt('انسخ الرابط:', link); } }
      if (k === 'sent') { c.linkSentAt = today(); save('اتبعت رابط Onboarding لـ ' + c.no); }
      if (k === 'verify') { const miss = X.PRE_DOCS.filter(d => d.need.some(a => !(c.checkpoints || []).some(x => x.doc === d.key && x.action === a))); if (miss.length && !confirm('لسه ناقص: ' + miss.map(d => d.t).join('، ') + ' — تأكيد برضه؟')) return; c.docsVerifiedAt = today(); c.docsVerifiedBy = meName(); save('HR Document Verification لـ ' + c.no); }
      if (k === 'saveJoin') { const d = UI.form(el); Object.assign(c, { joiningDate: d.joiningDate, joiningTime: d.joiningTime, joiningAddress: d.joiningAddress }); if (cy && d.joiningDate) { cy.date = d.joiningDate; C.upsert('cycles', cy, 'تعيين'); } save('ميعاد مباشرة ' + c.no + ': ' + d.joiningDate + ' ' + d.joiningTime); }
      if (k === 'wa') { c.joinConfirmSentAt = today(); C.upsert('candidates', c, 'مرشح'); X.event('اتبعت تأكيد المباشرة على واتساب لـ ' + c.no, { ref: c.no }); if (cy) syncOn(cy); setTimeout(render, 300); }
      if (k === 'start') Fin.startOnboard(c.id);
    };
  };
  function evaluate(c, i) {
    UI.modal({ title: (i.kind === 'hr' ? 'تقييم HR' : 'التقييم الفني / الإداري') + ' — ' + c.name, saveLabel: 'حفظ التقييم', body: `<div class="grid2">${UI.field({ label: 'حضر؟', name: 'attended', type: 'select', options: [{ value: 'yes', label: 'حضر' }, { value: 'no', label: 'محضرش' }] })}${UI.field({ label: 'التقييم (1–5)', name: 'score', type: 'number', value: 3 })}${UI.field({ label: 'التوصية', name: 'recommendation', type: 'select', options: [{ value: 'accept', label: 'قبول' }, { value: 'reject', label: 'رفض' }, { value: 'another', label: 'مقابلة تانية' }] })}${UI.field({ label: 'اسم المقيّم', name: 'evaluator', value: i.interviewer || meName() })}${UI.field({ label: i.kind === 'hr' ? 'الانطباع الأول والملاحظات' : 'الملاحظات الفنية', name: 'notes', type: 'textarea', full: true })}</div>`,
      onSave: m => { const d = UI.form(m.el); if (d.attended === 'no') { i.attended = false; } else { Object.assign(i, { attended: true, score: Math.max(1, Math.min(5, U.num(d.score))), recommendation: d.recommendation, evaluator: d.evaluator, notes: d.notes, evaluatedAt: today() }); c.status = i.kind === 'hr' ? 'hrEval' : 'techEval'; }
        C.upsert('candidates', c, 'تقييم'); X.event((i.kind === 'hr' ? 'HR Review Submitted' : 'Technical Evaluated') + ' · ' + c.no + (i.score ? ' · ' + i.score + '/5' : ' · محضرش'), { ref: c.no }); render(); } });
  }

  // ================= العهد والإقرارات (DOC) =================
  P.docs = function (el) {
    UI.listPage(el, { title: 'العهد والإقرارات', subtitle: 'الإقرار الموحد (8 أقسام) · ملاحق العهدة · كشف خلو الطرف · إقرار تسليم العهدة · شهادات مسح الداتا — طباعة ← توقيع ورقي ← مسح ضوئي وأرشفة', csvName: 'it-documents',
      filters: [{ key: 'kind', options: [{ value: '', label: 'كل المستندات' }].concat(Object.entries(X.DOCK).map(([k, v]) => ({ value: k, label: v[0] }))) }, { key: 'st', options: [{ value: '', label: 'كل الحالات' }, { value: 'wait', label: 'مستني توقيع أو مسح' }].concat(Object.entries(X.DOCST).map(([k, v]) => ({ value: k, label: v[0] }))) }],
      rows: s => DB.itDocs.filter(d => (!s.kind || d.kind === s.kind) && (!s.st || (s.st === 'wait' ? ['draft', 'printed', 'signed'].includes(d.status) && d.kind !== 'clearance' : d.status === s.st))).slice().reverse(),
      searchText: d => [d.no, nm(d.empId), X.DOCK[d.kind][0], (d.items || []).map(i => i.code).join(' ')].join(' '), empty: 'لا توجد مستندات',
      columns: [{ label: 'الرقم', render: d => `<b dir="ltr" class="mono">${esc(d.no)}</b>`, text: d => d.no }, { label: 'المستند', render: d => X.DOCK[d.kind][0] + (d.parents && d.parents.length ? `<div class="muted small">من ${esc(d.parents.join('، '))}</div>` : ''), text: d => X.DOCK[d.kind][0] },
        { label: 'الموظف', render: d => d.empId ? `<a href="#/holder/${d.empId}">${esc(nm(d.empId))}</a>` : '—', text: d => nm(d.empId) }, { label: 'البنود', cls: 'num', render: d => (d.items || []).length }, { label: 'التاريخ', render: d => d.date, text: d => d.date },
        { label: 'الحالة', render: d => `<span class="badge b-${X.DOCST[d.status][1]}">${X.DOCST[d.status][0]}</span>${d.scanName ? `<div class="small">📎 ${d.scanData ? `<a href="${d.scanData}" download="${esc(d.scanName)}">${esc(d.scanName)}</a>` : esc(d.scanName)}</div>` : ''}`, text: d => X.DOCST[d.status][0] },
        { label: '', noExport: true, render: d => act('print', d.id, '🖨 طباعة') + (['draft', 'printed'].includes(d.status) && d.kind !== 'clearance' ? act('sign', d.id, '✍ اتوقّع') : '') + (d.status === 'signed' ? act('scan', d.id, '⬆ رفع السكان') : '') }],
      onAction: (k, id) => { const d = C.find('itDocs', id); if (k === 'print') X.printDoc(d); if (k === 'sign') { X.setDocStatus(d, 'signed'); syncCycleDoc(d); render(); } if (k === 'scan') X.uploadScan(d, () => { syncCycleDoc(d); render(); }); } });
  };
  // توقيع / رفع من صفحة المستندات يقفل البند المقابل في السيكل
  function syncCycleDoc(d) {
    const cy = d.cycleId && C.find('cycles', d.cycleId); if (!cy || cy.status !== 'open') return;
    const key = d.kind === 'unified' ? (d.status === 'archived' ? ['sign', 'scan'] : ['sign']) : d.kind === 'returnAck' && ['signed', 'archived'].includes(d.status) ? ['returnDoc'] : [];
    key.forEach(k => { const i = cy.items.find(x => x.key === k); if (i && !i.done) mark(cy, i, { ref: d.no }); });
  }

  // البحث: الأكواد الجديدة
  const baseSearch = UI.search;
  if (global.APP && global.APP.id === 'it') UI.search = function (q) {
    const res = baseSearch ? baseSearch(q) : []; q = String(q || '').trim().toLowerCase(); if (q.length < 2) return res;
    const has = (...xs) => xs.some(x => x != null && String(x).toLowerCase().includes(q));
    (DB.team || []).forEach(m => { if (has(m.empNo)) res.unshift({ ic: '🪪', t: m.empNo + ' — ' + m.name, s: m.dept || '', h: '#/holder/' + m.id }); });
    DB.candidates.forEach(c => { if (has(c.no, c.name, c.phone)) res.push({ ic: '🧑‍💼', t: c.no + ' — ' + c.name, s: 'مرشح · ' + X.CSTATUS[c.status][0], h: '#/cand/' + c.id }); });
    DB.cycles.forEach(c => { if (has(c.no)) res.push({ ic: c.type === 'onboard' ? '🟢' : '🚪', t: c.no + ' — ' + nm(c.empId), s: c.type === 'onboard' ? 'تعيين' : 'إخلاء', h: '#/cycle/' + c.id }); });
    DB.itDocs.forEach(d => { if (has(d.no)) res.push({ ic: '📄', t: d.no + ' — ' + X.DOCK[d.kind][0], s: nm(d.empId), h: '#/docs' }); });
    DB.requisitions.forEach(r => { if (has(r.no, r.title)) res.push({ ic: '📋', t: r.no + ' — ' + r.title, s: 'طلب احتياج', h: '#/reqs' }); });
    DB.tools.forEach(x => { if (has(x.code, x.name, x.account)) res.push({ ic: '🧩', t: x.code + ' — ' + x.name, s: 'تول', h: '#/tool/' + x.id }); });
    DB.netPackages.forEach(x => { if (has(x.code, x.name)) res.push({ ic: '🌐', t: x.code + ' — ' + x.name, s: 'باقة', h: '#/net' }); });
    DB.domains.forEach(x => { if (has(x.code, x.name)) res.push({ ic: '🔐', t: x.code + ' — ' + x.name, s: 'دومين / SSL', h: '#/domains' }); });
    DB.mailboxes.forEach(b => { if (has(b.code)) res.push({ ic: '✉️', t: b.code + ' — ' + b.address, s: 'إيميل', h: '#/mail' }); });
    DB.lines.forEach(l => { if (has(l.code)) res.push({ ic: '📶', t: l.code + ' — ' + (Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number), s: 'شريحة', h: '#/lines' + l.country }); });
    return res.slice(0, 40);
  };
})(window);
