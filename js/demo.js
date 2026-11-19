/* =========================================================
   demo.js — بيانات تجريبية لشركة SEG: تسويق في السوق السعودي، فريق التشغيل في مصر
   (أسماء وأرقام وهمية للتجربة فقط)
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core;

  function load() {
    const db = C.emptyDB();
    const no = kind => { db.seq[kind] = (db.seq[kind] || 0) + 1; return db.settings.prefixes[kind] + String(db.seq[kind]).padStart(5, '0'); };
    let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const today = U.today(), vat = 15, d = n => U.addDays(today, -n);
    const vatNo = i => '3' + String(1000000000000 + i * 7919131).slice(0, 13) + '3';
    const T = doc => global.Ledger.docTotals(doc);

    Object.assign(db.settings, {
      companyName: 'SEG', companyNameEn: 'SEG',
      taxNumber: '310987654300003', commercialReg: '1010654321', phone: '+966 50 000 0000', email: 'finance@example.com',
      buildingNo: '7421', street: 'طريق الملك فهد', district: 'العليا', city: 'الرياض', postalCode: '12211', additionalNo: '3344',
      bankDetails: 'مصرف الراجحي — IBAN: SA00 8000 0000 6080 1000 0000',
      openingDate: U.addMonths(U.startOfMonth(today), -9),
    });
    db.settings.currencies[0].rate = 0.078;
    const od = db.settings.openingDate;

    // ---- الخزائن والبنوك ----
    const cash = db.treasuries[0]; cash.name = 'الصندوق الرئيسي - الرياض'; cash.opening = 10000;
    db.accounts.find(a => a.id === cash.accountId).name = cash.name;
    const addT = (code, name, kind, currency, opening, rate, bankName) => {
      db.accounts.push({ id: 'acc_' + code, code, name, type: 'asset', parentId: 'acc_1100', system: false, active: true });
      const t = { id: U.uid(), name, kind, currency, accountId: 'acc_' + code, opening, openingRate: rate, bankName, iban: '' };
      db.treasuries.push(t); return t;
    };
    const rajhi = addT('1102', 'مصرف الراجحي - جاري', 'bank', 'SAR', 260000, null, 'مصرف الراجحي');
    const egBank = addT('1103', 'بنك مصر - حساب فريق القاهرة', 'bank', 'EGP', 350000, 0.078, 'بنك مصر');
    const egCash = addT('1104', 'خزينة مكتب القاهرة', 'cash', 'EGP', 40000, 0.078, '');

    const reps = [{ id: U.uid(), name: 'ريم العتيبي', phone: '', commission: 3, target: 90000 }, { id: U.uid(), name: 'عمر فاروق', phone: '', commission: 3, target: 70000 }];
    db.reps = reps;

    // ---- الخدمات ----
    const S = (name, type, price, cost, acc) => ({ id: U.uid(), name, type, price, cost, taxable: true, active: true, accountId: 'acc_' + acc, unit: type === 'subscription' ? 'شهر' : '' });
    const items = {
      social: S('باقة إدارة حسابات التواصل الاجتماعي (شهرية)', 'subscription', 8500, 3000, '4110'),
      ads: S('رسوم إدارة الحملات الإعلانية (شهرية)', 'subscription', 4500, 1200, '4120'),
      shoot: S('جلسة تصوير منتجات', 'service', 3500, 1500, '4130'),
      motion: S('فيديو إعلاني موشن جرافيك', 'service', 6000, 2000, '4130'),
      brand: S('هوية بصرية متكاملة', 'service', 18000, 6000, '4140'),
      infl: S('حملة تسويق عبر المؤثرين', 'service', 25000, 15000, '4150'),
      seo: S('إدارة SEO شهرية', 'subscription', 5000, 1500, '4160'),
      media: S('إعادة فوترة إنفاق إعلاني', 'passthrough', 0, 0, '4180'),
    };
    db.items = Object.values(items);

    // ---- العملاء والمشاريع ----
    const custs = [
      ['مقاهي بيت القهوة', 'الرياض', true], ['شركة الدار للتطوير العقاري', 'جدة', true], ['عيادات لمسة للتجميل', 'الرياض', true],
      ['متجر أناقة الإلكتروني', 'الدمام', true], ['أكاديمية رواد للتدريب', 'الرياض', false], ['نادي نخبة الرياضي', 'الخبر', true],
    ].map(([name, city, hasVat], i) => ({ id: U.uid(), name, city, taxNumber: hasVat ? vatNo(i + 1) : '', crNumber: hasVat ? '10' + (10000000 + i * 3571) : '', phone: '+966 5' + (10000000 + i * 1111111), opening: i === 1 ? 23000 : 0, creditLimit: i === 3 ? 60000 : 0, repId: reps[i % 2].id }));
    db.customers = custs;
    const proj = (name, c, type, start, contractValue, adBudget) => { const p = { id: U.uid(), name, customerId: c.id, type, status: 'active', startDate: start, contractValue, adBudget, repId: c.repId, platforms: 'Instagram, TikTok, Snapchat' }; db.projects.push(p); return p; };
    const pSocial = proj('إدارة سوشيال - بيت القهوة', custs[0], 'إدارة حسابات التواصل الاجتماعي', od, 0, 0);
    const pLaunch = proj('حملة إطلاق مشروع الدار - جدة', custs[1], 'حملة إعلانية مدفوعة', d(150), 120000, 80000);
    const pClinic = proj('حملة عروض الصيف - لمسة', custs[2], 'حملة إعلانية مدفوعة', d(110), 45000, 30000);
    const pStore = proj('متجر أناقة - حملة الجمعة البيضاء', custs[3], 'تسويق عبر المؤثرين', d(25), 70000, 25000);
    const pBrand = proj('هوية نادي نخبة', custs[5], 'هوية بصرية وتصميم', d(60), 24000, 0);
    pBrand.status = 'done';

    // ---- الموردين ----
    const sup = (name, country, nonResident, reverseCharge, whtRate, taxNumber) => ({ id: U.uid(), name, country, nonResident, reverseCharge, whtRate, taxNumber: taxNumber || '', opening: 0 });
    const meta = sup('Meta (إعلانات فيسبوك وإنستغرام)', 'أيرلندا', true, true, 0);
    const snap = sup('Snapchat Ads', 'المملكة المتحدة', true, true, 0);
    const tiktok = sup('TikTok Ads', 'سنغافورة', true, true, 0);
    const studio = sup('استوديو النيل للإنتاج - القاهرة', 'مصر', true, true, 5);
    const lqta = sup('استوديو لقطة للتصوير - الرياض', 'السعودية', false, false, 0, '300555444300003');
    const influ = sup('المؤثرة نورة (عبر وكالة إدارة المشاهير)', 'السعودية', false, false, 0, '300777888900003');
    db.suppliers = [meta, snap, tiktok, studio, lqta, influ];

    const L1 = (it, qty, price) => ({ itemId: it.id, desc: it.name, qty, price: price != null ? price : it.price, discount: 0, taxRate: vat, accountId: it.accountId });
    const inv = (c, date, lines, extra) => {
      const x = Object.assign({ id: U.uid(), no: no('invoice'), date, dueDate: U.addDays(date, 30), customerId: c.id, repId: c.repId, lines, discount: 0, discountType: 'amt', status: 'issued', installments: [], terms: db.settings.invoiceTerms, createdAt: date + 'T09:30:00.000Z' }, extra || {});
      db.invoices.push(x); return x;
    };
    const pay = (x, date, tr, ratio) => {
      if (date > today) return; const amt = U.round(T(x).total * (ratio || 1));
      db.receipts.push({ id: U.uid(), no: no('receipt'), date, customerId: x.customerId, treasuryId: (tr || rajhi).id, amount: amt, method: 'تحويل بنكي', allocations: [{ invoiceId: x.id, amount: amt }] });
    };
    const bill = (s, date, lines, extra) => {
      const b = Object.assign({ id: U.uid(), no: no('bill'), supplierRef: 'S-' + Math.floor(1000 + rnd() * 9000), date, dueDate: U.addDays(date, 15), supplierId: s.id, status: 'issued', lines, discount: 0, reverseCharge: s.reverseCharge, whtRate: s.whtRate }, extra || {});
      db.bills.push(b); return b;
    };
    const payBill = (b, date, tr) => { if (date > today) return; const info = global.Ledger.docTotals(b); const amt = U.round(info.total - info.wht); db.payments.push({ id: U.uid(), no: no('payment'), date, supplierId: b.supplierId, treasuryId: (tr || rajhi).id, amount: amt, method: b.reverseCharge ? 'بطاقة ائتمانية' : 'تحويل بنكي', allocations: [{ billId: b.id, amount: amt }] }); };
    const BL = (desc, price, acc, rc) => ({ desc, qty: 1, price, discount: 0, taxRate: rc ? 0 : vat, accountId: 'acc_' + acc });

    // ---- الشهور: عقود شهرية + حملات ----
    for (let m = 8; m >= 0; m--) {
      const ms = U.addMonths(U.startOfMonth(today), -m); if (ms > today) continue;
      const day = n => { const x = U.addDays(ms, n); return x > today ? today : x; };
      // باقة شهرية لبيت القهوة وSEO لأناقة
      const i1 = inv(custs[0], day(1), [L1(items.social, 1), L1(items.shoot, 1)], { projectId: pSocial.id });
      if (m > 0) pay(i1, day(18)); else if (U.daysBetween(ms, today) > 20) pay(i1, day(20), rajhi, 0.5);
      if (m < 6) { const i2 = inv(custs[3], day(3), [L1(items.seo, 1)]); if (m > 1) pay(i2, day(25)); }
      if (m < 7 && m > 1) { const i3 = inv(custs[4], day(5), [L1(items.motion, 1)]); pay(i3, day(9), cash); }
      if (m < 7) { const i4 = inv(custs[1], day(2), [L1(items.social, 1), L1(items.ads, 1)]); if (m > 0) pay(i4, day(22)); }
      if (m < 5) { const i5 = inv(custs[2], day(4), [L1(items.social, 1, 7000)]); if (m > 1) pay(i5, day(28)); }
      // مصروفات الرياض (ريال)
      const exp = (n, acc, amount, payee, notes, tr, extra) => { const date = day(n); if (date <= today) db.expenses.push(Object.assign({ id: U.uid(), no: no('expense'), date, accountId: 'acc_' + acc, amount, taxRate: 0, treasuryId: (tr || rajhi).id, method: 'تحويل بنكي', payee, notes }, extra || {})); };
      exp(1, '6200', 6500, 'مساحة عمل - العليا', 'إيجار مكتب الرياض', rajhi, { taxRate: 15 });
      exp(2, '6100', 12000, 'موظفو الرياض', 'رواتب الشهر');
      exp(2, '6110', 1950, 'التأمينات الاجتماعية', 'اشتراكات GOSI');
      exp(4, '6400', 1450, 'Adobe / Canva / Meta Business Suite', 'اشتراكات البرامج', rajhi, { reverseCharge: true, method: 'بطاقة ائتمانية' });
      exp(6, '6300', 650, 'STC', 'اتصالات وإنترنت', rajhi, { taxRate: 15 });
      if (m % 3 === 0) exp(8, '6120', 2400, 'منصة مقيم / قوى', 'رسوم إقامات ومقابل مالي');
      // تحويل شهري لحساب فريق مصر + مصروفات القاهرة (جنيه)
      const trDate = day(0);
      if (trDate <= today) {
        const sar = 17000, egp = U.round(sar / 0.078 * (0.98 + rnd() * 0.04));
        db.transfers.push({ id: U.uid(), no: no('transfer'), date: trDate, fromId: rajhi.id, toId: egBank.id, amount: sar, toAmount: egp, sarAmount: sar, fee: 35, sarFee: 35, notes: 'تمويل رواتب ومصروفات فريق القاهرة' });
        db.transfers.push({ id: U.uid(), no: no('transfer'), date: day(1), fromId: egBank.id, toId: egCash.id, amount: 20000, toAmount: 20000, sarAmount: U.round(20000 * 0.078), fee: 0, notes: 'سحب نقدي لمصروفات المكتب' });
      }
      const egExp = (n, acc, egp, payee, notes, tr) => { const date = day(n); if (date > today) return; const rate = U.round((0.0765 + rnd() * 0.003) * 10000) / 10000; db.expenses.push({ id: U.uid(), no: no('expense'), date, accountId: 'acc_' + acc, amount: U.round(egp * rate), fxAmount: egp, fxRate: rate, taxRate: 0, treasuryId: (tr || egBank).id, method: tr === egCash ? 'نقدي' : 'تحويل بنكي', payee, notes }); };
      egExp(3, '6105', 185000, 'فريق القاهرة (مصممين، كتّاب محتوى، ميديا باير)', 'رواتب فريق مصر');
      egExp(3, '6106', 22000, 'مالك العقار - المعادي', 'إيجار مكتب القاهرة');
      egExp(10, '6106', 3500 + Math.round(rnd() * 1500), 'كهرباء وإنترنت وبوفيه', 'مصروفات تشغيل مكتب القاهرة', egCash);
      egExp(15, '5130', 9000 + Math.round(rnd() * 6000), 'مونتير مستقل', 'مونتاج فيديوهات العملاء', egCash);
    }

    // ---- حملة الدار العقارية: رسوم إدارة + إعادة فوترة إعلانات + أقساط ----
    const launch = inv(custs[1], d(150), [L1(items.brand, 1, 20000), L1(items.motion, 3), L1(items.ads, 4), L1(items.media, 1, 64000)], { projectId: pLaunch.id, dueDate: U.addMonths(d(150), 4) });
    const lt = T(launch).total, down = 40000, each = U.round((lt - down) / 4);
    launch.installments = [{ dueDate: launch.date, amount: down }].concat([1, 2, 3, 4].map(i => ({ dueDate: U.addMonths(launch.date, i), amount: i === 4 ? U.round(lt - down - each * 3) : each })));
    db.receipts.push({ id: U.uid(), no: no('receipt'), date: launch.date, customerId: launch.customerId, treasuryId: rajhi.id, amount: down, method: 'تحويل بنكي', allocations: [{ invoiceId: launch.id, amount: down }] });
    [1, 2].forEach(i => db.receipts.push({ id: U.uid(), no: no('receipt'), date: U.addDays(U.addMonths(launch.date, i), 3), customerId: launch.customerId, treasuryId: rajhi.id, amount: each, method: 'تحويل بنكي', allocations: [{ invoiceId: launch.id, amount: each }] }));
    [0, 30, 60, 90].forEach((k, i) => { const b = bill(i % 2 ? snap : meta, U.addDays(launch.date, k + 5), [BL('إنفاق إعلاني - حملة الدار', 16000, '5110', true)], { projectId: pLaunch.id }); payBill(b, b.date); });
    payBill(bill(studio, d(140), [BL('إنتاج 3 فيديوهات إعلانية + تصوير درون', 14000, '5140', true)], { projectId: pLaunch.id }), d(128));

    // ---- حملة لمسة ----
    const clinic = inv(custs[2], d(110), [L1(items.ads, 3), L1(items.shoot, 2), L1(items.media, 1, 30000)], { projectId: pClinic.id });
    pay(clinic, d(95));
    [0, 30, 60].forEach(k => { const b = bill(meta, d(108 - k), [BL('إنفاق إعلاني - عروض الصيف', 10000, '5110', true)], { projectId: pClinic.id }); payBill(b, b.date); });
    payBill(bill(lqta, d(105), [BL('جلستا تصوير في العيادة', 4200, '5140')], { projectId: pClinic.id }), d(90));
    db.creditNotes.push({ id: U.uid(), no: no('credit'), date: d(80), customerId: custs[2].id, invoiceId: clinic.id, projectId: pClinic.id, reason: 'إلغاء جلسة تصوير لم تُنفَّذ', lines: [L1(items.shoot, 1)], discount: 0, createdAt: d(80) + 'T10:00:00.000Z' });

    // ---- حملة أناقة (مؤثرين) — جارية ----
    const store = inv(custs[3], d(20), [L1(items.infl, 1, 45000), L1(items.media, 1, 25000)], { projectId: pStore.id, dueDate: d(5) });
    pay(store, d(12), rajhi, 0.4);
    payBill(bill(influ, d(18), [BL('سنابات وريلز - 3 مؤثرات', 27000, '5120')], { projectId: pStore.id }), d(10));
    bill(tiktok, d(15), [BL('إنفاق إعلاني تيك توك', 12000, '5110', true)], { projectId: pStore.id });

    // ---- هوية نخبة ----
    const brand = inv(custs[5], d(60), [L1(items.brand, 1, 24000)], { projectId: pBrand.id });
    pay(brand, d(40));
    payBill(bill(studio, d(55), [BL('تصميم الهوية - فريق القاهرة الخارجي', 7000, '5130', true)], { projectId: pBrand.id }), d(45));

    // ---- عقد دوري + مسودة + دفعة مقدمة ----
    const retainer = inv(custs[5], U.addMonths(U.startOfMonth(today), -1), [L1(items.social, 1, 7500)], { recurring: { freq: 'monthly', active: true, next: U.startOfMonth(today) } });
    pay(retainer, U.addDays(retainer.date, 10));
    db.invoices.push({ id: U.uid(), no: no('invoice'), date: today, dueDate: U.addDays(today, 30), customerId: custs[0].id, repId: reps[0].id, lines: [L1(items.infl, 1, 30000)], discount: 0, status: 'draft', installments: [] });
    db.receipts.push({ id: U.uid(), no: no('receipt'), date: d(4), customerId: custs[4].id, treasuryId: rajhi.id, amount: 8000, method: 'مدى', notes: 'دفعة مقدمة لحملة التسجيل', allocations: [] });

    // ---- عروض أسعار ----
    [['sent', 6, custs[4], items.infl], ['accepted', 30, custs[3], items.infl], ['rejected', 70, custs[0], items.brand], ['draft', 1, custs[2], items.seo]].forEach(([status, ago, c, it]) =>
      db.quotes.push({ id: U.uid(), no: no('quote'), date: d(ago), validUntil: U.addDays(d(ago), 15), customerId: c.id, repId: c.repId, subject: it.name, lines: [L1(it, 1)], discount: 0, status }));

    db.journals.push({ id: U.uid(), no: no('journal'), date: od, memo: 'إثبات رأس المال', lines: [{ accountId: 'acc_3900', debit: 300000, credit: 0, note: 'تحويل الأرصدة الافتتاحية' }, { accountId: 'acc_3100', debit: 0, credit: 300000, note: 'رأس المال' }] });
    db.budgets = { acc_6200: 6500, acc_6100: 18000, acc_6105: 15000, acc_6106: 2200, acc_6400: 1500, acc_5110: 30000, acc_4110: 16000, acc_4120: 12000 };
    db.audit = [{ at: new Date().toISOString(), action: 'تحميل', entity: 'بيانات تجريبية', ref: '', detail: '' }];
    seedMarketing(db);
    return db;
  }

  // ---- قسم التسويق: حملات على المنصات + سجلات أداء + خطة محتوى ----
  // تُبنى على عملاء ومشاريع الديمو بالاسم، فتصلح أيضاً لتحديث بيانات ديمو قديمة
  function seedMarketing(db) {
    const today = U.today(), d = n => U.addDays(today, -n);
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const cust = n => db.customers.find(c => c.name === n) || {}, proj = n => db.projects.find(p => p.name === n) || {};
    const launch = proj('حملة إطلاق مشروع الدار - جدة'), clinic = proj('حملة عروض الصيف - لمسة'), store = proj('متجر أناقة - حملة الجمعة البيضاء');
    // تكلفة الألف ظهور، نسبة النقر، نسبة التحويل لعميل محتمل، حسب المنصة
    const PF = { 'Meta (Instagram / Facebook)': [24, 0.011, 0.07], Snapchat: [11, 0.006, 0.05], TikTok: [14, 0.009, 0.04], 'Google Ads': [60, 0.045, 0.09] };
    db.campaigns = []; db.campaignStats = []; db.content = [];
    const camp = (name, c, p, platform, objective, startDate, endDate, budget, targetCPL, status, audience) => {
      const x = { id: U.uid(), name, customerId: c.id || '', projectId: p.id || '', platform, objective, startDate, endDate, budget, targetCPL, status, audience, createdAt: startDate + 'T08:00:00.000Z' };
      db.campaigns.push(x); return x;
    };
    // يوزع إجمالي إنفاق على سجلات أسبوعية (المجموع مطابق تماماً)
    const stats = (c, from, to, total, convRate, ticket) => {
      const dates = []; for (let x = U.addDays(from, 6); x <= to && x <= today; x = U.addDays(x, 7)) dates.push(x);
      if (!dates.length) return;
      const w = dates.map(() => 0.7 + rnd() * 0.6), ws = w.reduce((a, b) => a + b, 0);
      let left = total; const [cpm, ctr, cvr] = PF[c.platform];
      dates.forEach((date, i) => {
        const spend = i === dates.length - 1 ? U.round(left) : U.round(total * w[i] / ws); left -= spend;
        const imp = Math.round(spend / (cpm * (0.85 + rnd() * 0.3)) * 1000), clicks = Math.round(imp * ctr * (0.8 + rnd() * 0.4));
        const leads = Math.round(clicks * cvr * (0.7 + rnd() * 0.6)), conv = convRate ? Math.round(leads * convRate * (0.6 + rnd() * 0.8)) : 0;
        db.campaignStats.push({ id: U.uid(), campaignId: c.id, date, spend, impressions: imp, clicks, leads, conversions: conv, revenue: ticket ? U.round(conv * ticket) : 0 });
      });
    };
    if (launch.id) {
      const s = launch.startDate;
      stats(camp('الدار - Meta - تسجيل اهتمام بالوحدات', cust('شركة الدار للتطوير العقاري'), launch, 'Meta (Instagram / Facebook)', 'عملاء محتملون', s, U.addDays(s, 120), 40000, 45, 'done', 'رجال ونساء 28-55، جدة ومكة، اهتمامات عقار واستثمار'), U.addDays(s, 5), U.addDays(s, 95), 32000, 0.04, 0);
      stats(camp('الدار - Snapchat - وعي بالمشروع', cust('شركة الدار للتطوير العقاري'), launch, 'Snapchat', 'الوعي بالعلامة', s, U.addDays(s, 120), 40000, 0, 'done', 'جدة، 25-45'), U.addDays(s, 35), U.addDays(s, 125), 32000, 0, 0);
    }
    if (clinic.id) stats(camp('لمسة - Meta - عروض الصيف', cust('عيادات لمسة للتجميل'), clinic, 'Meta (Instagram / Facebook)', 'رسائل واتساب', clinic.startDate, U.addDays(clinic.startDate, 75), 30000, 35, 'done', 'نساء 22-45، الرياض، اهتمامات تجميل وعناية'), d(108), d(40), 30000, 0.25, 850);
    if (store.id) {
      // جارية: إنفاق تيك توك المبلغ عنه أعلى من فاتورة المنصة المسجلة (يظهر فرق في المطابقة)
      stats(camp('أناقة - TikTok - الجمعة البيضاء', cust('متجر أناقة الإلكتروني'), store, 'TikTok', 'مبيعات / تحويلات', d(18), U.addDays(today, 12), 25000, 0, 'active', 'نساء 18-35، كل المملكة'), d(18), today, 13450, 0.3, 240);
      stats(camp('أناقة - Snapchat - إعادة استهداف', cust('متجر أناقة الإلكتروني'), {}, 'Snapchat', 'مبيعات / تحويلات', d(14), U.addDays(today, 12), 8000, 0, 'active', 'زوار المتجر آخر 30 يوم'), d(14), today, 7200, 0.35, 260);
    }
    stats(camp('بيت القهوة - Snapchat - افتتاح فرع العليا', cust('مقاهي بيت القهوة'), {}, 'Snapchat', 'الوعي بالعلامة', d(40), d(10), 9000, 0, 'done', 'الرياض - نطاق 5 كم حول الفرع'), d(40), d(10), 8650, 0, 0);
    stats(camp('SEG - Google Ads - عملاء جدد للوكالة', {}, {}, 'Google Ads', 'عملاء محتملون', d(60), '', 6000, 60, 'active', 'كلمات: شركة تسويق الرياض، إدارة سوشيال ميديا'), d(60), today, 5600, 0, 0);
    db.campaigns.push({ id: U.uid(), name: 'لمسة - TikTok - اليوم الوطني', customerId: cust('عيادات لمسة للتجميل').id || '', projectId: '', platform: 'TikTok', objective: 'التفاعل', startDate: U.addDays(today, 10), endDate: U.addDays(today, 25), budget: 15000, targetCPL: 0, status: 'planned', audience: '' });

    // خطة المحتوى: الشهر الماضي والحالي والقادم
    const team = ['سارة محمود', 'أحمد حسن', 'منى عادل', 'كريم سامي'];
    const plans = [
      [cust('مقاهي بيت القهوة'), {}, ['Instagram', 'TikTok'], ['قهوة اليوم', 'وراء الكواليس مع الباريستا', 'عرض نهاية الأسبوع', 'سؤال للمتابعين', 'منتج جديد: حلى الموسم', 'ريلز تحضير V60']],
      [cust('عيادات لمسة للتجميل'), clinic, ['Instagram', 'Snapchat'], ['قبل وبعد (بموافقة العميلة)', 'نصيحة الطبيبة', 'عرض الجلسة الأولى', 'تعريف بالفريق الطبي', 'أسئلة شائعة عن الليزر']],
      [cust('متجر أناقة الإلكتروني'), store, ['TikTok', 'Instagram'], ['تجربة منتج مع مؤثرة', 'عد تنازلي للجمعة البيضاء', 'كود خصم حصري', 'أكثر المنتجات مبيعاً', 'تنسيق إطلالة الأسبوع']],
    ];
    const fmts = ['منشور صورة', 'ريلز / فيديو قصير', 'كاروسيل', 'ستوري'];
    plans.forEach(([c, p, plats, ideas], pi) => {
      if (!c.id) return;
      for (let k = -35; k <= 30; k += 3 + ((k + pi) % 2)) {
        const date = U.addDays(today, k + pi), title = ideas[Math.abs(k + pi * 3) % ideas.length];
        const status = k < -2 ? (rnd() < 0.06 ? 'design' : 'published') : k < 2 ? 'scheduled' : k < 6 ? (rnd() < 0.5 ? 'review' : 'approved') : k < 14 ? (rnd() < 0.5 ? 'design' : 'writing') : 'idea';
        db.content.push({ id: U.uid(), customerId: c.id, projectId: p.id || '', date, time: ['13:00', '17:30', '20:00', '21:30'][Math.abs(k) % 4], platform: plats[Math.abs(k) % plats.length], format: fmts[Math.abs(k + pi) % fmts.length], title, status, assignee: team[Math.abs(k + pi) % team.length], notes: '' });
      }
    });
    db.mkInit = true;
    seedMarketing2(db);
    return db;
  }

  // ---- نظام التسويق: الفريق، المهام، العملاء المحتملون، المؤثرون ----
  function seedMarketing2(db) {
    const today = U.today(), d = n => U.addDays(today, -n), f = n => U.addDays(today, n);
    let seed = 23; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const cust = n => db.customers.find(c => c.name === n) || {}, camp = s => (db.campaigns || []).find(c => c.name.includes(s)) || {};
    const M = (name, role, location, dept) => ({ id: U.uid(), name, role, location, dept: dept || 'التسويق', active: true });
    const T = { sara: M('سارة محمود', 'مصمم جرافيك', 'القاهرة'), ahmed: M('أحمد حسن', 'موشن / مونتاج', 'القاهرة'), mona: M('منى عادل', 'كاتب محتوى', 'القاهرة'),
      karim: M('كريم سامي', 'ميديا باير', 'القاهرة'), reem: M('ريم العتيبي', 'مدير حسابات (Account Manager)', 'الرياض'), omar: M('عمر فاروق', 'مبيعات', 'الرياض', 'المبيعات') };
    db.team = Object.values(T);
    const coffee = cust('مقاهي بيت القهوة'), clinic = cust('عيادات لمسة للتجميل'), store = cust('متجر أناقة الإلكتروني'), dar = cust('شركة الدار للتطوير العقاري'), club = cust('نادي نخبة الرياضي');
    // المهام
    const task = (title, who, c, due, status, priority, campaignId) => db.tasks.push({ id: U.uid(), title, assigneeId: who.id, customerId: c.id || '', campaignId: campaignId || '', dueDate: due, status, priority: priority || 'normal', doneAt: status === 'done' ? U.addDays(due, -1) : '', notes: '' });
    db.tasks = [];
    task('تصميم 4 بوستات عرض الجمعة البيضاء', T.sara, store, f(1), 'doing', 'urgent', camp('الجمعة البيضاء').id);
    task('مونتاج ريلز تجربة المنتج مع المؤثرة', T.ahmed, store, f(2), 'todo', 'high');
    task('كتابة كابشنات أسبوع اليوم الوطني', T.mona, clinic, f(5), 'todo', 'normal');
    task('رفع ميزانية سناب إعادة الاستهداف 20%', T.karim, store, d(1), 'todo', 'high', camp('إعادة استهداف').id);
    task('تقرير أداء شهر أكتوبر للعميل', T.reem, dar, d(3), 'review', 'normal');
    task('تصميم منيو الموسم الجديد', T.sara, coffee, f(6), 'todo', 'normal');
    task('تصوير منتجات الحلى الجديدة', T.ahmed, coffee, f(3), 'todo', 'normal');
    task('إعداد خطة محتوى ديسمبر', T.mona, coffee, f(8), 'doing', 'normal');
    task('A/B test لإعلانات جوجل للوكالة', T.karim, {}, f(4), 'doing', 'normal', camp('Google Ads').id);
    task('عرض تقديمي لعميل محتمل (مطاعم)', T.omar, {}, f(2), 'doing', 'high');
    task('مراجعة هوية نادي نخبة النهائية', T.sara, club, d(6), 'done', 'normal');
    task('ستوري بورد إعلان العيادة', T.ahmed, clinic, d(4), 'done', 'normal');
    task('تقرير أسبوعي - لمسة', T.reem, clinic, d(2), 'done', 'normal');
    task('ردود على تعليقات حملة تيك توك', T.mona, store, d(2), 'doing', 'normal');
    // العملاء المحتملون
    db.leads = [];
    const L = (name, company, forC, source, campaignId, stage, value, owner, ago, extra) => db.leads.push(Object.assign({ id: U.uid(), name, company, phone: '+966 5' + Math.floor(10000000 + rnd() * 89999999), email: '', city: 'الرياض', forCustomerId: forC.id || '', source, campaignId: campaignId || '', stage, value: value || 0, ownerId: owner.id, date: d(ago), nextDate: ['won', 'lost'].includes(stage) ? '' : U.addDays(today, Math.round(rnd() * 6) - 2), closedAt: ['won', 'lost'].includes(stage) ? d(Math.max(0, ago - 12)) : '', notes: '' }, extra || {}));
    const g = camp('Google Ads').id;
    // للوكالة (SEG)
    L('فهد الشمري', 'مطاعم ركن الشام', {}, 'حملة إعلانية', g, 'proposal', 45000, T.omar, 12);
    L('نوف القحطاني', 'متجر عطور نوف', {}, 'حملة إعلانية', g, 'meeting', 30000, T.omar, 8);
    L('خالد الدوسري', 'شركة لوجستك', {}, 'حملة إعلانية', g, 'new', 60000, T.reem, 2);
    L('سلمان العنزي', 'معهد لغات', {}, 'حملة إعلانية', g, 'contacted', 18000, T.omar, 5);
    L('هيفاء الحربي', 'صالون هيفاء', {}, 'حملة إعلانية', g, 'lost', 12000, T.omar, 40, { lostReason: 'السعر' });
    L('ماجد السبيعي', 'مجمع عيادات الأسنان', {}, 'حملة إعلانية', g, 'won', 54000, T.reem, 50);
    L('عبدالله المطيري', 'شركة مقاولات', {}, 'ترشيح من عميل', '', 'won', 36000, T.reem, 35);
    L('لمى الزهراني', 'براند ملابس أطفال', {}, 'إنستغرام (عضوي)', '', 'proposal', 24000, T.omar, 9);
    L('تركي الغامدي', 'كافيه سبيشالتي', {}, 'معرض / فعالية', '', 'lost', 15000, T.omar, 30, { lostReason: 'اختار منافس' });
    L('رنا الشهري', 'مركز لياقة نسائي', {}, 'الموقع', '', 'new', 20000, T.reem, 1);
    // لعملائنا (من حملاتهم)
    const lc = camp('لمسة - Meta').id, ld = camp('الدار - Meta').id;
    ['سارة', 'منيرة', 'العنود', 'ريما', 'أمل', 'شهد', 'جواهر'].forEach((n, i) => L(n + ' ' + ['العتيبي', 'القحطاني', 'الدوسري', 'المالكي'][i % 4], '', clinic, 'حملة إعلانية', lc, ['won', 'won', 'lost', 'won', 'contacted', 'lost', 'won'][i], 850, T.reem, 45 + i * 6, i === 2 || i === 5 ? { lostReason: 'لا يوجد رد' } : null));
    ['محمد', 'سعد', 'ناصر', 'بندر', 'عادل'].forEach((n, i) => L(n + ' ' + ['الحارثي', 'الشهراني', 'العمري'][i % 3], '', dar, 'حملة إعلانية', ld, ['meeting', 'won', 'lost', 'contacted', 'won'][i], 650000, T.reem, 60 + i * 9, i === 2 ? { lostReason: 'أجّل القرار' } : { city: 'جدة' }));
    // المؤثرون
    const I = (name, handle, platform, category, followers, engagement, priceStory, priceReel, rating, city) => ({ id: U.uid(), name, handle, platform, category, followers, engagement, priceStory, priceReel, rating, city, contact: 'وكالة إدارة المشاهير', license: 'MW-' + Math.floor(100000 + rnd() * 899999), notes: '' });
    const inf = [I('نورة الأحمد', '@noura.style', 'Snapchat', 'موضة', 820000, 3.1, 9000, 14000, 5, 'الرياض'), I('عبدالرحمن فودي', '@foodie.abdu', 'Snapchat', 'أكل ومطاعم', 1300000, 2.4, 12000, 18000, 4, 'الرياض'),
      I('دانة بيوتي', '@dana.beauty', 'Instagram', 'تجميل وعناية', 410000, 4.6, 5500, 9000, 5, 'جدة'), I('يوسف تك', '@yousef.tech', 'TikTok', 'تقنية', 960000, 6.2, 6000, 8500, 3, 'الدمام'),
      I('أم فيصل', '@umfaisal.family', 'Snapchat', 'عائلة وأطفال', 650000, 2.9, 7000, 10000, 4, 'الرياض'), I('سعود ترافل', '@saud.travels', 'Instagram', 'سفر', 280000, 5.1, 4000, 7500, 3, 'الرياض'),
      I('ريما فيت', '@reema.fit', 'TikTok', 'رياضة', 530000, 7.4, 4500, 6500, 4, 'الخبر')];
    db.influencers = inf;
    const deal = (fi, c, ago, deliverables, cost, status, views, eng, sales) => ({ id: U.uid(), influencerId: inf[fi].id, customerId: c.id || '', projectId: '', date: d(ago), deliverables, cost, status, views, engagements: eng, sales, notes: '' });
    db.influencerDeals = [
      deal(0, store, 18, '3 سنابات + ريلز - الجمعة البيضاء', 14000, 'paid', 410000, 12600, 380),
      deal(2, store, 16, 'ريلز تجربة منتجات + 2 ستوري', 9000, 'paid', 185000, 9800, 210),
      deal(3, store, 10, 'فيديو تيك توك + كود خصم', 6000, 'delivered', 520000, 31000, 145),
      deal(1, coffee, 38, 'زيارة فرع العليا + 4 سنابات', 12000, 'paid', 690000, 15400, 0),
      deal(2, clinic, 70, 'تجربة جلسة + ريلز', 9000, 'paid', 160000, 8100, 46),
      deal(4, coffee, 4, 'سنابات عائلية - منيو الشتاء', 7000, 'agreed', 0, 0, 0),
      deal(6, club, 2, 'تحدي رياضي في النادي', 6500, 'negotiation', 0, 0, 0),
    ];
    db.mk2Init = true;
    seedPortal(db);
    seedIT(db);
    return db;
  }

  // ---- نظام تقنية المعلومات: موظفين باقي الأقسام + أجهزة وعُهد + اشتراكات ----
  function seedIT(db) {
    const today = U.today(), d = n => U.addDays(today, -n), f = n => U.addDays(today, n);
    db.team = db.team || [];
    const by = n => db.team.find(m => m.name === n) || {};
    const add = (name, role, dept, location) => { const m = { id: U.uid(), name, role, dept, location, active: true }; db.team.push(m); return m; };
    const gm = add('فيصل الحربي', 'المدير العام', 'الإدارة', 'الرياض'), acc = add('دينا مصطفى', 'محاسبة', 'المالية', 'القاهرة');
    const it = add('هشام علي', 'مسؤول تقنية المعلومات', 'تقنية المعلومات', 'القاهرة'), hr = add('نهى سمير', 'أخصائية موارد بشرية', 'الموارد البشرية', 'القاهرة');
    const ex = add('طارق يوسف', 'مصمم جرافيك', 'التسويق', 'القاهرة'); ex.active = false; ex.leftAt = d(5); // ترك العمل وما زالت معه عهدة (مثال للتنبيه)
    const sara = by('سارة محمود'), ahmed = by('أحمد حسن'), mona = by('منى عادل'), karim = by('كريم سامي'), reem = by('ريم العتيبي'), omar = by('عمر فاروق');
    if (!db.users.some(u => u.email === 'it@example.com')) db.users.push({ id: 'u_it', name: 'هشام علي', email: 'it@example.com', role: 'it', passHash: 'e3d5d4410051036b5dea411617ad23c1c2bfb7a334b30ca0f79d6e645082d343' }); // It@12345
    db.assets = []; db.assetLog = []; db.seq.asset = 0;
    const A = (type, brand, model, serial, specs, cost, currency, bought, warrantyMonths, location, holder, extra) => {
      db.seq.asset++; const a = Object.assign({ id: U.uid(), tag: 'IT-' + String(db.seq.asset).padStart(4, '0'), type, brand, model, serial, specs, cost, currency, purchaseDate: d(bought), warrantyEnd: warrantyMonths ? U.addMonths(d(bought), warrantyMonths) : '', location, supplier: currency === 'EGP' ? 'B.TECH - القاهرة' : 'جرير - الرياض', condition: bought < 120 ? 'جديد' : 'جيد', status: holder ? 'assigned' : 'stock', holderId: holder ? holder.id : '', assignedAt: holder ? d(Math.max(1, bought - 3)) : '', notes: '' }, extra || {});
      db.assets.push(a);
      db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'create', date: a.purchaseDate, note: [brand, model].join(' ') });
      if (holder) db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'assign', date: a.assignedAt, holderId: holder.id, condition: a.condition, note: type === 'laptop' ? 'شاحن + شنطة' : '' });
      return a;
    };
    A('laptop', 'Apple', 'MacBook Pro 14 M3 Pro', 'C02XK1ABMD6T', '18GB RAM · 512GB SSD', 9499, 'SAR', 300, 12, 'القاهرة', sara);
    A('laptop', 'Apple', 'MacBook Pro 16 M3 Max', 'C02YL2CDQ05N', '36GB RAM · 1TB SSD — للمونتاج', 14999, 'SAR', 280, 12, 'القاهرة', ahmed);
    A('laptop', 'Dell', 'XPS 13', 'DXPS13-7H2K9', '16GB RAM · 512GB SSD', 62000, 'EGP', 400, 24, 'القاهرة', mona);
    A('laptop', 'Lenovo', 'ThinkPad T14', 'PF3KQ8ZL', '16GB RAM · 512GB SSD', 48000, 'EGP', 350, 24, 'القاهرة', karim);
    A('laptop', 'Apple', 'MacBook Air 13 M2', 'C02ZM7EFQ6L4', '8GB RAM · 256GB', 4499, 'SAR', 500, 12, 'الرياض', reem);
    A('laptop', 'HP', 'EliteBook 840', '5CG1234XYZ', '16GB RAM · 512GB', 3900, 'SAR', 420, 36, 'الرياض', omar);
    A('laptop', 'Apple', 'MacBook Air 15 M3', 'C02AB9GHQ7P1', '16GB RAM · 512GB', 6299, 'SAR', 90, 12, 'الرياض', gm);
    A('laptop', 'Lenovo', 'IdeaPad 5', 'PF4LM2XQ', '8GB RAM · 512GB', 32000, 'EGP', 380, 12, 'القاهرة', acc);
    A('laptop', 'Dell', 'Latitude 5440', 'DLAT-5440-88QW', '16GB RAM · 512GB', 41000, 'EGP', 60, 36, 'القاهرة', it);
    A('laptop', 'Apple', 'MacBook Pro 14 M2', 'C02WQ3JKMD6R', '16GB RAM · 512GB', 8299, 'SAR', 610, 12, 'القاهرة', ex); // مع موظف ترك العمل
    A('laptop', 'Lenovo', 'ThinkPad E14', 'PF5NX7RT', '16GB RAM · 512GB — احتياطي', 36000, 'EGP', 30, 24, 'القاهرة', null);
    A('mobile', 'Apple', 'iPhone 15 Pro', '356789104561234', '256GB — رقم خدمة العملاء', 4699, 'SAR', 200, 12, 'الرياض', reem);
    A('mobile', 'Apple', 'iPhone 14', '353912110987654', '128GB', 3299, 'SAR', 330, 12, 'الرياض', omar);
    A('mobile', 'Samsung', 'Galaxy S23', '351234560012345', '256GB — لإدارة حسابات السوشيال', 28000, 'EGP', 260, 12, 'القاهرة', mona);
    A('mobile', 'Samsung', 'Galaxy A54', '359876540098765', '128GB — اختبار الإعلانات', 15000, 'EGP', 150, 12, 'القاهرة', karim);
    A('camera', 'Sony', 'Alpha 7 IV', '4567890', 'جسم الكاميرا + بطاريتين', 9999, 'SAR', 240, 24, 'القاهرة', ahmed);
    A('lens', 'Sony', 'FE 24-70mm f/2.8 GM II', 'SN1122334', '', 8499, 'SAR', 240, 24, 'القاهرة', ahmed);
    A('lighting', 'Godox', 'SL-60W ×2 + سوفت بوكس', 'GDX-SL60-2201', '', 9000, 'EGP', 240, 12, 'القاهرة', null);
    A('audio', 'Rode', 'Wireless GO II', 'RWG2-556677', 'مايك لاسلكي مزدوج', 1199, 'SAR', 230, 12, 'القاهرة', ahmed);
    A('monitor', 'Dell', 'UltraSharp U2723QE 27" 4K', 'CN-0XYZ-123', '', 22000, 'EGP', 290, 36, 'القاهرة', sara);
    A('monitor', 'LG', '27UP850 27" 4K', '201NTAB12345', '', 18500, 'EGP', 290, 24, 'القاهرة', ahmed);
    A('tablet', 'Apple', 'iPad Pro 11 + Pencil', 'DMPXK2ABQ1', 'للرسم والسكتشات', 4599, 'SAR', 180, 12, 'القاهرة', sara);
    A('printer', 'HP', 'LaserJet Pro M404', 'VNB3K12345', 'طابعة المكتب', 9500, 'EGP', 700, 12, 'القاهرة', null);
    A('network', 'TP-Link', 'Archer AX73', '22334455667', 'راوتر مكتب المعادي', 6500, 'EGP', 640, 24, 'القاهرة', null);
    const broken = A('laptop', 'HP', 'ProBook 450', '5CD9876ABC', '8GB RAM · 256GB', 28000, 'EGP', 900, 12, 'القاهرة', null, { status: 'repair', condition: 'به عيوب', repairSince: d(19) });
    db.assetLog.push({ id: U.uid(), assetId: broken.id, kind: 'repair', date: d(19), note: 'الشاشة لا تعمل والبطارية منتفخة', vendor: 'مركز صيانة HP - مدينة نصر', cost: 3500 });
    // الاشتراكات
    const S = (name, vendor, category, plan, cost, currency, cycle, seats, users, renewIn, owner, extra) => Object.assign({ id: U.uid(), name, vendor, category, plan, cost, currency, cycle, seats, users: users.filter(Boolean).map(u => u.id), startDate: d(300), renewalDate: f(renewIn), status: 'active', autoRenew: true, foreign: currency !== 'SAR' && currency !== 'EGP', payment: 'بطاقة الشركة **** 4321', loginEmail: 'admin@example.com', ownerId: (owner || it).id, history: [], notes: '' }, extra || {});
    db.subscriptions = [
      S('Adobe Creative Cloud', 'Adobe Inc.', 'تصميم ومونتاج', 'Teams — All Apps', 359.96, 'USD', 'monthly', 4, [sara, ahmed, ex], 5),
      S('Canva Pro', 'Canva', 'تصميم ومونتاج', 'Teams', 300, 'USD', 'yearly', 5, [sara, mona, reem], 74),
      S('CapCut Pro', 'ByteDance', 'تصميم ومونتاج', 'Pro', 9.99, 'USD', 'monthly', 1, [ahmed], 12),
      S('Envato Elements', 'Envato', 'تصميم ومونتاج', 'Individual', 198, 'USD', 'yearly', 1, [sara], 140),
      S('Google Workspace', 'Google', 'إنتاجية وبريد', 'Business Standard', 168, 'USD', 'monthly', 14, [gm, acc, it, hr, sara, ahmed, mona, karim, reem, omar], 18, it, { autoRenew: true }),
      S('Zoom', 'Zoom Video', 'تواصل واجتماعات', 'Pro', 149.9, 'USD', 'yearly', 1, [reem], 3, reem),
      S('Semrush', 'Semrush', 'تحليلات وSEO', 'Pro', 139.95, 'USD', 'monthly', 1, [karim], 22, karim),
      S('Meta Verified for Business', 'Meta', 'إعلانات وتسويق', 'Business', 79, 'SAR', 'monthly', 1, [karim], -2, karim, { autoRenew: false }),
      S('Hostinger — seg.example', 'Hostinger', 'استضافة ودومين', 'Business Hosting + Domain', 899, 'SAR', 'yearly', 1, [], 41),
      S('ChatGPT Team', 'OpenAI', 'ذكاء اصطناعي', 'Team', 60, 'USD', 'monthly', 2, [mona, karim], 9, mona, { status: 'trial' }),
      S('Bitwarden Teams', 'Bitwarden', 'أمن وحماية', 'Teams', 48, 'USD', 'monthly', 12, [it, gm, acc], 27),
    ];
    db.subscriptions.forEach(s => { const n = s.cycle === 'yearly' ? 0 : 2; for (let i = n; i >= 1; i--) { const dt = U.addMonths(s.renewalDate, -i); if (dt <= today) s.history.push({ date: dt, amount: s.cost, currency: s.currency, sar: U.round(s.cost * (s.currency === 'USD' ? 3.75 : s.currency === 'EGP' ? 0.078 : 1)), expenseId: '' }); } });
    db.itInit = true;
    seedIT2(db);
    seedPlatform(db);
    return db;
  }

  // ---- IT: خطوط سعودية ومصرية كعُهد + إيميلات الشركة + عمليات تعيين وإخلاء ----
  function seedIT2(db) {
    const today = U.today(), d = n => U.addDays(today, -n), f = n => U.addDays(today, n);
    const by = n => (db.team || []).find(m => m.name === n) || {};
    const S = { gm: by('فيصل الحربي'), acc: by('دينا مصطفى'), it: by('هشام علي'), hr: by('نهى سمير'), ex: by('طارق يوسف'), sara: by('سارة محمود'), ahmed: by('أحمد حسن'), mona: by('منى عادل'), karim: by('كريم سامي'), reem: by('ريم العتيبي'), omar: by('عمر فاروق') };
    db.lines = []; db.mailboxes = []; db.moves = [];
    const log = (id, kind, date, holderId, note) => db.assetLog.push({ id: U.uid(), assetId: id, kind, date, holderId: holderId || '', note: note || '' });
    const L = (country, number, carrier, plan, cost, holder, ago, extra) => {
      const l = Object.assign({ id: U.uid(), country, number, carrier, kind: 'voice', plan, cost, currency: country === 'SA' ? 'SAR' : 'EGP', cycle: 'monthly', owner: 'الشركة', status: holder ? 'assigned' : 'stock', holderId: holder ? holder.id : '', assignedAt: holder ? d(ago) : '', whatsapp: false, purpose: '', iccid: '8996' + String(Math.floor(1e11 + Math.random() * 9e11)) }, extra || {});
      db.lines.push(l); log(l.id, 'create', d(ago + 5), '', 'خط ' + number); if (holder) log(l.id, 'assign', d(ago), holder.id); return l;
    };
    // 🇸🇦 خطوط سعودية
    L('SA', '+966551234101', 'STC', 'باقة أعمال 150 جيجا', 230, S.gm, 200);
    L('SA', '+966551234102', 'STC', 'باقة أعمال 150 جيجا', 230, S.reem, 320, { whatsapp: true, purpose: 'خدمة العملاء + واتساب بيزنس' });
    L('SA', '+966561234103', 'موبايلي', 'باقة أعمال 100 جيجا', 199, S.omar, 300);
    L('SA', '+966591234104', 'زين', 'إنترنت مفتوح', 345, null, 120, { kind: 'data', purpose: 'راوتر مكتب الرياض', status: 'assigned' });
    L('SA', '+966551234105', 'STC', 'باقة أعمال 50 جيجا', 150, null, 40, { purpose: 'احتياطي للموظفين الجدد' });
    // 🇪🇬 خطوط مصرية
    L('EG', '+201001234201', 'فودافون', 'Red Business 1000', 1000, S.sara, 280);
    L('EG', '+201001234202', 'فودافون', 'Red Business 1000', 1000, S.ahmed, 270);
    L('EG', '+201201234203', 'أورنج', 'Business Premium', 850, S.mona, 260, { whatsapp: true, purpose: 'إدارة حسابات العملاء' });
    L('EG', '+201101234204', 'اتصالات (e&)', 'Business 700', 700, S.karim, 250);
    L('EG', '+201501234205', 'WE', 'باقة أعمال 600', 600, S.acc, 350);
    L('EG', '+201001234206', 'فودافون', 'Red Business 1000', 1000, S.it, 55);
    L('EG', '+201201234207', 'أورنج', 'Business 500', 500, S.ex, 400); // مع موظف ترك العمل
    L('EG', '+201001234208', 'فودافون', 'راوتر 4G — 400 جيجا', 1250, null, 600, { kind: 'data', purpose: 'راوتر مكتب المعادي (احتياطي)', status: 'assigned' });
    L('EG', '+201101234209', 'اتصالات (e&)', 'Business 500', 500, null, 20, { purpose: 'احتياطي' });
    // ✉️ إيميلات
    const dom = 'seg.example'; db.settings.emailDomain = dom;
    const M = (user, holder, created, extra) => { const b = Object.assign({ id: U.uid(), kind: 'personal', address: user + '@' + dom, provider: 'Google Workspace', holderId: holder.id || '', members: [], status: 'active', createdAt: d(created) }, extra || {}); db.mailboxes.push(b); if (holder.id && !holder.email) holder.email = b.address; return b; };
    M('faisal', S.gm, 700, { aliases: 'ceo@' + dom }); M('dina', S.acc, 360); M('hesham', S.it, 60, { aliases: 'it@' + dom }); M('noha', S.hr, 300); M('sara', S.sara, 290); M('ahmed', S.ahmed, 280); M('mona', S.mona, 270);
    M('karim', S.karim, 260); M('reem', S.reem, 330); M('omar', S.omar, 310); M('tarek', S.ex, 410); // لسه نشط بعد ترك العمل
    const sh = (user, members, created) => db.mailboxes.push({ id: U.uid(), kind: 'shared', address: user + '@' + dom, provider: 'Google Workspace', holderId: '', members: members.filter(m => m.id).map(m => m.id), status: 'active', createdAt: d(created) });
    sh('info', [S.reem, S.omar, S.mona], 700); sh('finance', [S.acc, S.gm], 700); sh('careers', [S.hr, S.gm], 500); sh('ads', [S.karim, S.ex], 450);
    db.mailboxes.push({ id: U.uid(), kind: 'personal', address: 'yasser@' + dom, provider: 'Google Workspace', holderId: '', members: [], status: 'suspended', forwardTo: 'faisal@' + dom, createdAt: d(900), aliases: '' });
    // 🔄 التعيين والإخلاء
    const it = (key, label, done, at) => ({ key, label, done: !!done, doneAt: done ? at : '' });
    db.moves.push({ id: U.uid(), type: 'onboard', staffId: S.it.id, date: d(60), status: 'done', doneAt: d(58), by: 'فيصل الحربي', items: [it('email', 'إنشاء إيميل الشركة', 1, d(61)), it('device', 'تسليم لابتوب / جهاز', 1, d(60)), it('line', 'تسليم خط موبايل', 1, d(55)), it('subs', 'إضافته للاشتراكات (Google Workspace، Adobe...)', 1, d(60)), it('account', 'إنشاء حساب على النظام بالصلاحية المناسبة', 1, d(60)), it('form', 'توقيع إقرار استلام العهدة', 1, d(58))] });
    const newbie = { id: U.uid(), name: 'يوسف كمال', role: 'مصمم موشن', dept: 'التسويق', location: 'القاهرة', active: true, startDate: f(3) }; db.team.push(newbie);
    db.moves.push({ id: U.uid(), type: 'onboard', staffId: newbie.id, date: f(3), status: 'open', by: 'نهى سمير', items: [it('email', 'إنشاء إيميل الشركة'), it('device', 'تسليم لابتوب / جهاز'), it('line', 'تسليم خط موبايل'), it('subs', 'إضافته للاشتراكات (Google Workspace، Adobe...)'), it('account', 'إنشاء حساب على النظام بالصلاحية المناسبة'), it('form', 'توقيع إقرار استلام العهدة')] });
    db.it2Init = true;
    return db;
  }

  // ---- المنصة: قواعد أتمتة جاهزة + ماكرو + سجل تواصل متعدد القنوات + إشعارات ----
  function seedPlatform(db) {
    const today = U.today(), at = (n, hm) => U.addDays(today, -n) + 'T' + (hm || '10:30') + ':00.000Z';
    const team = n => (db.team || []).find(m => m.name === n) || {}, reem = team('ريم العتيبي');
    const R = (name, trigger, params, cond, actions, active) => ({ id: U.uid(), name, active: active !== false, trigger, params: params || {}, cond: cond || null, actions, runs: 0 });
    db.rules = [
      R('متابعة فورية لأي عميل محتمل جديد', 'lead_created', {}, null, [{ type: 'task', text: 'اتصال أول بـ {name} — {company}', assignee: 'owner', days: 0, priority: 'high' }, { type: 'notify', to: 'marketing', text: 'عميل محتمل جديد: {name} — {company}' }]),
      R('عند التعاقد: احتفال وتجهيز العقد', 'lead_stage', { stage: 'won' }, null, [{ type: 'notify', to: 'admin', text: '🎉 تعاقد جديد: {company} بقيمة {value}' }, { type: 'task', text: 'تجهيز العقد وفاتورة الدفعة الأولى — {company}', assignee: reem.id || 'owner', days: 1, priority: 'high' }, { type: 'message', channel: 'whatsapp', text: 'أهلاً {name}، سعداء بانضمامكم لعملاء SEG 🎉 هنتواصل معاكم خلال 24 ساعة لترتيب اجتماع البداية.' }]),
      R('تذكير الفواتير المتأخرة', 'invoice_overdue', { days: 0 }, null, [{ type: 'notify', to: 'accountant', text: 'فاتورة متأخرة {no} — {customer} (متبقي {outstanding})' }, { type: 'message', channel: 'whatsapp', text: 'مرحباً {customer}، نذكّركم بأن الفاتورة {no} بمبلغ {outstanding} استحقت بتاريخ {due}. شاكرين تعاونكم 🙏' }]),
      R('تعديلات العميل على المحتوى ← مهمة للمصمم', 'content_changes', {}, null, [{ type: 'task', text: 'تعديل منشور: {title} — ملاحظة العميل: {note}', assignee: 'owner', days: 1, priority: 'high' }, { type: 'notify', to: 'marketing', text: '✎ {customer} طلب تعديل: {title}' }]),
      R('تنبيه فوري: عميل غير راضٍ', 'incoming_msg', {}, { field: 'mood', op: 'eq', value: 'negative' }, [{ type: 'notify', to: 'admin', text: '😟 رسالة غير راضية من {name}: {body}' }, { type: 'task', text: 'الرد على {name} واحتواء المشكلة', assignee: reem.id || 'owner', days: 0, priority: 'urgent' }]),
      R('عميل محتمل بدون تواصل أسبوع', 'lead_idle', { days: 7 }, null, [{ type: 'notify', to: 'marketing', text: 'عميل محتمل بدون تواصل: {name} (المسؤول: {owner})' }, { type: 'set', field: 'nextDate', value: '+0' }]),
      R('تنبيه تجديد الاشتراكات', 'sub_renewal', { days: 3 }, null, [{ type: 'notify', to: 'it', text: '🔁 اشتراك {name} يتجدد {date} ({amount})' }]),
      R('إرسال كل عميل جديد لـ Google Sheets (عبر Zapier)', 'customer_created', {}, null, [{ type: 'webhook', event: 'customer.new' }], false),
    ];
    db.macros = [
      { id: U.uid(), name: 'أول تواصل', on: 'leads', actions: [{ type: 'set', field: 'stage', value: 'contacted' }, { type: 'set', field: 'nextDate', value: '+2' }, { type: 'task', text: 'متابعة {name} بعد أول تواصل', assignee: 'owner', days: 2 }] },
      { id: U.uid(), name: 'إرسال عرض سعر', on: 'leads', actions: [{ type: 'set', field: 'stage', value: 'proposal' }, { type: 'set', field: 'nextDate', value: '+3' }, { type: 'message', channel: 'email', subject: 'عرض سعر خدمات SEG — {company}', text: 'أهلاً {name}،\nمرفق عرض السعر حسب اتفاقنا. يسعدنا نجاوب على أي سؤال.\nفريق SEG' }, { type: 'task', text: 'متابعة عرض السعر مع {name}', assignee: 'owner', days: 3 }] },
      { id: U.uid(), name: 'إغلاق: لا يوجد رد', on: 'leads', actions: [{ type: 'set', field: 'stage', value: 'lost' }, { type: 'set', field: 'lostReason', value: 'لا يوجد رد' }, { type: 'set', field: 'closedAt', value: '+0' }, { type: 'note', text: 'أُغلق بعد محاولات تواصل بدون رد' }] },
    ];
    // سجل التواصل
    db.activities = [];
    const lead = n => (db.leads || []).find(l => l.name === n) || {}, cust = n => (db.customers || []).find(c => c.name === n) || {};
    const A = (refType, ref, channel, direction, ago, hm, body, extra) => { if (!ref.id) return; db.activities.push(Object.assign({ id: U.uid(), at: at(ago, hm), refType, refId: ref.id, channel, direction, status: 'done', body, by: direction === 'out' ? (team((db.team.find(m => m.id === ref.ownerId) || {}).name).name || 'ريم العتيبي') : '' }, extra || {})); };
    const IN = (mood, urgent, prio) => ({ mood, urgent, prio, handled: false });
    // عملاء محتملون
    A('lead', lead('فهد الشمري'), 'phone', 'out', 10, '11:00', 'مكالمة تعارف — مهتم بإدارة السوشيال لفرعين', { outcome: 'مهتم' });
    A('lead', lead('فهد الشمري'), 'email', 'out', 6, '14:20', 'تم إرسال عرض السعر', { subject: 'عرض سعر — مطاعم ركن الشام' });
    A('lead', lead('فهد الشمري'), 'whatsapp', 'in', 1, '19:05', 'شكراً على العرض، عجبني جداً 👍 نحتاج نعرف مدة التنفيذ قبل ما نعتمد', IN('positive', false, -1));
    A('lead', lead('نوف القحطاني'), 'whatsapp', 'out', 7, '12:00', 'تأكيد موعد الاجتماع', {});
    A('lead', lead('نوف القحطاني'), 'whatsapp', 'in', 0, '09:40', 'ممكن نأجل الاجتماع للأسبوع الجاي؟', IN('neutral', false, 0));
    A('lead', lead('سلمان العنزي'), 'phone', 'out', 4, '13:10', 'لم يرد — نعيد الاتصال', { outcome: 'لم يرد' });
    A('lead', lead('خالد الدوسري'), 'chat', 'in', 2, '22:15', 'مرحبا، عندكم خدمة إعلانات لينكدإن للشركات؟ ضروري نبدأ هالشهر', IN('neutral', true, 2));
    A('lead', lead('لمى الزهراني'), 'social', 'out', 8, '16:00', 'رد على رسالة إنستغرام وإرسال البورتفوليو', {});
    // عملاء
    A('customer', cust('متجر أناقة الإلكتروني'), 'whatsapp', 'in', 0, '08:15', 'للأسف النتائج ضعيف هالأسبوع والحملة متأخرة، نحتاج اجتماع عاجل', IN('negative', true, 6));
    A('customer', cust('متجر أناقة الإلكتروني'), 'phone', 'out', 3, '15:30', 'مراجعة أداء حملة الجمعة البيضاء', { outcome: 'تم الرد' });
    A('customer', cust('مقاهي بيت القهوة'), 'whatsapp', 'in', 1, '17:45', 'يعطيكم العافية التصاميم رائعة 🔥 الفريق كله عاجبه', IN('positive', false, -1));
    A('customer', cust('عيادات لمسة للتجميل'), 'email', 'in', 2, '10:00', 'نرجو إرسال تقرير أداء الشهر الماضي', Object.assign({ subject: 'تقرير الشهر' }, IN('neutral', false, 0)));
    A('customer', cust('شركة الدار للتطوير العقاري'), 'social', 'in', 1, '11:30', 'ما حد رد على رسائلنا من أمس بخصوص الإعلان الجديد', IN('negative', false, 2));
    A('customer', cust('شركة الدار للتطوير العقاري'), 'meeting', 'out', 9, '12:00', 'اجتماع شهري — مراجعة نتائج الحملة وخطة الشهر الجاي', {});
    A('customer', cust('نادي نخبة الرياضي'), 'email', 'out', 5, '09:00', 'تسليم ملفات الهوية النهائية', { subject: 'ملفات الهوية البصرية' });
    // رسالة جهزتها الأتمتة ولسه متبعتتش
    A('customer', cust('أكاديمية رواد للتدريب'), 'whatsapp', 'out', 0, '07:00', 'مرحباً أكاديمية رواد، نذكّركم بالدفعة المقدمة المسجلة لحملة التسجيل وجاهزين نبدأ أول ما يتم الاعتماد 🙏', { status: 'queued', by: '⚡ تذكير الفواتير المتأخرة' });
    db.notifications = [
      { id: U.uid(), at: at(0, '08:16'), to: ['admin'], title: '😟 رسالة غير راضية من متجر أناقة الإلكتروني', body: 'للأسف النتائج ضعيف هالأسبوع…', link: 'marketing.html#/inbox', icon: '⚡', read: [] },
      { id: U.uid(), at: at(1, '19:06'), to: ['marketing', 'admin'], title: 'رد إيجابي من فهد الشمري على عرض السعر', link: 'marketing.html#/leads', icon: '💬', read: [] },
      { id: U.uid(), at: at(2, '09:00'), to: ['accountant', 'admin'], title: 'تم إصدار فاتورة دورية تلقائياً', link: 'index.html#/invoices', icon: '🧾', read: ['u_admin'] },
    ];
    db.autoLog = []; db.autoRuns = {}; db.integrations = db.integrations || {};
    db.platInit = true;
    seedVisitors(db);
    return db;
  }

  // ---- زوار الموقع: 2 أسبوع زيارات تجريبية (track.js) ----
  function seedVisitors(db) {
    const today = U.today(); let seed = 31; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const SRC = [['بحث جوجل', ''], ['إعلان: instagram', 'winter-offer'], ['إعلان: google', 'brand'], ['إنستغرام', ''], ['مباشر', ''], ['لينكدإن', ''], ['تيك توك', ''], ['إعلان: snapchat', 'winter-offer']];
    const PAGES = ['site#home', 'site#services', 'site#work', 'site#pricing', 'site#contact'];
    const TITLE = { 'site#home': 'الرئيسية', 'site#services': 'الخدمات', 'site#work': 'أعمالنا', 'site#pricing': 'الأسعار', 'site#contact': 'تواصل معنا' };
    db.visitors = []; db.pageviews = [];
    const leadByName = n => (db.leads || []).find(l => l.name === n);
    const known = [['رنا الشهري', 'مركز لياقة نسائي'], ['خالد الدوسري', 'شركة لوجستك']];
    for (let i = 0; i < 38; i++) {
      const id = 'v' + (1000 + i).toString(36) + Math.floor(rnd() * 1e6).toString(36);
      const visits = rnd() < 0.3 ? 2 + Math.floor(rnd() * 4) : 1, s = pick(SRC);
      const firstAgo = Math.floor(rnd() * 14), v = { id, first: '', last: '', visits, views: 0, time: 0, pages: [], source: s[0], lastSource: s[0], campaign: s[1], device: rnd() < 0.62 ? 'موبايل' : 'كمبيوتر', browser: pick(['Chrome', 'Safari', 'Safari', 'Edge']), lang: 'ar-SA', landing: 'site#home' };
      for (let k = 0; k < visits; k++) {
        const dayAgo = Math.max(0, firstAgo - Math.floor(k * (firstAgo / Math.max(1, visits)))), h = 9 + Math.floor(rnd() * 13), mi = Math.floor(rnd() * 60);
        let at = new Date(U.addDays(today, -dayAgo) + 'T' + String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':00.000Z');
        const n = 1 + Math.floor(rnd() * (k ? 5 : 3)), seq = ['site#home'].concat(Array.from({ length: n }, () => pick(PAGES.slice(1))));
        seq.forEach(p => { const dur = 10 + Math.floor(rnd() * (p === 'site#pricing' ? 160 : 70)); db.pageviews.push({ id: U.uid(), v: id, at: at.toISOString(), path: p, title: TITLE[p], dur }); v.views++; v.time += dur; if (!v.pages.includes(p)) v.pages.push(p); v.current = p; at = new Date(at.getTime() + dur * 1000); });
        if (!v.first) v.first = db.pageviews[db.pageviews.length - seq.length].at; v.last = at.toISOString();
      }
      if (i < known.length) { const [nm, co] = known[i], l = leadByName(nm); Object.assign(v, { name: nm, company: co, leadId: l ? l.id : '' }); if (l) l.visitorId = id; }
      db.visitors.push(v);
    }
    db.visitors.sort((a, b) => b.last.localeCompare(a.last)); db.pageviews.sort((a, b) => b.at.localeCompare(a.at));
    db.visInit = true;
    return db;
  }

  // ---- منصة العملاء: حساب تجريبي لمتجر أناقة + منشورات بانتظار موافقته ----
  function seedPortal(db) {
    const today = U.today(), store = db.customers.find(c => c.name === 'متجر أناقة الإلكتروني');
    if (!store) return db;
    if (!db.users.some(u => u.email === 'client@example.com'))
      db.users.push({ id: 'u_client', name: 'متجر أناقة', email: 'client@example.com', role: 'client', customerId: store.id, passHash: '7dbefd6911f758893870e29a4888d79bb05a6441b61beac1ff5c700220fd00aa' }); // Client@123
    const caps = ['🖤 الجمعة البيضاء بدأت! خصم 40% على كل التشكيلة لمدة 3 أيام فقط. استخدمي كود ANAQA40 — الرابط في البايو',
      'إطلالتك للشتاء جاهزة ✨ 5 قطع تقدرين تنسقينها بأكثر من 10 طرق. أي إطلالة تفضلين؟ 👇', 'شحن مجاني لكل مدن المملكة على الطلبات فوق 199 ريال 🚚'];
    const mine = (db.content || []).filter(x => x.customerId === store.id && x.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    mine.slice(0, 3).forEach((x, i) => { x.status = 'review'; x.notes = caps[i]; });
    if (mine[3]) Object.assign(mine[3], { status: 'design', clientAction: 'changes', clientActionAt: U.addDays(today, -2), clientNote: 'نغيّر الموديل في الصورة ونضيف السعر بعد الخصم' });
    if (mine[4]) Object.assign(mine[4], { status: 'approved', clientAction: 'approved', clientActionAt: U.addDays(today, -1), clientNote: '' });
    db.portalInit = true;
    return db;
  }

  global.Demo = { load, seedMarketing, seedMarketing2, seedPortal, seedIT, seedIT2, seedPlatform, seedVisitors };
})(typeof window !== 'undefined' ? window : globalThis);
