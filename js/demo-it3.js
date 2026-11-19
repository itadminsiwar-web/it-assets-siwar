/* =========================================================
   demo-it3.js — بيانات تجريبية لنظام IT الجديد (مرة واحدة: flag it3Init)
   أكواد ثابتة · شركات وفروع · تولات وتوكن · باقات · دومينات وSSL · باك أب · مستهلكات
   طلبات احتياج · مرشحين ومقابلات · سيكلات تعيين 0–8 وإخلاء X1–X9 · إقرارات · جرد · أخطاء مزامنة
   ========================================================= */
(function (global) {
  'use strict';
  const Demo = global.Demo = global.Demo || {};
  Demo.seedIT3 = function (db) {
    const U = global.U, X = global.ITX, t = U.today(), d = n => U.addDays(t, -n), f = n => U.addDays(t, n);
    const iso = (daysAgo, h, m) => { const x = new Date(); x.setDate(x.getDate() - daysAgo); x.setHours(h == null ? 10 : h, m || 0, 0, 0); return x.toISOString(); };
    X.ensure();
    const code = (pfx, n) => { db.seq['c_' + pfx] = n != null ? n : (db.seq['c_' + pfx] || 0) + 1; return pfx + '-' + String(db.seq['c_' + pfx]).padStart({ DEV: 4, MOB: 3, ACC: 3, 'SIM-SA': 3, 'SIM-EG': 3, NET: 3, TOOL: 3, LIC: 3, DOM: 3, BKP: 2, CON: 3, EMP: 3, CAN: 4, REQ: 4, ONB: 4, OFF: 4, DOC: 5, STK: 3 }[pfx] || 3, '0'); };
    const CO = db.settings.companyName || 'SEG', DOM = db.settings.emailDomain || 'seg.example', BR = (global.BRAND || {}).branches || [];
    const RY = BR[0] || 'الفرع الرئيسي — الرياض', CA = BR[1] || 'مكتب القاهرة', ST = BR[2] || 'المخزن';
    Object.assign(db.itSettings, { companies: [{ name: CO, branches: [RY, CA, ST] }], vaultUrl: 'https://vault.bitwarden.com', lastSync: new Date(Date.now() - 5 * 60000).toISOString(), lastSyncOk: true, replaceYears: 4 });
    const ev = (text, at, by, o) => db.itLog.push(Object.assign({ id: U.uid(), at, by: by || 'النظام', text, ref: '', empId: '', cycleId: '' }, o || {}));
    const by = n => db.team.find(m => m.name === n) || {};
    const brOf = loc => loc === 'الرياض' ? RY : CA;

    // ---- الموظفين: كود EMP ثابت + شركة وفرع ----
    db.seq.c_EMP = 0;
    const addT = (name, role, dept, location, extra) => { const m = Object.assign({ id: U.uid(), name, role, dept, location, active: true }, extra || {}); db.team.push(m); return m; };
    const yasser = addT('ياسر الشهري', 'مدير إداري', 'الإدارة', 'الرياض', { startDate: d(900) });
    db.team.forEach(m => { m.empNo = code('EMP'); m.company = CO; m.branch = brOf(m.location); m.status = m.active === false ? 'exited' : 'active'; if (!m.dept) m.dept = 'التسويق'; if (!m.startDate) m.startDate = d(200 + Math.floor(Math.random() * 400)); });
    const S = { gm: by('فيصل الحربي'), acc: by('دينا مصطفى'), it: by('هشام علي'), hr: by('نهى سمير'), ex: by('طارق يوسف'), sara: by('سارة محمود'), ahmed: by('أحمد حسن'), mona: by('منى عادل'), karim: by('كريم سامي'), reem: by('ريم العتيبي'), omar: by('عمر فاروق'), yousef: by('يوسف كمال') };
    const yb = db.mailboxes.find(b => b.address.startsWith('yasser@')); if (yb) yb.holderId = yasser.id;
    if (!db.users.some(u => u.email === 'hr@example.com')) db.users.push({ id: 'u_hr', name: 'نهى سمير', email: 'hr@example.com', role: 'hr', passHash: '694be904d60ca167385404d2109636272c2fc705a851d0cac877bd14ab1c78bf' }); // Hr@12345

    // ---- الأجهزة: الكود الثابت (DEV / MOB / ACC) + الفرع + MDM / أنتي فيروس / تحديثات ----
    db.seq.c_DEV = 30; db.seq.c_MOB = 10; db.seq.c_ACC = 15;
    db.assets.forEach((a, i) => {
      a.oldTag = a.tag; a.tag = code(a.type === 'mobile' ? 'MOB' : a.type === 'accessory' ? 'ACC' : 'DEV');
      a.company = CO; a.branch = brOf(a.location);
      a.mdm = ['laptop', 'mobile', 'tablet'].includes(a.type) && i % 5 !== 3; a.av = i % 9 !== 4; a.patched = i % 5 !== 1;
    });
    const A = (type, brand, model, serial, cost, cur, boughtAgo, warrantyM, loc, holder, extra) => {
      const a = Object.assign({ id: U.uid(), tag: code(type === 'mobile' ? 'MOB' : type === 'accessory' ? 'ACC' : 'DEV'), type, brand, model, serial, specs: '', cost, currency: cur, purchaseDate: d(boughtAgo), warrantyEnd: warrantyM ? U.addMonths(d(boughtAgo), warrantyM) : '', location: loc, company: CO, branch: brOf(loc), supplier: cur === 'EGP' ? 'B.TECH - القاهرة' : 'جرير - الرياض', condition: 'جيد', status: holder ? 'assigned' : 'ready', holderId: holder ? holder.id : '', assignedAt: holder ? d(Math.max(1, boughtAgo - 3)) : '', mdm: true, av: true, patched: true, createdAt: iso(boughtAgo) }, extra || {});
      db.assets.push(a); db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'create', date: a.purchaseDate, note: brand + ' ' + model });
      if (holder) db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'assign', date: a.assignedAt, holderId: holder.id, condition: 'جيد' });
      return a;
    };
    const charger = A('accessory', 'HP', 'شاحن 65W USB-C', '', 250, 'SAR', 120, 0, 'الرياض', S.omar, { mdm: false });
    A('accessory', 'Apple', 'شاحن 96W USB-C', '', 329, 'SAR', 280, 0, 'القاهرة', S.ahmed, { mdm: false });
    A('accessory', 'Logitech', 'MX Keys + MX Master', 'LGT-MX-5521', 4500, 'EGP', 200, 12, 'القاهرة', S.sara, { mdm: false });
    A('laptop', 'Lenovo', 'ThinkPad E14 Gen 5', 'PF5RZ1QA', 38000, 'EGP', 25, 24, 'القاهرة', null);
    A('laptop', 'Dell', 'Latitude 3540', 'DLAT-3540-12KX', 2900, 'SAR', 40, 24, 'الرياض', null);
    A('laptop', 'HP', 'ProBook 440 G9', '5CD2041HJK', 3100, 'SAR', 30, 24, 'الرياض', null, { status: 'stock', mdm: false });
    A('mobile', 'Samsung', 'Galaxy A35', '352211998877665', 1199, 'SAR', 20, 12, 'الرياض', null);
    A('laptop', 'Apple', 'MacBook Air 13 M3', 'C02MA13M3Q1', 4999, 'SAR', 15, 12, 'القاهرة', null);
    A('laptop', 'Lenovo', 'ThinkPad L14 Gen 4', 'PF4L14G4ZZ', 3300, 'SAR', 18, 24, 'الرياض', null);
    A('mobile', 'Samsung', 'Galaxy A55', '352211998877001', 1599, 'SAR', 12, 12, 'الرياض', null);
    A('monitor', 'Dell', 'P2422H 24"', 'CN-0P2422-77', 750, 'SAR', 60, 36, 'الرياض', null, { mdm: false });
    A('laptop', 'Dell', 'Inspiron 15 3511', 'DINS-3511-OLD', 21000, 'EGP', 1650, 12, 'القاهرة', null, { status: 'stock', condition: 'مقبول', av: false, patched: false, mdm: false });
    A('laptop', 'Lenovo', 'ThinkPad T470', 'PF0OLD470', 2600, 'SAR', 1900, 12, 'الرياض', null, { status: 'stock', condition: 'مقبول', patched: false });
    A('mobile', 'Apple', 'iPhone 12', '353000111222333', 2999, 'SAR', 1300, 12, 'الرياض', null, { status: 'lost', mdm: true });
    const old = A('laptop', 'HP', 'ProBook 450 G5', '5CD8OLDXX1', 24000, 'EGP', 2100, 12, 'القاهرة', null, { status: 'retired', retiredAt: d(70), retireReason: 'وصل لعمر الإحلال', mdm: false });
    const wipeCert = { id: U.uid(), no: code('DOC', 230), kind: 'wipeCert', empId: '', date: d(70), status: 'archived', items: [{ t: 'asset', id: old.id, code: old.tag, type: 'لابتوب', serial: old.serial, label: 'HP ProBook 450 G5' }], method: 'Secure Erase للهارد', reason: 'retire', by: 'هشام علي', at: iso(70) };
    db.itDocs.push(wipeCert); old.wipeCert = wipeCert.no;
    const repairing = db.assets.find(a => a.status === 'repair'); if (repairing) repairing.branch = CA;
    const omarLap = db.assets.find(a => a.holderId === S.omar.id && a.type === 'laptop'), omarMob = db.assets.find(a => a.holderId === S.omar.id && a.type === 'mobile');
    const karimLap = db.assets.find(a => a.holderId === S.karim.id && a.type === 'laptop');

    // ---- الشرائح: الكود + ميعاد التجديد (السعودي) / الشحن (المصري) ----
    db.seq['c_SIM-SA'] = 0; db.seq['c_SIM-EG'] = 0;
    const saDue = [6, 2, 15, 25, 40], egDue = [12, 5, 1, 20, 9, 18, 3, 27, 30];
    let si = 0, ei = 0;
    db.lines.forEach(l => { l.code = code('SIM-' + l.country); l.company = CO; l.renewDate = f(l.country === 'SA' ? saDue[si++ % saDue.length] : egDue[ei++ % egDue.length]); if (l.country === 'SA') l.owner = l.holderId ? (db.team.find(m => m.id === l.holderId) || {}).name || 'الشركة' : 'الشركة'; });
    const omarSim = db.lines.find(l => l.holderId === S.omar.id); if (omarSim) omarSim.renewDate = f(2);

    // ---- الإيميلات: الحسابات المهمة و MFA ----
    db.mailboxes.forEach(b => { b.critical = /^(faisal|dina|hesham|finance|ceo)/.test(b.address); b.mfa = /^(faisal|hesham|reem|sara|ahmed|karim|omar)/.test(b.address); });

    // ---- التراخيص: كود LIC + تراخيص بمقاعد ----
    db.seq.c_LIC = 0;
    db.subscriptions.forEach(s => { s.code = code('LIC'); if (/Workspace|Bitwarden|Adobe|Canva/.test(s.name)) s.kind = 'license'; });
    const L = (name, vendor, category, plan, cost, cur, cycle, seats, usedSeats, renewIn) => db.subscriptions.push({ id: U.uid(), code: code('LIC'), kind: 'license', name, vendor, category, plan, cost, currency: cur, cycle, seats, usedSeats, users: [], startDate: d(300), renewalDate: f(renewIn), status: 'active', autoRenew: true, foreign: cur === 'USD', payment: 'بطاقة الشركة **** 4321', loginEmail: 'admin@example.com', ownerId: S.it.id, history: [], notes: '' });
    L('Microsoft 365 Business Basic', 'Microsoft', 'إنتاجية وبريد', 'Business Basic', 300, 'USD', 'monthly', 50, 48, 19);
    L('Windows 11 Pro', 'Microsoft', 'أمن وحماية', 'OEM / Volume', 0, 'USD', 'yearly', 120, 120, 300);
    L('ESET Endpoint Antivirus', 'ESET', 'أمن وحماية', 'Endpoint Protection — 60 جهاز', 5400, 'EGP', 'yearly', 60, 41, 63);

    // ---- التولات والتوكنات (التوقع على متوسط آخر 7 أيام) ----
    db.seq.c_TOOL = 0;
    const T = (name, quota, remPct, renewIn, perDay, users, dept, cost) => {
      const x = { id: U.uid(), code: code('TOOL'), name, account: 'acc' + db.seq.c_TOOL + '@company.com', quota, unit: 'tokens', renewalDate: f(renewIn), cycle: 'monthly', cost, currency: 'USD', dept, users: users.filter(u => u.id).map(u => u.id), status: 'active', history: [], vendor: name.split(' ')[0] };
      const usedNow = quota * (1 - remPct / 100); x.used = usedNow; db.tools.push(x);
      for (let i = 7; i >= 0; i--) db.usageSnapshots.push({ id: U.uid(), refType: 'tool', refId: x.id, code: x.code, date: d(i), used: Math.max(0, Math.round(usedNow - perDay * i)), source: 'Usage API' });
      return x;
    };
    T('OpenAI API', 1e6, 42, 9, 70000, [S.mona, S.karim], 'التسويق', 120);
    T('ElevenLabs', 5e5, 18, 14, 30000, [S.ahmed], 'التسويق', 99);
    const t3 = T('Anthropic API', 1e6, 6, 1, 60000, [S.omar], 'المبيعات', 100);
    T('Midjourney', 2e6, 71, 22, 40000, [S.sara], 'التسويق', 60);
    T('Runway', 1e6, 33, 18, 30000, [S.ahmed, S.sara], 'التسويق', 95);

    // ---- باقات الإنترنت (NET) ----
    db.seq.c_NET = 0;
    const N = (name, quota, used, renewIn, perDay, branch, provider, cost, cur) => {
      const x = { id: U.uid(), code: code('NET'), name, quota, used, renewalDate: f(renewIn), cycle: 'monthly', cost, currency: cur, branch, provider, status: 'active', portal: provider === 'WE' ? 'https://my.te.eg' : '' };
      db.netPackages.push(x); for (let i = 7; i >= 0; i--) db.usageSnapshots.push({ id: U.uid(), refType: 'net', refId: x.id, code: x.code, date: d(i), used: Math.max(0, Math.round(used - perDay * i)), source: provider === 'WE' ? 'my.te.eg' : 'يدوي' });
    };
    N('خط الفرع الرئيسي', 200, 140, 4, 9, RY, 'WE', 2500, 'EGP');
    N('خط المكتب الإداري', 100, 92, 11, 6, CA, 'WE', 1700, 'EGP');
    N('خط المخزن', 140, 35, 20, 2, ST, 'WE', 1100, 'EGP');

    // ---- الدومينات و SSL والهوستنج ----
    db.seq.c_DOM = 0;
    const D = (kind, name, registrar, expIn, cost, cur) => db.domains.push({ id: U.uid(), code: code('DOM'), kind, name, registrar, expiry: f(expIn), cost, currency: cur, autoRenew: kind !== 'domain', status: 'active' });
    D('domain', DOM, 'Namecheap', 27, 60, 'SAR'); D('ssl', DOM, 'Sectigo', 12, 280, 'SAR'); D('domain', 'seg.com.sa', 'SaudiNIC', 140, 160, 'SAR'); D('domain', 'segmarketing.net', 'GoDaddy', 300, 70, 'SAR');
    D('ssl', 'shop.' + DOM, "Let's Encrypt", 60, 0, 'SAR'); D('ssl', 'portal.' + DOM, "Let's Encrypt", 85, 0, 'SAR'); D('ssl', 'mail.' + DOM, 'Sectigo', 200, 280, 'SAR'); D('hosting', 'Hostinger Business', 'Hostinger', 41, 899, 'SAR');

    // ---- الباك أب ----
    db.seq.c_BKP = 0;
    const B = (name, kind, every, lastH, target) => db.backups.push({ id: U.uid(), code: code('BKP'), name, kind, everyHours: every, target, status: 'on', lastSuccess: new Date(Date.now() - lastH * 3600000).toISOString(), runs: [{ at: new Date(Date.now() - lastH * 3600000).toISOString(), ok: true }].concat(lastH > every ? [{ at: new Date(Date.now() - (lastH - every) * 3600000).toISOString(), ok: false, note: 'المساحة على الـ NAS خلصت' }] : []) });
    B('سيرفر الملفات', 'سيرفر ملفات', 24, 50, 'NAS + Google Drive'); B('Google Workspace', 'Google Workspace', 24, 6, 'Spanning'); B('قاعدة بيانات الموقع', 'قاعدة بيانات', 12, 3, 'S3'); B('لابتوبات الإدارة', 'لابتوبات الإدارة', 24, 10, 'OneDrive');

    // ---- المستهلكات ----
    db.seq.c_CON = 0;
    [['أحبار الطابعات', 'أحبار وطباعة', 1, 3, 'خرطوشة', CA], ['شواحن لابتوب', 'شواحن وكابلات', 7, 3, 'قطعة', CA], ['ماوس وكيبورد', 'ماوس وكيبورد', 12, 5, 'طقم', CA], ['كابلات HDMI / USB-C', 'شواحن وكابلات', 4, 2, 'قطعة', RY], ['فلاشات 64GB', 'تخزين (فلاشات / هارد)', 2, 5, 'قطعة', RY]]
      .forEach(c => db.consumables.push({ id: U.uid(), code: code('CON'), name: c[0], category: c[1], qty: c[2], min: c[3], unit: c[4], branch: c[5] }));

    // ---- طلبات الاحتياج ----
    db.seq.c_REQ = 0;
    const R = (title, dept, count, reason, ago, extra) => { const r = Object.assign({ id: U.uid(), no: code('REQ'), title, dept, count, reason, company: CO, branch: CA, status: 'open', openedAt: d(ago), approvedAt: d(ago - 1), approvedBy: 'فيصل الحربي', by: 'نهى سمير', filled: 0 }, extra || {}); db.requisitions.push(r); return r; };
    const rSales = R('مندوب مبيعات', 'المبيعات', 2, 'new', 40, { branch: RY }), rAcc = R('محاسب', 'المالية', 1, 'new', 35), rIT = R('دعم فني IT', 'تقنية المعلومات', 1, 'new', 30), rDes = R('مصمم جرافيك', 'التسويق', 1, 'replace', 20, { replacesEmpId: S.ex.id }), rMb = R('ميديا باير', 'التسويق', 1, 'new', 6, { approvedAt: '', approvedBy: '' });

    // ---- المرشحين والمقابلات ----
    db.seq.c_CAN = 0;
    const cps = (ago, keys) => [].concat(...X.PRE_DOCS.filter(p => !keys || keys.includes(p.key)).map(p => p.need.map(a => ({ doc: p.key, action: a, ver: p.ver, at: iso(ago, 20, 15), by: 'candidate' }))));
    const IV = (kind, ago, score, rec, who) => ({ id: U.uid(), kind, at: d(ago) + 'T11:00', interviewer: who, attended: score != null ? true : null, score, recommendation: rec, evaluator: score != null ? who : '', notes: score != null ? (kind === 'hr' ? 'انطباع كويس، تواصل واضح' : 'مستوى فني مناسب للوظيفة') : '', evaluatedAt: score != null ? d(ago) : '' });
    const Cn = (name, phone, req, status, ago, extra) => { const c = Object.assign({ id: U.uid(), no: code('CAN'), name, phone, email: '', reqId: req.id, jobTitle: req.title, dept: req.dept, source: ['QR Code', 'Google Form', 'LinkedIn', 'إحالة'][db.seq.c_CAN % 4], appliedAt: d(ago), status, interviews: [], checkpoints: [], years: 2 + db.seq.c_CAN % 5 }, extra || {}); db.candidates.push(c); return c; };
    const nh = 'نهى سمير';
    Cn('محمد السيد', '01012345601', rSales, 'applied', 2); Cn('آية حسام', '01112345602', rAcc, 'applied', 1); Cn('عبد الرحمن خالد', '0551234603', rSales, 'applied', 0, { branch: RY });
    Cn('رنا مجدي', '01212345604', rDes, 'interview', 5, { interviews: [IV('hr', -1, null, '', nh)] });
    Cn('بسام طارق', '01012345605', rIT, 'interview', 6, { interviews: [IV('hr', -2, null, '', nh)] });
    Cn('هبة شوقي', '01112345606', rDes, 'hrEval', 8, { interviews: [IV('hr', 3, 4, 'accept', nh)], arrivedAt: iso(3, 10, 40) });
    Cn('سامح عادل', '0561234607', rSales, 'techEval', 12, { interviews: [IV('hr', 8, 4, 'accept', nh), IV('tech', 3, 3, 'another', 'ريم العتيبي')], arrivedAt: iso(8, 10, 50), branch: RY });
    Cn('نورهان علي', '01012345608', rAcc, 'rejected', 20, { interviews: [IV('hr', 15, 2, 'reject', nh)], decision: { result: 'rejected', by: 'فيصل الحربي', at: d(14), note: 'الخبرة أقل من المطلوب' }, closedAt: d(14) });
    Cn('وليد حمدي', '01112345609', rIT, 'rejected', 18, { interviews: [IV('hr', 14, 3, 'accept', nh), IV('tech', 10, 2, 'reject', 'هشام علي')], decision: { result: 'rejected', by: 'هشام علي', at: d(9) }, closedAt: d(9) });
    Cn('دعاء فتحي', '01212345610', rMb, 'pending', 9, { interviews: [IV('hr', 5, 4, 'accept', nh), IV('tech', 2, 4, 'accept', 'كريم سامي')], decision: { result: 'pending', by: 'فيصل الحربي', at: d(1), note: 'مستني اعتماد طلب الاحتياج' } });
    const full = (ago, ex) => Object.assign({ interviews: [IV('hr', ago - 2, 4, 'accept', nh), IV('tech', ago - 5, 5, 'accept', 'المدير المباشر')], arrivedAt: iso(ago - 2, 10), decision: { result: 'accepted', by: 'فيصل الحربي', at: d(ago - 6) }, offerSentAt: d(ago - 7), offerAcceptedAt: d(ago - 8), token: U.uid() + U.uid(), linkSentAt: d(ago - 8) }, ex || {});
    const cDocs = Cn('شادي ممدوح', '01012345611', rSales, 'docs', 25, full(25, { checkpoints: cps(15, ['personal', 'contract']), branch: RY }));
    const cYas = Cn('ياسمين فؤاد', '0501234612', rSales, 'joining', 30, full(30, { checkpoints: cps(20), docsVerifiedAt: d(18), docsVerifiedBy: nh, joiningDate: f(2), joiningTime: '9:00 ص', joiningAddress: 'الرياض — طريق الملك فهد، برج SEG، الدور 7', joinConfirmSentAt: d(10), branch: RY }));
    const cKh = Cn('خالد منصور', '01112345613', rIT, 'joining', 28, full(28, { checkpoints: cps(16), docsVerifiedAt: d(14), docsVerifiedBy: nh, joiningDate: f(4), joiningTime: '9:30 ص', joiningAddress: 'القاهرة — المعادي، شارع 9، عمارة 12', joinConfirmSentAt: d(9) }));
    const cMr = Cn('مريم عبد الله', '01212345614', rAcc, 'joining', 26, full(26, { checkpoints: cps(15), docsVerifiedAt: d(13), docsVerifiedBy: nh, joiningDate: f(1), joiningTime: '9:00 ص', joiningAddress: 'القاهرة — المعادي، شارع 9، عمارة 12', joinConfirmSentAt: d(8) }));
    const cHe = Cn('هشام علي', '01012345615', rIT, 'active', 75, full(75, { checkpoints: cps(68), docsVerifiedAt: d(66), docsVerifiedBy: nh, joiningDate: d(60), joinConfirmSentAt: d(64), activeAt: d(58), empId: S.it.id }));
    rIT.status = 'open';

    // ---- السيكلات ----
    db.seq.c_ONB = 0; db.seq.c_OFF = 0; db.seq.c_DOC = Math.max(db.seq.c_DOC || 0, 230);
    const mkOnItems = () => [[0, 'req', 'فتح طلب احتياج (REQ) واعتماده', 'الإدارة'], [1, 'apply', 'تسجيل المرشح (QR Code / Google Form) وإنشاء Candidate ID', 'الاستقبال / HR'], [1, 'checkin', 'مراجعة الطلب وتسجيل الوصول وتنسيق موعد المقابلة', 'HR'], [2, 'int1', 'المقابلة الأولى — HR: الانطباع والملاحظات والتوصية', 'HR'], [2, 'int2', 'المقابلة الثانية — فني / مدير القسم', 'المدير'], [2, 'evalDone', 'تجميع نتائج المقابلتين في ملف واحد للمراجعة', 'HR'], [3, 'decision', 'اعتماد قرار التوظيف (Accepted)', 'صاحب القرار'], [3, 'offer', 'إرسال العرض الوظيفي وقبوله', 'HR'], [4, 'link', 'إرسال رابط Onboarding الشخصي للمرشح', 'HR'], [4, 'checkpoints', 'مراجعة البيانات والعقد وNDA واللائحة (Digital Checkpoints)', 'المرشح'], [4, 'hrVerify', 'تحقق HR من اكتمال المستندات والبيانات', 'HR'], [4, 'whatsapp', 'تأكيد ميعاد المباشرة والساعة والعنوان على واتساب', 'HR'], [5, 'reserve', 'حجز الجهاز (خالي ← محجوز)', 'IT'], [5, 'email', 'إنشاء الإيميل والحسابات', 'IT'], [5, 'mdm', 'تسجيل الجهاز على MDM وتفعيل MFA', 'IT'], [5, 'sim', 'تجهيز الشريحة', 'IT'], [5, 'tools', 'تخصيص التولات والتراخيص', 'IT'], [6, 'arrive', 'تأكيد وصول الموظف في أول يوم (Check-in)', 'HR'], [6, 'joinInfo', 'تأكيد الاسم والوظيفة والقسم وتاريخ المباشرة', 'HR'], [6, 'handover', 'تسليم العهد فعليًا ومطابقة Asset ID والسيريال', 'IT'], [6, 'review', 'مراجعة HR + IT النهائية للبيانات والعهد المستلمة فعليًا', 'HR + IT'], [7, 'ack', 'توليد الإقرار الموحد (8 أقسام) وطباعته', 'تلقائي'], [7, 'sign', 'توقيع الموظف ورقيًا على الإقرار النهائي', 'الموظف'], [7, 'scan', 'مسح الإقرار الموقّع ضوئيًا ورفعه لملف الموظف', 'HR'], [8, 'activate', 'إغلاق إجراءات الانضمام وتفعيل سجل الموظف (CAN ← EMP)', 'تلقائي']]
      .map(r => ({ id: U.uid(), stage: r[0], key: r[1], label: r[2], owner: r[3], done: false }));
    const doneUpTo = (items, keys, at, who) => items.forEach(i => { if (keys === '*' || keys.includes(i.key)) Object.assign(i, { done: true, doneAt: at, by: who || 'تلقائي' }); });
    const pre = ['req', 'apply', 'checkin', 'int1', 'int2', 'evalDone', 'decision', 'offer', 'link', 'checkpoints', 'hrVerify', 'whatsapp'];
    const newEmp = (c, role) => { const m = { id: U.uid(), name: c.name, role, dept: c.dept, location: c.branch === RY ? 'الرياض' : 'القاهرة', company: CO, branch: c.branch || CA, active: true, status: 'onboarding', startDate: c.joiningDate, empNo: code('EMP'), candidateId: c.id }; db.team.push(m); c.empId = m.id; return m; };
    const onb = (emp, c, date, extraDone, status) => { const cy = { id: U.uid(), no: code('ONB'), type: 'onboard', empId: emp.id, candidateId: c ? c.id : '', date, status: status || 'open', by: 'نهى سمير', items: mkOnItems(), createdAt: iso(10) }; if (c) { doneUpTo(cy.items, pre, d(8)); c.cycleId = cy.id; } else cy.items.filter(i => i.stage <= 4).forEach(i => { i.skipped = true; i.note = 'اتسجّل خارج النظام'; }); doneUpTo(cy.items, extraDone || [], d(1), 'هشام علي'); db.cycles.push(cy); return cy; };
    // ياسمين (المبيعات · بعد يومين · جاهز): مرحلة 5 كلها خلصت
    const eYas = newEmp(cYas, 'مندوب مبيعات');
    const lapY = db.assets.find(a => a.status === 'ready' && a.branch === RY && a.type === 'laptop'), mobY = db.assets.find(a => a.status === 'ready' && a.type === 'mobile');
    [lapY, mobY].filter(Boolean).forEach(a => { Object.assign(a, { status: 'reserved', reservedFor: eYas.id, reservedAt: d(2), mdm: true }); db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'reserve', date: d(2), holderId: eYas.id, note: 'ONB' }); });
    const simY = db.lines.find(l => l.country === 'SA' && l.status === 'stock'); if (simY) simY.reservedFor = eYas.id;
    db.mailboxes.push({ id: U.uid(), kind: 'personal', address: 'yasmin@' + DOM, provider: 'Google Workspace', holderId: eYas.id, members: [], status: 'active', createdAt: d(2), mfa: true }); eYas.email = 'yasmin@' + DOM;
    const ws = db.subscriptions.find(s => /Workspace/.test(s.name)); if (ws) ws.users.push(eYas.id);
    const cyY = onb(eYas, cYas, f(2), ['reserve', 'email', 'mdm', 'sim', 'tools']);
    cyY.items.find(i => i.key === 'reserve').ref = [lapY, mobY].filter(Boolean).map(a => a.tag).join('، ');
    // خالد (IT · بعد 4 أيام · جاري التجهيز)
    const eKh = newEmp(cKh, 'دعم فني IT');
    const lapK = db.assets.find(a => a.status === 'ready' && a.branch === CA && a.type === 'laptop'); if (lapK) { Object.assign(lapK, { status: 'reserved', reservedFor: eKh.id, reservedAt: d(1) }); }
    const cyK = onb(eKh, cKh, f(4), ['reserve']); if (lapK) cyK.items.find(i => i.key === 'reserve').ref = lapK.tag;
    // مريم (الحسابات · بكرة · متأخر)
    const eMr = newEmp(cMr, 'محاسبة'); eMr.dept = 'المالية'; onb(eMr, cMr, f(1), []);
    // يوسف كمال (تعيين مباشر قديم) → سيكل من غير مرشح
    if (S.yousef.id) { S.yousef.status = 'onboarding'; onb(S.yousef, null, S.yousef.startDate || f(3), []); }
    // هشام علي: تعيين مكتمل من 60 يوم
    const cyH = onb(S.it, cHe, d(60), '*', 'done'); cyH.doneAt = d(58); cyH.createdAt = iso(66);

    // ---- الإقرارات الموحدة لكل الموظفين الحاليين (اتوقّعت واتأرشفت) ----
    const unified = {};
    db.team.filter(m => m.status === 'active').forEach(m => {
      const items = X.custody(m.id).filter(x => !(m.id === S.omar.id && (x.id === charger.id || x.id === t3.id))).map(x => Object.assign(X.snap(x), { mark: 'received' }));
      const dd = { id: U.uid(), no: code('DOC'), kind: 'unified', empId: m.id, date: m.startDate || d(300), status: 'archived', items, parents: [], version: 1, signedAt: m.startDate, archivedAt: m.startDate, scanName: 'إقرار-' + m.empNo + '.pdf', by: 'نهى سمير', at: iso(300), cycleId: m.id === S.it.id ? cyH.id : '', candidateId: m.id === S.it.id ? cHe.id : '' };
      db.itDocs.push(dd); unified[m.id] = dd;
    });
    // ملحق عهدة: الشاحن اتسلم لعمر بعد الإقرار
    const ann = { id: U.uid(), no: code('DOC'), kind: 'annex', empId: S.omar.id, date: d(115), status: 'archived', parents: [unified[S.omar.id].no], items: [{ t: 'asset', id: charger.id, code: charger.tag, type: 'إكسسوارات', serial: '—', label: 'شاحن HP 65W', group: 'asset', mark: 'received' }], by: 'هشام علي', at: iso(115) };
    const ann2 = { id: U.uid(), no: code('DOC'), kind: 'annex', empId: S.omar.id, date: d(40), status: 'archived', parents: [unified[S.omar.id].no], items: [{ t: 'tool', id: t3.id, code: t3.code, type: 'حساب تول', serial: t3.account, label: t3.name, group: 'account', mark: 'received' }], by: 'هشام علي', at: iso(40) };
    db.itDocs.push(ann, ann2);

    // ---- الإخلاء X1–X9 ----
    const offItems = (emp, no) => {
      const it = (stage, key, label, owner, ref, ex) => Object.assign({ id: U.uid(), stage, key, label, owner, ref: ref || '', done: false }, ex || {});
      const items = [it(1, 'request', 'طلب الإخلاء: السبب وآخر يوم عمل', 'HR', no), it(1, 'freeze', 'تجميد أي عهد جديدة على الموظف', 'تلقائي'), it(2, 'clearDoc', 'كشف خلو الطرف اتولّد من الإقرار والملاحق', 'تلقائي')];
      db.assets.filter(a => a.holderId === emp.id && a.status === 'assigned').forEach(a => items.push(it(3, 'recvAsset', 'استلام ' + ({ laptop: 'لابتوب', mobile: 'موبايل', accessory: 'إكسسوارات', camera: 'كاميرا', monitor: 'شاشة', tablet: 'تابلت' }[a.type] || 'جهاز') + ' ' + a.brand + ' ' + a.model + ' ومطابقة ' + (a.type === 'mobile' ? 'IMEI' : 'السيريال'), 'IT', a.tag, { refId: a.id })));
      db.lines.filter(l => l.holderId === emp.id && l.status === 'assigned').forEach(l => items.push(it(3, 'recvLine', 'استلام الشريحة أو إيقافها', 'IT', l.code, { refId: l.id })));
      items.push(it(3, 'accounts', 'قفل الإيميل والحسابات وإلغاء MFA والصلاحيات', 'IT', 'M365 / CRM / VPN'), it(3, 'vault', 'تغيير الباسوردات المشتركة في الـ Vault', 'IT', 'Vault'), it(3, 'returnDoc', 'توقيع إقرار تسليم العهدة', 'الموظف + IT'));
      db.assets.filter(a => a.holderId === emp.id && a.status === 'assigned' && ['laptop', 'mobile', 'desktop', 'tablet'].includes(a.type)).forEach(a => items.push(it(4, 'wipe', 'مسح ' + a.tag + ' وحذفه من MDM ورجوعه المخزن خالي', 'IT', a.tag, { refId: a.id })));
      items.push(it(4, 'licenses', 'إرجاع التراخيص ونقل حسابات التولات', 'IT', 'LIC / TOOL'), it(5, 'handoverWork', 'تسليم العمل والداتا لمدير القسم', 'الموظف + المدير'), it(5, 'exitDocs', 'إصدار مستندات الخروج (خطاب إخلاء الطرف / شهادة الخبرة)', 'HR'), it(6, 'finance', 'إخطار الحسابات للتسوية النهائية', 'HR'), it(7, 'exitInterview', 'مقابلة الخروج قبل آخر يوم', 'HR'), it(8, 'archive', 'الأرشفة والاحتفاظ: EMP يتقفل Exited والإيميل يتأرشف', 'HR + IT'), it(9, 'position', 'قرار الوظيفة: إلغاؤها أو فتح REQ لبديل', 'الإدارة'));
      return items;
    };
    const clearance = (emp, cy, at) => { const parents = [unified[emp.id], ...db.itDocs.filter(x => x.kind === 'annex' && x.empId === emp.id)].filter(Boolean); const items = []; parents.forEach(p => (p.items || []).forEach(x => { if (!items.some(y => y.t === x.t && y.id === x.id)) items.push(Object.assign({}, x)); })); X.custody(emp.id).forEach(x => { if (!items.some(y => y.t === x.t && y.id === x.id)) items.push(Object.assign(X.snap(x), { notInDocs: true })); }); const dd = { id: U.uid(), no: code('DOC'), kind: 'clearance', empId: emp.id, cycleId: cy.id, date: at.slice(0, 10), status: 'printed', parents: parents.map(p => p.no), items, by: 'النظام', at }; db.itDocs.push(dd); return dd; };
    const startOff = (emp, lastDay, reason, ago) => {
      const no = code('OFF'), cy = { id: U.uid(), no, type: 'offboard', empId: emp.id, date: lastDay, reason, status: 'open', frozen: true, by: 'نهى سمير', createdAt: iso(ago, 10), items: offItems(emp, no) };
      const at0 = iso(ago, 10, 0), doc = clearance(emp, cy, iso(ago, 10, 2)); cy.docs = [doc.no];
      cy.items.find(i => i.key === 'clearDoc').ref = doc.no; doneUpTo(cy.items, ['request'], d(ago), 'نهى سمير'); doneUpTo(cy.items, ['freeze', 'clearDoc'], d(ago), 'النظام');
      ev('اتفتح طلب إخلاء ' + no + ' · ' + reason + ' · آخر يوم ' + lastDay, at0, 'نهى سمير', { ref: no, empId: emp.id, cycleId: cy.id });
      ev('اتجمّدت العهد الجديدة على ' + emp.empNo, iso(ago, 10, 1), 'النظام', { ref: emp.empNo, empId: emp.id, cycleId: cy.id });
      ev('اتولّد كشف خلو الطرف ' + doc.no + ' (' + doc.items.filter(x => x.group === 'asset').length + ' أصول + ' + doc.items.filter(x => x.group === 'account').length + ' حسابات)', iso(ago, 10, 2), 'النظام', { ref: doc.no, empId: emp.id, cycleId: cy.id });
      emp.status = 'leaving'; emp.lastDay = lastDay; db.cycles.push(cy); return cy;
    };
    // عمر فاروق — المبيعات · آخر يوم بكرة · X3 (5 أصول في العهدة)
    const cyO = startOff(S.omar, f(1), 'استقالة', 0);
    doneUpTo(cyO.items, ['handoverWork'], t, 'عمر فاروق + المدير'); doneUpTo(cyO.items, ['vault'], t, 'هشام علي');
    // كريم سامي — التسويق · بعد 6 أيام · X2 الكشف اتولّد
    const cyKr = startOff(S.karim, f(6), 'انتهاء عقد', 1);
    // ياسر الشهري — الإدارة · خرج امبارح · X4 مستني Wipe
    const lapYs = A('laptop', 'Apple', 'MacBook Pro 14 M1', 'C02YS7EXQ6L4', 7999, 'SAR', 800, 12, 'الرياض', yasser);
    const phYs = A('mobile', 'Apple', 'iPhone 13 Pro', '353777888999000', 4299, 'SAR', 700, 12, 'الرياض', yasser);
    unified[yasser.id] = { id: U.uid(), no: code('DOC'), kind: 'unified', empId: yasser.id, date: d(900), status: 'archived', items: X.custody(yasser.id).map(x => Object.assign(X.snap(x), { mark: 'received' })), parents: [], scanName: 'إقرار-' + yasser.empNo + '.pdf', by: 'نهى سمير', at: iso(900) };
    db.itDocs.push(unified[yasser.id]);
    const cyYs = startOff(yasser, d(1), 'استقالة', 10);
    [lapYs, phYs].forEach(a => { Object.assign(a, { status: 'wipe', holderId: '', assignedAt: '', lastHolder: yasser.id }); db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'return', date: d(1), holderId: yasser.id, condition: 'جيد', note: 'إخلاء ' + cyYs.no }); });
    cyYs.items.filter(i => i.key === 'recvAsset').forEach(i => Object.assign(i, { condition: 'جيد', at: d(1) }));
    db.mailboxes.filter(b => b.holderId === yasser.id).forEach(b => { b.status = 'suspended'; b.mfa = false; b.forwardTo = 'faisal@' + DOM; });
    const rAck = { id: U.uid(), no: code('DOC'), kind: 'returnAck', empId: yasser.id, cycleId: cyYs.id, date: d(1), status: 'signed', signedAt: d(1), items: [lapYs, phYs].map(a => ({ t: 'asset', id: a.id, code: a.tag, type: a.type === 'mobile' ? 'موبايل' : 'لابتوب', serial: a.serial, label: a.brand + ' ' + a.model, condition: 'جيد', at: d(1) })), by: 'هشام علي', at: iso(1, 16) };
    db.itDocs.push(rAck); cyYs.docs.push(rAck.no); cyYs.items.find(i => i.key === 'returnDoc').ref = rAck.no;
    doneUpTo(cyYs.items, ['recvAsset', 'accounts', 'vault', 'returnDoc', 'handoverWork', 'exitDocs', 'exitInterview'], d(1), 'هشام علي');
    yasser.active = true; yasser.status = 'leaving';
    ev('اتسلّم ' + lapYs.tag + ' و' + phYs.tag + ' من ياسر الشهري ومطابقة السيريال · مستني Wipe', iso(1, 15), 'هشام علي', { empId: yasser.id, cycleId: cyYs.id, ref: lapYs.tag });
    ev('اتقفل الإيميل والحسابات واتلغى MFA والصلاحيات لـ ياسر الشهري (M365 / CRM / VPN)', iso(1, 15, 30), 'هشام علي', { empId: yasser.id, cycleId: cyYs.id });
    ev('إقرار تسليم العهدة ' + rAck.no + ': اتوقّع', iso(1, 16), 'هشام علي', { empId: yasser.id, cycleId: cyYs.id, ref: rAck.no });

    // ---- الجرد: جرد كامل قديم + جرد جاري 72% ----
    db.seq.c_STK = 0;
    const live = db.assets.filter(a => !['retired', 'lost'].includes(a.status));
    db.stocktakes.push({ id: U.uid(), no: code('STK'), status: 'closed', full: true, scopeLabel: 'كامل', startedAt: iso(45), closedAt: iso(43), by: 'هشام علي', items: live.map(a => ({ assetId: a.id, seen: true, serialOk: true, placeOk: true })) });
    const n = Math.round(live.length * 0.72);
    db.stocktakes.push({ id: U.uid(), no: code('STK'), status: 'open', full: true, scopeLabel: 'كامل', startedAt: iso(3), by: 'هشام علي', items: live.map((a, i) => i < n ? { assetId: a.id, seen: true, at: iso(2), serialOk: !(i % 11 === 5 || i === 17), found: (i % 11 === 5 || i === 17) ? (a.serial || '') + 'X' : a.serial, placeOk: !(i === 8), place: i === 8 ? RY : a.branch } : { assetId: a.id, seen: false }) });

    // ---- أخطاء المزامنة ----
    db.syncErrors.push({ id: U.uid(), at: new Date(Date.now() - 5 * 60000).toISOString(), sheet: 'الأجهزة', row: 47, code: '', problem: 'صف ناقص الكود', status: 'open' },
      { id: U.uid(), at: new Date(Date.now() - 5 * 60000).toISOString(), sheet: 'الشرائح', row: 12, code: 'SIM-EG-007', problem: 'كود مكرر في الشيت (صف 9)', status: 'open' });

    // ---- سجل حركات عام ----
    ev('مزامنة Google Sheets: assets +0 ~3 · lines +0 ~1 !1 · tools +0 ~5', new Date(Date.now() - 5 * 60000).toISOString(), 'Sync Worker', { kind: 'sync' });
    ev('اتعمل ملحق عهدة ' + ann2.no + ' على الإقرار ' + unified[S.omar.id].no + ' (' + t3.code + ')', iso(40), 'هشام علي', { empId: S.omar.id, ref: ann2.no });
    db.itLog.sort((a, b) => b.at.localeCompare(a.at));
    db.it3Init = true;
    return db;
  };
})(window);
