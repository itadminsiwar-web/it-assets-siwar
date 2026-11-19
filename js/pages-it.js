/* =========================================================
   pages-it.js — نظام تقنية المعلومات
   • العُهد: كل جهاز (لابتوب، موبايل، كاميرا...) برقم عهدة وسجل كامل:
     تسليم لموظف ← استلام ← صيانة ← تكهين، وإقرار استلام عهدة للطباعة
   • الموظفون وعهدهم: كل ما مع الموظف من أجهزة واشتراكات، وإخلاء الطرف عند ترك العمل
   • الاشتراكات: البرامج والخدمات (Adobe، Google Workspace...) بتكلفتها وتاريخ تجديدها،
     والتجديد يقدر يسجّل المصروف مباشرة في النظام المالي (حساب 6400)
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, L = global.Ledger, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {};
  const { $, $$ } = UI;
  const act = (a, id, label, cls) => `<button class="link ${cls || ''}" data-act="${a}" data-id="${id || ''}">${label}</button>`;
  const today = () => U.today();
  const nm = id => ((DB.team || []).find(m => m.id === id) || {}).name || '';
  const opts = map => Object.entries(map).map(([k, v]) => ({ value: k, label: v[0] }));
  const badge = (map, s) => { const x = map[s] || Object.values(map)[0]; return `<span class="badge b-${x[1]}"><i>•</i>${x[0]}</span>`; };
  const sar = (amount, cur) => U.round(U.num(amount) * L.defaultRate(cur || DB.settings.baseCurrency || 'SAR'));
  const CW = () => global.ITX ? global.ITX.curWord() : 'ريال'; // اسم العملة الأساسية (جنيه / ريال)
  const BASE = () => DB.settings.baseCurrency || 'SAR';

  const TYPES = { laptop: ['لابتوب', '💻'], mobile: ['موبايل', '📱'], desktop: ['كمبيوتر مكتبي', '🖥️'], desktopDesign: ['كمبيوتر مكتبي (DESIGN)', '🖥️'], desktopMotion: ['كمبيوتر مكتبي (MOTION)', '🖥️'], aio: ['كمبيوتر كامل AIO', '🖥️'], mac: ['ماكنتوش', '🍏'], hdd: ['هارد خارجي', '💽'], monitor: ['شاشة', '🖵'], tablet: ['تابلت', '📲'], camera: ['كاميرا', '📷'], lens: ['عدسة', '🔭'],
    lighting: ['إضاءة ومعدات تصوير', '💡'], audio: ['مايك وصوتيات', '🎙️'], printer: ['طابعة', '🖨️'], network: ['راوتر وشبكات', '📡'], accessory: ['إكسسوارات', '🎧'], other: ['أخرى', '📦'] };
  // مخزن (لسه متجهزش) ← خالي / جاهز للتسليم ← محجوز لموظف جديد ← مُسلَّم ← مستني المسح (بعد الاستلام) ← خالي
  const ASTATUS = { stock: ['في المخزن', 'info'], ready: ['خالي / جاهز للتسليم', 'good'], reserved: ['محجوز', 'info'], assigned: ['مُسلَّم', 'good'], wipe: ['مستني المسح', 'warn'], repair: ['في الصيانة', 'warn'], lost: ['مفقود', 'bad'], retired: ['مُكهَّن', 'muted'] };
  const FREE = ['stock', 'ready']; // يتسلّم منها
  const NEEDS_WIPE = ['laptop', 'mobile', 'desktop', 'desktopDesign', 'desktopMotion', 'aio', 'mac', 'tablet'];
  const CONDS = ['جديد', 'ممتاز', 'جيد', 'مقبول', 'به عيوب', 'تالف'];
  const DEPTS = ['الإدارة', 'المالية', 'التسويق', 'المبيعات', 'التشغيل', 'الموارد البشرية', 'تقنية المعلومات'];
  const SCATS = ['مواقع ومنصات مدفوعة', 'تصميم ومونتاج', 'إعلانات وتسويق', 'إنتاجية وبريد', 'تواصل واجتماعات', 'استضافة ودومين', 'تحليلات وSEO', 'أمن وحماية', 'ذكاء اصطناعي', 'أخرى'];
  const SSTATUS = { active: ['نشط', 'good'], trial: ['تجريبي', 'info'], paused: ['متوقف', 'warn'], cancelled: ['ملغي', 'muted'] };
  const CYCLES = { monthly: ['شهري', 1], quarterly: ['ربع سنوي', 3], yearly: ['سنوي', 12] };
  const typeLabel = t => (TYPES[t] || TYPES.other)[1] + ' ' + (TYPES[t] || TYPES.other)[0];
  const assetName = a => [a.brand, a.model].filter(Boolean).join(' ') || (TYPES[a.type] || TYPES.other)[0];
  const staffOpts = empty => [{ value: '', label: empty || '— اختر —' }].concat((DB.team || []).filter(m => m.active !== false).map(m => ({ value: m.id, label: m.name + (m.dept ? ' · ' + m.dept : '') })));
  const warrantyBadge = a => { if (!a.warrantyEnd) return '<span class="muted">—</span>'; const d = U.daysBetween(today(), a.warrantyEnd); return d < 0 ? `<span class="badge b-muted">انتهى ${a.warrantyEnd}</span>` : d <= 60 ? `<span class="badge b-warn">ينتهي خلال ${d} يوم</span>` : `<span class="muted small">${a.warrantyEnd}</span>`; };
  const log = (assetId, kind, extra) => C.upsert('assetLog', Object.assign({ id: U.uid(), assetId, kind, date: today() }, extra || {}), 'سجل عهدة');
  const LOGK = { create: '➕ تسجيل الجهاز', assign: '📤 تسليم', return: '📥 استلام', repair: '🔧 إرسال للصيانة', repairDone: '✅ رجوع من الصيانة', lost: '⚠️ مفقود', retire: '🗑️ تكهين', found: '🔎 تم العثور عليه', reserve: '📌 حجز لموظف جديد', wipe: '🧽 مسح الداتا وحذف من MDM', suspend: '⏸ إيقاف', transfer: '🔀 نقل', count: '📋 جرد' };
  Fin.LOGK = LOGK; Fin.ASTATUS = ASTATUS; Fin.TYPES = TYPES; Fin.assetName = assetName; Fin.CONDS = CONDS; Fin.DEPTS = DEPTS; Fin.returnIt = (a, date, cond, note) => returnIt(a, date, cond, note);

  // ============ الأجهزة ============
  // الكود الثابت: DEV-0045 / MOB-018 / ACC-022 (نفس كود الشيت)
  function nextTag(type, company) { if (global.ITX) return global.ITX.assetCode(type, company); DB.seq.asset = (DB.seq.asset || 0) + 1; return 'IT-' + String(DB.seq.asset).padStart(4, '0'); }
  Fin.editAsset = function (a) {
    const isNew = !a || !a.id;
    a = a || { type: 'laptop', status: 'stock', condition: 'جديد', location: 'القاهرة', currency: BASE(), purchaseDate: today() };
    UI.modal({
      title: isNew ? 'تسجيل جهاز جديد' : 'تعديل ' + (a.tag || ''),
      body: `<div class="grid2">
        ${UI.field({ label: 'النوع', name: 'type', type: 'select', options: Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v[1] + ' ' + v[0] })), value: a.type })}
        ${UI.field({ label: 'رقم العهدة', name: 'tag', value: a.tag || '', placeholder: 'يتولّد تلقائي حسب الشركة والنوع', attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'الماركة', name: 'brand', value: a.brand, placeholder: 'Apple, Dell, Samsung, Sony...' })}
        ${UI.field({ label: 'الموديل', name: 'model', value: a.model, placeholder: 'MacBook Pro 14 M3' })}
        ${UI.field({ label: 'الرقم التسلسلي (S/N) أو IMEI', name: 'serial', value: a.serial, attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'المكان', name: 'location', type: 'select', options: ['القاهرة', 'الرياض', 'عن بُعد'], value: a.location })}
        ${UI.field({ label: 'المواصفات', name: 'specs', value: a.specs, full: true, placeholder: 'مثال: 16GB RAM · 512GB SSD · شاشة 14 بوصة' })}
        ${UI.field({ label: 'تاريخ الشراء', name: 'purchaseDate', type: 'date', value: a.purchaseDate })}
        ${UI.field({ label: 'نهاية الضمان', name: 'warrantyEnd', type: 'date', value: a.warrantyEnd })}
        ${UI.field({ label: 'سعر الشراء', name: 'cost', type: 'number', value: a.cost || '' })}
        ${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: a.currency })}
        ${UI.field({ label: 'المورد / المتجر', name: 'supplier', value: a.supplier })}
        ${UI.field({ label: 'الحالة الفنية', name: 'condition', type: 'select', options: CONDS, value: a.condition })}
        ${global.ITX ? global.ITX.scopeFields(a) : ''}
        ${UI.field({ label: 'على MDM', name: 'mdm', type: 'checkbox', value: a.mdm })}
        ${UI.field({ label: 'الأنتي فيروس شغال', name: 'av', type: 'checkbox', value: a.av })}
        ${UI.field({ label: 'تحديثات ويندوز / النظام محدثة', name: 'patched', type: 'checkbox', value: a.patched })}
        ${UI.field({ label: 'ملاحظات', name: 'notes', type: 'textarea', value: a.notes, full: true })}
        ${global.Vault ? global.Vault.section('asset', a.id) : ''}
        ${isNew ? `<div class="field full mb-holder"><span>👤 يتسلّم لموظف (اختياري)</span><select name="holderId">${UI.options(staffOpts('— يتسجل في المخزن (خالي) —'), '')}</select></div>
        <div class="field full"><span>🖥️ أجهزة تانية مع نفس الموظف (لاب + شاشة · شاشتين · …)</span><div class="extra-devs"></div><button type="button" class="btn ghost sm" data-adddev>+ جهاز تاني</button></div>` : ''}
      </div>${isNew ? '<p class="muted small">من غير موظف: الجهاز يتسجل خالي في المخزن. مع موظف: كل الأجهزة بتتسلّم له مرة واحدة ويتسجل لكل جهاز كوده. الأجهزة الجديدة بتتكتب في شيت الجرد (لو المزامنة في الاتجاهين شغالة).</p>' : ''}`,
      onOpen: m => {
        if (global.Vault) global.Vault.bindSection(m.el, 'asset', a.id);
        const box = m.el.querySelector('.extra-devs'), add = m.el.querySelector('[data-adddev]'); if (!box) return;
        const typeOpts = Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v[1] + ' ' + v[0] }));
        add.onclick = () => box.insertAdjacentHTML('beforeend', `<div class="xdev" style="display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr auto;gap:6px;margin:4px 0"><select data-x="type">${UI.options(typeOpts, 'monitor')}</select><input data-x="brand" placeholder="الماركة"><input data-x="model" placeholder="الموديل / المقاس (24&quot;)"><input data-x="serial" placeholder="السريال" dir="ltr"><button type="button" class="link danger" data-x-del>✕</button></div>`);
        box.addEventListener('click', e => { const d = e.target.closest('[data-x-del]'); if (d) d.closest('.xdev').remove(); });
      },
      onSave: m => {
        const d = UI.form(m.el);
        const extras = Array.from(m.el.querySelectorAll('.xdev')).map(r => { const o = {}; r.querySelectorAll('[data-x]').forEach(i => { o[i.dataset.x] = i.value.trim(); }); return o; }).filter(o => o.type && (o.brand || o.model || o.serial));
        const holder = d.holderId; delete d.holderId;
        if (isNew && (extras.length || holder)) return saveBatch(a, d, extras, holder, m);
        if (d.serial && DB.assets.some(x => x.id !== a.id && x.serial && x.serial.toLowerCase() === d.serial.toLowerCase())) throw new Error('الرقم التسلسلي مسجل لجهاز آخر');
        if (d.tag && DB.assets.some(x => x.id !== a.id && x.tag === d.tag)) throw new Error('رقم العهدة مستخدم');
        const x = Object.assign({}, a, d); if (!x.tag) x.tag = nextTag(x.type, x.company);
        if (isNew) { x.source = 'system'; x.sheetStatus = x.sheetStatus || 'خالي'; }
        C.upsert('assets', x, 'جهاز'); if (isNew) log(x.id, 'create', { note: assetName(x) });
        if (global.Vault) global.Vault.saveSection(m.el, 'asset', x.id, 'باسوردات ' + x.tag);
        UI.toast('تم حفظ ' + x.tag); global.Router.render();
      },
    });
  };
  // تسجيل أكتر من جهاز مرة واحدة (ولموظف لو اتحدد): لاب + شاشة · شاشتين · …
  function saveBatch(a, d, extras, holder, m) {
    if (holder && global.ITX) global.ITX.assertNotFrozen(holder);
    const all = [Object.assign({}, a, d)].concat(extras.map(e => ({ type: e.type, brand: e.brand, model: e.model, serial: e.serial, status: 'stock', condition: d.condition || 'جديد', location: d.location, company: d.company, branch: d.branch, currency: d.currency, purchaseDate: d.purchaseDate, supplier: d.supplier })));
    const serials = all.map(x => String(x.serial || '').toLowerCase()).filter(Boolean);
    if (new Set(serials).size !== serials.length) throw new Error('فيه سريال متكرر في الأجهزة اللي بتسجلها');
    serials.forEach(s => { if (DB.assets.some(x => x.serial && x.serial.toLowerCase() === s)) throw new Error('السريال ' + s + ' مسجل لجهاز تاني'); });
    if (d.tag && DB.assets.some(x => x.tag === d.tag)) throw new Error('رقم العهدة مستخدم');
    const s = holder ? (DB.team || []).find(t => t.id === holder) || {} : null, made = [];
    all.forEach(x => {
      if (!x.tag) x.tag = nextTag(x.type, x.company);
      x.source = 'system';
      // الشاشة: المقاس في خانة الشاشة عشان تظهر في الشيت والجدول
      if (x.type === 'monitor' && x.model && !x.monitor) x.monitor = x.model;
      if (holder) Object.assign(x, { status: 'assigned', holderId: holder, assignedAt: today(), dept: s.dept || x.dept || '', sheetStatus: 'مستخدم' });
      else x.sheetStatus = 'خالي';
      C.upsert('assets', x, 'جهاز'); log(x.id, 'create', { note: assetName(x) });
      if (holder) log(x.id, 'assign', { holderId: holder, condition: x.condition, note: 'مع التسجيل' });
      made.push(x);
    });
    if (holder && global.ITX && global.ITX.annex) global.ITX.annex(holder, made.map(x => ({ t: 'asset', id: x.id })));
    if (global.Vault) global.Vault.saveSection(m.el, 'asset', made[0].id, 'باسوردات ' + made[0].tag);
    if (global.ITX) global.ITX.event((holder ? 'اتسلّم لـ ' + s.name + ': ' : 'اتسجل في المخزن: ') + made.map(x => x.tag).join('، '), { kind: 'asset', empId: holder || '' });
    UI.toast('اتسجل ' + made.length + ' جهاز' + (holder ? ' مع ' + s.name : '') + ': ' + made.map(x => x.tag).join('، ')); global.Router.render();
  }

  // تسليم لموظف
  Fin.assignAsset = function (a, holderId) {
    UI.modal({
      title: 'تسليم ' + a.tag + ' — ' + assetName(a),
      body: `<div class="grid2">
        ${UI.field({ label: 'الموظف المستلم', name: 'holderId', type: 'select', options: staffOpts(), value: holderId || '', required: true })}
        ${UI.field({ label: 'تاريخ التسليم', name: 'date', type: 'date', value: today() })}
        ${UI.field({ label: 'الحالة عند التسليم', name: 'condition', type: 'select', options: CONDS, value: a.condition })}
        ${UI.field({ label: 'ملحقات مسلّمة معه', name: 'accessories', value: '', placeholder: 'شاحن، جراب، ماوس...' })}
        ${UI.field({ label: 'طباعة إقرار الاستلام بعد الحفظ', name: 'print', type: 'checkbox', value: true })}
      </div>`,
      saveLabel: 'تسليم',
      onSave: m => {
        const d = UI.form(m.el); UI.require(d, [['holderId', 'الموظف']]);
        if (global.ITX) global.ITX.assertNotFrozen(d.holderId);
        Object.assign(a, { status: 'assigned', holderId: d.holderId, assignedAt: d.date, condition: d.condition, reservedFor: '' });
        C.upsert('assets', a, 'تسليم عهدة'); log(a.id, 'assign', { date: d.date, holderId: d.holderId, condition: d.condition, note: d.accessories });
        if (global.ITX) global.ITX.annex(d.holderId, [{ t: 'asset', id: a.id }]); // ملحق عهدة لو عنده إقرار موحد
        UI.toast('تم تسليم ' + a.tag + ' إلى ' + nm(d.holderId)); global.Router.render();
        if (d.print) printCustody(d.holderId, [a]);
      },
    });
  };
  // استلام من موظف (يرجع للمخزن)
  Fin.returnAsset = function (a) {
    UI.modal({
      title: 'استلام ' + a.tag + ' من ' + nm(a.holderId),
      body: `<div class="grid2">
        ${UI.field({ label: 'تاريخ الاستلام', name: 'date', type: 'date', value: today() })}
        ${UI.field({ label: 'الحالة عند الاستلام', name: 'condition', type: 'select', options: CONDS, value: a.condition })}
        ${UI.field({ label: 'ملاحظات (نواقص أو أعطال)', name: 'note', full: true })}
      </div>`,
      saveLabel: 'استلام',
      onSave: m => { const d = UI.form(m.el); returnIt(a, d.date, d.condition, d.note); UI.toast('تم استلام ' + a.tag); global.Router.render(); },
    });
  };
  function returnIt(a, date, condition, note) {
    // الأجهزة اللي عليها داتا متتسلمش لحد تاني غير بعد المسح (مستني المسح ← خالي)
    const from = a.holderId; Object.assign(a, { lastHolder: from, status: ['تالف'].includes(condition) ? 'repair' : NEEDS_WIPE.includes(a.type) ? 'wipe' : 'ready', holderId: '', assignedAt: '', condition: condition || a.condition });
    C.upsert('assets', a, 'استلام عهدة'); log(a.id, 'return', { date: date || today(), holderId: from, condition, note });
  }
  Fin.repairAsset = function (a) {
    const back = a.status === 'repair';
    UI.modal({
      title: (back ? 'رجوع من الصيانة — ' : 'إرسال للصيانة — ') + a.tag,
      body: `<div class="grid2">
        ${back ? '' : UI.field({ label: 'العطل', name: 'note', required: true, full: true, placeholder: 'مثال: البطارية لا تشحن' })}
        ${UI.field({ label: 'مركز الصيانة', name: 'vendor', value: back ? '' : '', placeholder: 'مثال: الوكيل المعتمد' })}
        ${UI.field({ label: back ? 'تكلفة الإصلاح' : 'تكلفة متوقعة', name: 'cost', type: 'number' })}
        ${back ? UI.field({ label: 'ما تم إصلاحه', name: 'note', full: true }) + UI.field({ label: 'الحالة بعد الإصلاح', name: 'condition', type: 'select', options: CONDS, value: 'جيد' }) : ''}
      </div>${!back && a.holderId ? `<p class="muted small">الجهاز مع ${U.esc(nm(a.holderId))} — سيتم استلامه منه أولاً.</p>` : ''}`,
      onSave: m => {
        const d = UI.form(m.el);
        if (!back) { if (!d.note) throw new Error('اكتب العطل'); if (a.holderId) returnIt(a, today(), a.condition, 'استلام للصيانة'); a.status = 'repair'; a.repairSince = today(); C.upsert('assets', a, 'صيانة'); log(a.id, 'repair', { note: d.note, vendor: d.vendor, cost: d.cost }); }
        else { a.status = 'stock'; a.condition = d.condition; a.repairSince = ''; C.upsert('assets', a, 'صيانة'); log(a.id, 'repairDone', { note: d.note, vendor: d.vendor, cost: d.cost }); }
        UI.toast('تم'); global.Router.render();
      },
    });
  };

  // إقرار استلام عهدة (للطباعة والتوقيع)
  function printCustody(holderId, list) {
    const m = (DB.team || []).find(x => x.id === holderId) || {};
    list = list || DB.assets.filter(a => a.holderId === holderId && a.status === 'assigned');
    const subs = DB.subscriptions.filter(s => (s.users || []).includes(holderId) && s.status !== 'cancelled');
    UI.print(UI.printHeader('إقرار استلام عهدة', m.name || '', today(), 'Asset Custody Form') + `
      <div class="p-notes">أقر أنا <b>${U.esc(m.name || '')}</b>${m.role ? ' (' + U.esc(m.role) + (m.dept ? ' — ' + U.esc(m.dept) : '') + ')' : ''} باستلامي العهد الموضحة أدناه بحالة سليمة، وأتعهد بالمحافظة عليها واستخدامها في أغراض العمل فقط، وإعادتها عند طلبها أو عند انتهاء علاقتي بالشركة، وأتحمل قيمة أي تلف ناتج عن سوء الاستخدام.</div>
      <table class="tbl p-lines"><thead><tr><th>#</th><th>رقم العهدة</th><th>الجهاز</th><th>الرقم التسلسلي</th><th>الحالة</th><th>تاريخ التسليم</th></tr></thead><tbody>
      ${list.map((a, i) => `<tr><td>${i + 1}</td><td>${U.esc(a.tag)}</td><td>${U.esc((TYPES[a.type] || TYPES.other)[0] + ' — ' + assetName(a))}${a.specs ? '<div><small>' + U.esc(a.specs) + '</small></div>' : ''}</td><td dir="ltr">${U.esc(a.serial || '—')}</td><td>${U.esc(a.condition || '')}</td><td>${a.assignedAt || ''}</td></tr>`).join('') || '<tr><td colspan="6">لا توجد أجهزة</td></tr>'}
      </tbody></table>
      ${(DB.lines || []).some(l => l.holderId === holderId && l.status === 'assigned') ? `<div class="p-notes"><b>خطوط الشركة:</b> ${(DB.lines || []).filter(l => l.holderId === holderId && l.status === 'assigned').map(l => `<span dir="ltr">${U.esc(Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number)}</span> (${U.esc(l.carrier)})`).join('، ')}</div>` : ''}${(DB.mailboxes || []).some(b => b.holderId === holderId && b.status === 'active') ? `<div class="p-notes"><b>إيميل الشركة:</b> ${(DB.mailboxes || []).filter(b => b.holderId === holderId && b.status === 'active').map(b => `<span dir="ltr">${U.esc(b.address)}</span>`).join('، ')}</div>` : ''}
      ${subs.length ? `<div class="p-notes"><b>حسابات واشتراكات مخصصة له:</b> ${subs.map(s => U.esc(s.name)).join('، ')}</div>` : ''}
      <div class="p-sign"><div>توقيع الموظف المستلم</div><div>مسؤول تقنية المعلومات</div></div>`);
  }
  Fin.printCustody = printCustody;

  P.itdash = function (el) {
    const t = today(), A = DB.assets, S = DB.subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
    const live = A.filter(a => !['retired', 'lost'].includes(a.status));
    const monthly = U.round(U.sum(S, s => sar(s.cost, s.currency) / (CYCLES[s.cycle] || CYCLES.monthly)[1]));
    const renew = S.filter(s => s.renewalDate && s.renewalDate <= U.addDays(t, 30)).sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
    const warr = live.filter(a => a.warrantyEnd && a.warrantyEnd >= t && a.warrantyEnd <= U.addDays(t, 60));
    const holds = m => A.filter(a => a.holderId === m.id && a.status === 'assigned').length + (DB.lines || []).filter(l => l.holderId === m.id && l.status === 'assigned').length + (DB.mailboxes || []).filter(b => b.holderId === m.id && b.status === 'active').length;
    const left = (DB.team || []).filter(m => m.active === false && holds(m));
    const longRepair = A.filter(a => a.status === 'repair' && a.repairSince && U.daysBetween(a.repairSince, t) > 14);
    const alerts = [];
    left.forEach(m => alerts.push(`<div class="notice bad">🚨 <a href="#/holder/${m.id}">${U.esc(m.name)}</a> ترك العمل ولسه معاه ${holds(m)} عهدة (أجهزة / خطوط / إيميل نشط) — <a href="#/holder/${m.id}">إخلاء طرف</a></div>`));
    renew.filter(s => s.renewalDate < t).forEach(s => alerts.push(`<div class="notice bad">⏰ اشتراك <a href="#/sub/${s.id}">${U.esc(s.name)}</a> فات موعد تجديده (${s.renewalDate})</div>`));
    const soon = renew.filter(s => s.renewalDate >= t && s.renewalDate <= U.addDays(t, 7));
    if (soon.length) alerts.push(`<div class="notice warn">🔁 تجديد خلال 7 أيام: ${soon.map(s => `<a href="#/sub/${s.id}">${U.esc(s.name)}</a> (${s.renewalDate})`).join('، ')}</div>`);
    if (warr.length) alerts.push(`<div class="notice warn">🛡️ ${warr.length} جهاز ينتهي ضمانه خلال 60 يوم — <a href="#/assets">الأجهزة</a></div>`);
    longRepair.forEach(a => alerts.push(`<div class="notice warn">🔧 <a href="#/asset/${a.id}">${U.esc(a.tag)}</a> في الصيانة منذ ${U.daysBetween(a.repairSince, t)} يوم</div>`));
    const byType = Object.keys(TYPES).map(k => ({ k, n: live.filter(a => a.type === k).length, as: live.filter(a => a.type === k && a.status === 'assigned').length })).filter(x => x.n);
    const byCat = {}; S.forEach(s => { byCat[s.category || 'أخرى'] = (byCat[s.category || 'أخرى'] || 0) + sar(s.cost, s.currency) / (CYCLES[s.cycle] || CYCLES.monthly)[1]; });
    el.innerHTML = `<div class="page-head"><div><h1>لوحة تقنية المعلومات</h1><p class="sub">العُهد والأجهزة والاشتراكات في مكان واحد</p></div>
      <div class="actions"><button class="btn primary" data-act="newA">+ جهاز</button><button class="btn" data-act="newS">+ اشتراك</button></div></div>
      ${alerts.join('')}
      <div class="cards mk-cards">
        <div class="card"><span>الأجهزة</span><b>${live.length}</b><small>قيمتها ${U.money(U.sum(live, a => sar(a.cost, a.currency)), false)} ${CW()}</small></div>
        <div class="card"><span>مُسلَّمة لموظفين</span><b>${live.filter(a => a.status === 'assigned').length}</b></div>
        <div class="card"><span>متاحة في المخزن</span><b class="t-good">${live.filter(a => a.status === 'stock').length}</b></div>
        <div class="card"><span>في الصيانة</span><b class="${A.some(a => a.status === 'repair') ? 't-warn' : ''}">${A.filter(a => a.status === 'repair').length}</b></div>
        <div class="card"><span>📞 الخطوط</span><b>${(DB.lines || []).filter(l => l.status !== 'cancelled').length}</b><small>🇸🇦 ${(DB.lines || []).filter(l => l.country === 'SA' && l.status !== 'cancelled').length} · 🇪🇬 ${(DB.lines || []).filter(l => l.country === 'EG' && l.status !== 'cancelled').length}</small></div>
        <div class="card"><span>✉️ إيميلات نشطة</span><b>${(DB.mailboxes || []).filter(b => b.status === 'active').length}</b><small>${(DB.moves || []).filter(x => x.status === 'open').length} تعيين/إخلاء جارٍ</small></div>
        <div class="card"><span>الاشتراكات شهرياً</span><b>${U.money(monthly, false)}</b><small>${CW()} · ${S.length} اشتراك</small></div>
        <div class="card"><span>الاشتراكات سنوياً</span><b>${U.money(monthly * 12, false)}</b><small>${CW()} تقريباً</small></div>
      </div>
      <div class="dash-grid">
        <div class="panel"><div class="panel-head"><h2>التجديدات القادمة (30 يوم)</h2><a class="small" href="#/subs">الاشتراكات</a></div>${UI.table({ rows: renew, empty: 'لا توجد تجديدات قريبة', columns: [
          { label: 'الاشتراك', render: s => `<a href="#/sub/${s.id}">${U.esc(s.name)}</a><div class="muted small">${U.esc(s.plan || '')}</div>` },
          { label: 'التجديد', render: s => `<span class="${s.renewalDate < t ? 't-bad' : s.renewalDate <= U.addDays(t, 7) ? 't-warn' : ''}">${s.renewalDate}</span>` },
          { label: 'المبلغ', cls: 'num', render: s => global.ITX.money(s.cost, s.currency || BASE()) },
          { label: '', render: s => act('renew', s.id, '🔁 تجديد') }] })}</div>
        <div class="panel"><h2>الأجهزة حسب النوع</h2>${UI.table({ rows: byType, empty: 'لا توجد أجهزة', columns: [
          { label: 'النوع', render: x => typeLabel(x.k) }, { label: 'العدد', cls: 'num', render: x => x.n }, { label: 'مُسلَّم', cls: 'num', render: x => x.as }, { label: 'متاح', cls: 'num', render: x => x.n - x.as }] })}</div>
      </div>
      <div class="dash-grid">
        <div class="panel"><h2>تكلفة الاشتراكات الشهرية حسب الفئة</h2>${UI.table({ rows: Object.entries(byCat).map(([k, v]) => ({ k, v: U.round(v) })).sort((a, b) => b.v - a.v), empty: '—', columns: [
          { label: 'الفئة', render: x => U.esc(x.k) }, { label: 'شهرياً (' + CW() + ')', cls: 'num', render: x => U.money(x.v, false), sum: x => x.v }] })}</div>
        <div class="panel"><h2>آخر الحركات</h2>${UI.table({ rows: DB.assetLog.slice().sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || ''))).slice(0, 8), empty: '—', columns: [
          { label: 'التاريخ', render: x => x.date }, { label: 'الحركة', render: x => LOGK[x.kind] || x.kind },
          { label: 'الجهاز', render: x => { const a = C.find('assets', x.assetId); return a ? `<a href="#/asset/${a.id}">${U.esc(a.tag)}</a> <span class="muted small">${U.esc(assetName(a))}</span>` : '—'; } },
          { label: 'الموظف', render: x => U.esc(nm(x.holderId) || '') }] })}</div>
      </div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'newA') Fin.editAsset(); if (b.dataset.act === 'newS') Fin.editSub(); if (b.dataset.act === 'renew') Fin.renewSub(C.find('subscriptions', b.dataset.id)); };
  };

  P.assets = function (el) {
    UI.listPage(el, {
      title: 'الأجهزة والعُهد', subtitle: 'كل جهاز برقم عهدة، ومع مين، وحالته وضمانه', csvName: 'assets',
      actions: '<button class="btn primary" data-act="new">+ جهاز</button>',
      filters: [
        { key: 'type', options: [{ value: '', label: 'كل الأنواع' }].concat(Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v[1] + ' ' + v[0] }))) },
        { key: 'status', options: [{ value: 'live', label: 'الأجهزة الحالية' }, { value: '', label: 'كل الحالات' }].concat(opts(ASTATUS)) },
        { key: 'location', options: [{ value: '', label: 'كل الأماكن' }, 'القاهرة', 'الرياض', 'عن بُعد'] },
      ],
      initial: { status: 'live' },
      rows: s => DB.assets.filter(a => (!s.type || a.type === s.type) && (!s.location || a.location === s.location) && (s.status === 'live' ? !['retired', 'lost'].includes(a.status) : (!s.status || a.status === s.status))).sort((a, b) => (a.tag || '').localeCompare(b.tag || '')),
      searchText: a => [a.tag, a.brand, a.model, a.serial, nm(a.holderId), a.specs].join(' '),
      summary: rows => `<div class="cards"><div class="card"><span>العدد</span><b>${rows.length}</b></div><div class="card"><span>القيمة</span><b>${U.money(U.sum(rows, a => sar(a.cost, a.currency)))}</b></div><div class="card"><span>مُسلَّم</span><b>${rows.filter(a => a.status === 'assigned').length}</b></div><div class="card"><span>متاح</span><b>${rows.filter(a => a.status === 'stock').length}</b></div></div>`,
      empty: 'لا توجد أجهزة — سجّل أول جهاز',
      columns: [
        { label: 'رقم العهدة', render: a => `<a href="#/asset/${a.id}"><b dir="ltr">${U.esc(a.tag)}</b></a>`, text: a => a.tag },
        { label: 'الجهاز', render: a => `${(TYPES[a.type] || TYPES.other)[1]} <b>${U.esc(assetName(a))}</b><div class="muted small" dir="ltr">${U.esc(a.serial || '')}</div>`, text: a => assetName(a) + ' ' + (a.serial || '') },
        { label: 'مع', render: a => a.holderId ? `<a href="#/holder/${a.holderId}">${U.esc(nm(a.holderId))}</a><div class="muted small">منذ ${a.assignedAt || ''}</div>` : '<span class="muted">—</span>', text: a => nm(a.holderId) },
        { label: 'المكان', render: a => U.esc(a.location || '') },
        { label: 'الضمان', render: warrantyBadge, text: a => a.warrantyEnd || '' },
        { label: 'القيمة', cls: 'num', render: a => a.cost ? global.ITX.money(a.cost, a.currency || BASE()) : '—', text: a => sar(a.cost, a.currency) },
        { label: 'الحالة', render: a => badge(ASTATUS, a.status) + `<div class="muted small">${U.esc(a.condition || '')}</div>`, text: a => (ASTATUS[a.status] || [''])[0] },
        { label: '', noExport: true, render: a => (global.Vault ? global.Vault.btn('asset', a.id) : '') + (FREE.includes(a.status) ? act('assign', a.id, '📤 تسليم') : a.status === 'assigned' ? act('return', a.id, '📥 استلام') : '') },
      ],
      onAction: (k, id) => { const a = C.find('assets', id); if (k === 'vault' && global.Vault) return global.Vault.open('asset', a.id, a.tag + ' — ' + assetName(a)); if (k === 'new') Fin.editAsset(); if (k === 'assign') Fin.assignAsset(a); if (k === 'return') Fin.returnAsset(a); },
    });
  };

  P.asset = function (el, id) {
    const a = C.find('assets', id); if (!a) { el.innerHTML = '<div class="empty">الجهاز غير موجود</div>'; return; }
    const hist = DB.assetLog.filter(x => x.assetId === id).sort((x, y) => (y.date + (y.createdAt || '')).localeCompare(x.date + (x.createdAt || '')));
    const repairCost = U.sum(hist.filter(x => x.kind === 'repairDone'), x => U.num(x.cost));
    const holders = new Set(hist.filter(x => x.kind === 'assign').map(x => x.holderId)).size;
    const age = a.purchaseDate ? Math.max(0, Math.round(U.daysBetween(a.purchaseDate, today()) / 30)) : null;
    el.innerHTML = `<div class="page-head"><div><a href="#/assets" class="back">→ الأجهزة</a><h1><span dir="ltr">${U.esc(a.tag)}</span> — ${U.esc(assetName(a))} ${badge(ASTATUS, a.status)}</h1>
        <p class="sub">${typeLabel(a.type)}${a.serial ? ' · S/N: <span dir="ltr">' + U.esc(a.serial) + '</span>' : ''}${a.specs ? ' · ' + U.esc(a.specs) : ''}</p>
        ${a.monitor || a.monitorBrand || a.monitorSerial || a.kit || a.extras ? `<p class="sub">${a.monitor || a.monitorBrand ? '🖵 شاشة ' + U.esc([a.monitor, a.monitorBrand].filter(Boolean).join(' ')) : ''}${a.monitorSerial ? ' · S/N: <span dir="ltr">' + U.esc(a.monitorSerial) + '</span>' : ''}${a.kit ? ' · 🎧 ' + U.esc(a.kit) : ''}${a.extras ? ' · ' + U.esc(a.extras) : ''}</p>` : ''}</div>
      <div class="actions">
        ${FREE.includes(a.status) || a.status === 'reserved' ? '<button class="btn primary" data-act="assign">📤 تسليم لموظف</button>' : ''}
        ${a.status === 'reserved' ? `<button class="btn ghost" data-act="unreserve">فك الحجز</button>` : ''}
        ${['wipe', 'stock'].includes(a.status) ? '<button class="btn primary" data-act="wipe">🧽 مسح الداتا وحذف من MDM</button>' : ''}
        ${a.status === 'assigned' ? '<button class="btn primary" data-act="return">📥 استلام</button>' + (Fin.printReceipt ? '<button class="btn" data-act="receipt">🖨 نموذج استلام عهدة</button>' : '<button class="btn" data-act="print">🖨 إقرار عهدة</button>') : ''}
        ${['stock', 'ready', 'assigned', 'repair', 'wipe'].includes(a.status) ? `<button class="btn" data-act="repair">${a.status === 'repair' ? '✅ رجوع من الصيانة' : '🔧 صيانة'}</button>` : ''}
        ${['stock', 'ready', 'repair', 'wipe'].includes(a.status) ? '<button class="btn ghost" data-act="retire">🗑️ تكهين</button>' : ''}
        ${['assigned', 'stock', 'ready'].includes(a.status) ? '<button class="btn ghost" data-act="lost">⚠️ مفقود</button>' : ''}
        ${a.status === 'lost' ? '<button class="btn" data-act="found">🔎 تم العثور عليه</button>' : ''}
        ${global.Vault && global.Vault.allowed() ? `<button class="btn" data-act="vault">🔑 الباسوردات${global.Vault.has('asset', a.id) ? '' : ' +'}</button>` : ''}
        <button class="btn ghost" data-act="edit">تعديل</button></div></div>
      <div class="cards mk-cards">
        <div class="card"><span>مع</span><b>${a.holderId ? `<a href="#/holder/${a.holderId}">${U.esc(nm(a.holderId))}</a>` : '—'}</b><small>${a.assignedAt ? 'منذ ' + a.assignedAt : U.esc(a.location || '')}</small></div>
        <div class="card"><span>${a.type === 'mobile' ? 'IMEI / السريال' : 'سريال الجهاز'}</span><b class="small-b" dir="ltr">${U.esc(a.serial || '—')}</b></div>
        ${a.type !== 'mobile' ? `<div class="card"><span>الشاشة (المقاس)</span><b dir="ltr">${U.esc(a.monitor || '—')}</b><small>${U.esc(a.monitorBrand || '')}</small></div><div class="card"><span>سريال الشاشة</span><b class="small-b" dir="ltr">${U.esc(a.monitorSerial || '—')}</b></div>` : ''}
        <div class="card"><span>الحالة الفنية</span><b>${U.esc(a.condition || '—')}</b></div>
        ${a.cost ? `<div class="card"><span>سعر الشراء</span><b>${global.ITX.money(a.cost, a.currency || BASE())}</b><small>${a.purchaseDate || ''}</small></div>` : ''}
        ${age != null ? `<div class="card"><span>العمر</span><b>${age} شهر</b><small>${U.esc(a.supplier || '')}</small></div>` : ''}
        ${a.warrantyEnd ? `<div class="card"><span>الضمان</span><b class="small-b">${warrantyBadge(a)}</b></div>` : ''}
        ${repairCost ? `<div class="card"><span>تكلفة الصيانة</span><b>${U.money(repairCost, false)}</b><small>استخدمه ${holders} موظف</small></div>` : ''}
      </div>
      ${a.notes ? `<div class="panel">${U.esc(a.notes)}</div>` : ''}
      <div class="panel"><h2>سجل الجهاز</h2>${UI.table({ rows: hist, empty: 'لا يوجد سجل', columns: [
        { label: 'التاريخ', render: x => x.date }, { label: 'الحركة', render: x => LOGK[x.kind] || x.kind },
        { label: 'الموظف', render: x => x.holderId ? `<a href="#/holder/${x.holderId}">${U.esc(nm(x.holderId))}</a>` : '' },
        { label: 'الحالة', render: x => U.esc(x.condition || '') }, { label: 'التكلفة', cls: 'num', render: x => x.cost ? U.money(x.cost, false) : '' },
        { label: 'ملاحظات', render: x => U.esc([x.note, x.vendor].filter(Boolean).join(' — ')) }] })}</div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'assign') Fin.assignAsset(a); if (k === 'return') Fin.returnAsset(a); if (k === 'repair') Fin.repairAsset(a); if (k === 'edit') Fin.editAsset(a);
      if (k === 'vault' && global.Vault) global.Vault.open('asset', a.id, a.tag + ' — ' + assetName(a));
      if (k === 'receipt' && Fin.printReceipt) Fin.printReceipt(a.holderId, [a.id]);
      if (k === 'print') printCustody(a.holderId, [a]);
      if (k === 'wipe' && global.ITX) global.ITX.wipeAsset(a);
      if (k === 'unreserve') { a.status = 'ready'; a.reservedFor = ''; C.upsert('assets', a, 'فك حجز'); global.Router.render(); }
      if (k === 'retire' && global.ITX) return global.ITX.retireAsset(a);
      if (k === 'retire' && confirm('تكهين الجهاز ' + a.tag + '؟ لن يظهر في الأجهزة الحالية.')) { a.status = 'retired'; C.upsert('assets', a, 'تكهين'); log(a.id, 'retire', {}); global.Router.render(); }
      if (k === 'lost' && confirm('تسجيل ' + a.tag + ' كمفقود؟')) { const h = a.holderId; Object.assign(a, { status: 'lost' }); C.upsert('assets', a, 'جهاز مفقود'); log(a.id, 'lost', { holderId: h }); global.Router.render(); }
      if (k === 'found') { Object.assign(a, { status: NEEDS_WIPE.includes(a.type) ? 'wipe' : 'stock', holderId: '', assignedAt: '' }); C.upsert('assets', a, 'جهاز'); log(a.id, 'found', {}); global.Router.render(); }
    };
  };

  // ============ الموظفون وعهدهم ============
  Fin.editStaff = function (m) {
    m = m || { location: 'القاهرة', dept: 'التسويق', active: true };
    UI.modal({
      title: m.id ? 'تعديل موظف' : 'موظف جديد',
      body: `<div class="grid2">
        ${UI.field({ label: 'الاسم', name: 'name', value: m.name, required: true })}
        ${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: global.ITX ? global.ITX.allDepts() : DEPTS, value: m.dept || 'التسويق' })}
        ${UI.field({ label: 'الوظيفة (المسمى الوظيفي)', name: 'role', value: m.role })}
        ${UI.field({ label: 'الرقم الوظيفي', name: 'empNo', value: m.empNo, attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'الإدارة', name: 'admin', value: m.admin, placeholder: 'مثال: المبيعات' })}
        ${UI.field({ label: 'المكان', name: 'location', type: 'select', options: ['القاهرة', 'الرياض', 'عن بُعد'], value: m.location })}
        ${UI.field({ label: 'البريد', name: 'email', type: 'email', value: m.email })}
        ${UI.field({ label: 'على رأس العمل', name: 'active', type: 'checkbox', value: m.active !== false })}
        ${global.Vault ? global.Vault.section('staff', m.id) : ''}
      </div><p class="muted small">قائمة الموظفين مشتركة مع نظام التسويق (يظهر فيه قسما التسويق والمبيعات). عند الربط تأتي من نظام الـ HR.</p>`,
      onOpen: x => { if (global.Vault) global.Vault.bindSection(x.el, 'staff', m.id); },
      onSave: x => { const d = UI.form(x.el); UI.require(d, [['name', 'الاسم']]); const s = C.upsert('team', Object.assign({}, m, d), 'موظف'); if (global.Vault) global.Vault.saveSection(x.el, 'staff', s.id, 'باسوردات ' + s.name); UI.toast('تم الحفظ'); global.Router.render(); },
    });
  };
  P.staff = function (el) {
    const rows = (DB.team || []).map(m => { const as = DB.assets.filter(a => a.holderId === m.id && a.status === 'assigned'); return { m, as, val: U.sum(as, a => sar(a.cost, a.currency)), subs: DB.subscriptions.filter(s => (s.users || []).includes(m.id) && s.status !== 'cancelled').length }; })
      .sort((a, b) => (a.m.active === false) - (b.m.active === false) || (a.m.empNo || 'zz').localeCompare(b.m.empNo || 'zz') || b.as.length - a.as.length);
    const V = global.Vault && global.Vault.allowed() ? global.Vault : null, vOpen = V && V.isOpen();
    el.innerHTML = `<div class="page-head"><div><h1>الموظفون وعهدهم</h1><p class="sub">ما مع كل موظف من أجهزة واشتراكات — وإخلاء الطرف عند ترك العمل</p></div><div class="actions">${V ? (vOpen ? '<button class="btn ghost" data-act="vlock">🔒 اخفي الباسوردات</button>' : '<button class="btn" data-act="vunlock">🔓 اعرض الباسوردات</button>') : ''}<button class="btn primary" data-act="new">+ موظف</button></div></div>
      <div class="panel">${UI.table({ rows, empty: 'لا يوجد موظفون', columns: [
        { label: 'الموظف', render: r => `<a href="#/holder/${r.m.id}"><b>${U.esc(r.m.name)}</b></a><div class="muted small">${r.m.empNo ? `<span dir="ltr">${U.esc(r.m.empNo)}</span> · ` : ''}${U.esc([r.m.role, r.m.location].filter(Boolean).join(' · '))}</div>` },
        { label: 'القسم', render: r => U.esc(r.m.dept || 'التسويق') },
        ...(V ? [{ label: 'الباسورد', render: r => vOpen ? `<span data-vpw="${r.m.id}" class="muted small">…</span>` : '<span class="muted">••••••</span>' }] : []),
        { label: 'الأجهزة', render: r => r.as.length ? r.as.map(a => `<a href="#/asset/${a.id}" title="${U.esc(assetName(a))}">${(TYPES[a.type] || TYPES.other)[1]}</a>`).join(' ') + ` <span class="muted small">(${r.as.length})</span>` : '<span class="muted">—</span>' },
        { label: 'قيمة العهدة', cls: 'num', render: r => r.val ? U.money(r.val, false) : '—', sum: r => r.val },
        { label: 'اشتراكات', cls: 'num', render: r => r.subs || '—' },
        { label: 'خطوط', render: r => (DB.lines || []).filter(l => l.holderId === r.m.id && l.status === 'assigned').map(l => (l.country === 'SA' ? '🇸🇦' : '🇪🇬')).join(' ') || '—' },
        { label: 'الإيميل', render: r => { const b = (DB.mailboxes || []).find(x => x.holderId === r.m.id); return b ? `<span dir="ltr" class="small ${b.status === 'active' && r.m.active === false ? 't-bad' : ''}">${U.esc(b.address)}</span>` : '—'; } },
        { label: 'الحالة', render: r => r.m.active === false ? (r.as.length || (DB.lines || []).some(l => l.holderId === r.m.id && l.status === 'assigned') || (DB.mailboxes || []).some(b => b.holderId === r.m.id && b.status === 'active') ? '<span class="badge b-bad">ترك العمل — معه عهدة!</span>' : '<span class="badge b-muted">ترك العمل</span>') : '<span class="badge b-good">على رأس العمل</span>' },
      ] })}</div>`;
    el.onclick = e => {
      const eye = e.target.closest('[data-veye]'), cp = e.target.closest('[data-vcopy]');
      if (eye) { const i = eye.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; return; }
      if (cp) { const i = cp.parentNode.querySelector('input'); if (i.value) navigator.clipboard.writeText(i.value).then(() => UI.toast('اتنسخ'), () => {}); return; }
      const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'new') Fin.editStaff();
      if (b.dataset.act === 'vunlock') V.unlock().then(() => global.Router.render(), er => { if (er.message !== 'cancel') UI.toast(er.message, 'err'); });
      if (b.dataset.act === 'vlock') { V.lock(); global.Router.render(); }
      if (b.dataset.act === 'vault' && V) { const m = (DB.team || []).find(x => x.id === b.dataset.id); if (m) V.open('staff', m.id, m.name); } };
    // الباسورد في الجدول على طول: باسورد الموظف، ولو مش متسجل ← باسورد الجهاز اللي معاه (من عمود PSWD)
    if (vOpen) (async () => {
      for (const r of rows) {
        const box = el.querySelector(`[data-vpw="${r.m.id}"]`); if (!box) continue;
        let sv = {}, dev = '';
        try { sv = await V.read('staff', r.m.id); for (const a of r.as) { const av = await V.read('asset', a.id); if (av.pass) { dev = av.pass; break; } } } catch (er) { return; }
        const val = sv.winPass || dev;
        box.outerHTML = `<div style="display:flex;gap:3px;align-items:center;min-width:170px"><input data-vpin="${r.m.id}" type="password" value="${U.esc(val || '')}" placeholder="اكتب الباسورد" dir="ltr" autocomplete="new-password" style="flex:1;min-width:0;padding:4px 6px"><button type="button" class="btn ghost sm" data-veye title="إظهار">👁</button><button type="button" class="btn ghost sm" data-vcopy title="نسخ">📋</button></div>`;
      }
    })();
    // التعديل من الجدول: يتحفظ أول ما تخرج من الخانة
    el.onchange = async e => {
      const i = e.target.closest('[data-vpin]'); if (!i) return; const id = i.dataset.vpin, m = (DB.team || []).find(x => x.id === id);
      try { const cur = await V.read('staff', id); cur.winPass = i.value.trim(); await V.write('staff', id, cur, 'باسورد ' + (m ? m.name : '')); UI.toast('🔑 اتحفظ باسورد ' + (m ? m.name : '')); }
      catch (er) { UI.toast(er.message, 'err'); }
    };
  };
  P.holder = function (el, id) {
    const m = (DB.team || []).find(x => x.id === id); if (!m) { el.innerHTML = '<div class="empty">الموظف غير موجود</div>'; return; }
    const as = DB.assets.filter(a => a.holderId === id && a.status === 'assigned');
    const subs = DB.subscriptions.filter(s => (s.users || []).includes(id) && s.status !== 'cancelled');
    const past = DB.assetLog.filter(x => x.holderId === id && x.kind === 'return').sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `<div class="page-head"><div><a href="#/staff" class="back">→ الموظفون</a><h1>${U.esc(m.name)} ${m.active === false ? '<span class="badge b-muted">ترك العمل</span>' : ''}</h1><p class="sub">${U.esc([m.role, m.dept, m.location, m.email].filter(Boolean).join(' · '))}</p></div>
      <div class="actions"><button class="btn primary" data-act="give">📤 تسليم جهاز</button>${as.length ? '<button class="btn" data-act="print">🖨 إقرار العهدة</button>' : ''}${as.length || subs.length || m.active !== false || (DB.lines || []).some(l => l.holderId === id && l.status === 'assigned') || (DB.mailboxes || []).some(b => b.holderId === id && b.status === 'active') ? '<button class="btn danger" data-act="clear">🚪 إخلاء طرف</button>' : ''}${Fin.printTPForm ? '<button class="btn" data-act="tpform">🖨 بيان العهد (تعيين / إخلاء)</button><button class="btn" data-act="receipt">🖨 نموذج استلام عهدة</button>' : ''}${global.Vault && global.Vault.allowed() ? `<button class="btn" data-act="vault">🔑 الباسوردات${global.Vault.has('staff', id) ? '' : ' +'}</button>` : ''}<button class="btn ghost" data-act="edit">تعديل</button></div></div>
      <div class="cards"><div class="card"><span>أجهزة معه</span><b>${as.length}</b><small>بقيمة ${U.money(U.sum(as, a => sar(a.cost, a.currency)), false)} ${CW()}</small></div><div class="card"><span>اشتراكات مخصصة له</span><b>${subs.length}</b></div><div class="card"><span>أجهزة سلّمها سابقاً</span><b>${past.length}</b></div></div>
      <div class="panel"><h2>العهدة الحالية</h2>${UI.table({ rows: as, empty: 'لا توجد أجهزة معه', columns: [
        { label: 'رقم العهدة', render: a => `<a href="#/asset/${a.id}" dir="ltr">${U.esc(a.tag)}</a>` }, { label: 'الجهاز', render: a => typeLabel(a.type) + ' — ' + U.esc(assetName(a)) },
        { label: 'سريال الجهاز', render: a => `<span dir="ltr" class="mono small">${U.esc(a.serial || '—')}</span>` },
        { label: 'الشاشة', render: a => a.monitor || a.monitorBrand ? `<b dir="ltr">${U.esc(a.monitor || '')}</b> ${U.esc(a.monitorBrand || '')}` : '—' },
        { label: 'سريال الشاشة', render: a => `<span dir="ltr" class="mono small">${U.esc(a.monitorSerial || '—')}</span>` }, { label: 'منذ', render: a => a.assignedAt || '' }, { label: 'الحالة', render: a => U.esc(a.condition || '') },
        { label: '', render: a => act('ret', a.id, '📥 استلام') }] })}</div>
      <div class="panel"><div class="panel-head"><h2>📞 الخطوط</h2><button class="btn sm" data-act="giveLine">📤 تسليم خط</button></div>${UI.table({ rows: (DB.lines || []).filter(l => l.holderId === id && l.status === 'assigned'), empty: 'لا توجد خطوط معه', columns: [{ label: 'الرقم', render: l => `<b dir="ltr">${Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number}</b>` }, { label: 'الشركة', render: l => U.esc(l.carrier || '') + `<div class="muted small">${U.esc(l.plan || '')}</div>` }, { label: 'منذ', render: l => l.assignedAt || '' }, { label: '', render: l => act('retLine', l.id, '📥 استلام') }] })}</div>
      <div class="panel"><div class="panel-head"><h2>✉️ الإيميلات</h2><button class="btn sm" data-act="newMail">+ إيميل</button></div>${UI.table({ rows: (DB.mailboxes || []).filter(b => b.holderId === id || (b.members || []).includes(id)), empty: 'لا يوجد إيميل', columns: [{ label: 'الإيميل', render: b => `<b dir="ltr">${U.esc(b.address)}</b>` }, { label: 'النوع', render: b => b.kind === 'shared' ? '👥 مشترك' : '🏢 تابع للشركة' }, { label: 'الحالة', render: b => b.status === 'active' ? '<span class="badge b-good">نشط</span>' : '<span class="badge b-warn">موقوف</span>' + (b.forwardTo ? `<div class="muted small" dir="ltr">→ ${U.esc(b.forwardTo)}</div>` : '') }] })}</div>
      <div class="panel"><h2>الاشتراكات والحسابات</h2>${UI.table({ rows: subs, empty: 'لا توجد', columns: [
        { label: 'الاشتراك', render: s => `<a href="#/sub/${s.id}">${U.esc(s.name)}</a>` }, { label: 'الخطة', render: s => U.esc(s.plan || '') }, { label: 'حساب الدخول', render: s => `<span dir="ltr">${U.esc(s.loginEmail || '')}</span>` }] })}</div>
      ${past.length ? `<div class="panel"><h2>أجهزة سلّمها سابقاً</h2>${UI.table({ rows: past, columns: [{ label: 'التاريخ', render: x => x.date }, { label: 'الجهاز', render: x => { const a = C.find('assets', x.assetId); return a ? `<a href="#/asset/${a.id}">${U.esc(a.tag)}</a> ${U.esc(assetName(a))}` : ''; } }, { label: 'الحالة عند الاستلام', render: x => U.esc(x.condition || '') }, { label: 'ملاحظات', render: x => U.esc(x.note || '') }] })}</div>` : ''}`;
    el.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'edit') Fin.editStaff(m); if (k === 'print') printCustody(id);
      if (k === 'vault' && global.Vault) global.Vault.open('staff', id, m.name);
      if (k === 'tpform' && Fin.printTPForm) Fin.printTPForm(id, m.active === false ? 'offboard' : 'onboard');
      if (k === 'receipt' && Fin.printReceipt) Fin.printReceipt(id);
      if (k === 'ret') Fin.returnAsset(C.find('assets', b.dataset.id));
      if (k === 'give') {
        const stock = DB.assets.filter(a => FREE.includes(a.status)); if (!stock.length) return UI.toast('لا توجد أجهزة متاحة في المخزن', 'warn');
        UI.modal({ title: 'تسليم جهاز إلى ' + m.name, body: UI.field({ label: 'الجهاز (من المخزن)', name: 'assetId', type: 'select', options: stock.map(a => ({ value: a.id, label: a.tag + ' — ' + (TYPES[a.type] || TYPES.other)[0] + ' ' + assetName(a) })) }), saveLabel: 'التالي',
          onSave: x => { const a = C.find('assets', UI.form(x.el).assetId); setTimeout(() => Fin.assignAsset(a, id)); } });
      }
      if (k === 'giveLine') { const st = (DB.lines || []).filter(l => l.status === 'stock'); if (!st.length) return UI.toast('لا توجد خطوط متاحة', 'warn'); UI.modal({ title: 'تسليم خط إلى ' + m.name, saveLabel: 'التالي', body: UI.field({ label: 'الخط', name: 'lid', type: 'select', options: st.map(l => ({ value: l.id, label: Fin.fmtPhone(l.number) + ' — ' + l.carrier })) }), onSave: x => { const l = C.find('lines', UI.form(x.el).lid); setTimeout(() => Fin.assignLine(l, id)); } }); }
      if (k === 'retLine') { const l = C.find('lines', b.dataset.id); if (confirm('استلام الخط؟')) { const h = l.holderId; Object.assign(l, { status: 'stock', holderId: '', assignedAt: '' }); C.upsert('lines', l, 'استلام خط'); log(l.id, 'return', { holderId: h }); global.Router.render(); } }
      if (k === 'newMail') Fin.editMailbox(null, { kind: 'personal', holderId: id });
      if (k === 'clear' && Fin.startOffboard) return Fin.startOffboard(id);
      if (k === 'clear') UI.modal({
        title: 'إخلاء طرف — ' + m.name,
        body: `<p>سيتم:</p><ul><li>استلام <b>${as.length}</b> جهاز وإرجاعها للمخزن</li><li>إزالته من <b>${subs.length}</b> اشتراك (لا تنسَ تغيير كلمات السر وإلغاء صلاحياته من المنصات نفسها)</li><li>تحويل حالته إلى "ترك العمل"</li></ul>
          ${UI.field({ label: 'حالة الأجهزة عند الاستلام', name: 'condition', type: 'select', options: CONDS, value: 'جيد' })}${UI.field({ label: 'ملاحظات', name: 'note' })}`,
        saveLabel: 'تنفيذ إخلاء الطرف',
        onSave: x => {
          const d = UI.form(x.el);
          as.forEach(a => returnIt(a, today(), d.condition, d.note || 'إخلاء طرف'));
          subs.forEach(s => { s.users = (s.users || []).filter(u => u !== id); C.upsert('subscriptions', s, 'اشتراك'); });
          m.active = false; m.leftAt = today(); C.upsert('team', m, 'إخلاء طرف');
          UI.toast('تم إخلاء طرف ' + m.name); global.Router.render();
        },
      });
    };
  };

  // ============ الاشتراكات ============
  Fin.editSub = function (s) {
    s = s || { status: 'active', cycle: 'monthly', currency: 'USD', category: SCATS[0], startDate: today(), renewalDate: U.addMonths(today(), 1), seats: 1, users: [] };
    UI.modal({
      title: s.id ? 'تعديل اشتراك' : 'اشتراك جديد', wide: true,
      body: `<div class="grid2">
        ${UI.field({ label: 'اسم الخدمة', name: 'name', value: s.name, required: true, placeholder: 'Adobe Creative Cloud' })}
        ${UI.field({ label: 'الفئة', name: 'category', type: 'select', options: SCATS, value: s.category })}
        ${UI.field({ label: 'الشركة المقدمة', name: 'vendor', value: s.vendor, placeholder: 'Adobe Inc.' })}
        ${UI.field({ label: 'الخطة', name: 'plan', value: s.plan, placeholder: 'Teams — All Apps' })}
        ${UI.field({ label: 'التكلفة لكل دورة', name: 'cost', type: 'number', value: s.cost || '', required: true })}
        ${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: s.currency })}
        ${UI.field({ label: 'دورة الدفع', name: 'cycle', type: 'select', options: opts(CYCLES), value: s.cycle })}
        ${UI.field({ label: 'عدد المقاعد / الحسابات', name: 'seats', type: 'number', value: s.seats || 1 })}
        ${UI.field({ label: 'النوع', name: 'kind', type: 'select', options: [{ value: 'subscription', label: 'اشتراك خدمة' }, { value: 'license', label: 'ترخيص بمقاعد (Microsoft 365، Windows Pro، أنتي فيروس…)' }], value: s.kind || 'subscription' })}
        ${UI.field({ label: 'مقاعد مستخدمة على أجهزة (لو مش مربوطة بأشخاص)', name: 'usedSeats', type: 'number', value: s.usedSeats || '' })}
        ${UI.field({ label: 'تاريخ البداية', name: 'startDate', type: 'date', value: s.startDate })}
        ${UI.field({ label: 'تاريخ التجديد القادم', name: 'renewalDate', type: 'date', value: s.renewalDate })}
        ${UI.field({ label: 'وسيلة الدفع', name: 'payment', value: s.payment, placeholder: 'بطاقة الشركة **** 4321' })}
        ${UI.field({ label: 'حساب الدخول (الإيميل)', name: 'loginEmail', value: s.loginEmail, attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'رابط الموقع / لوحة التحكم', name: 'url', value: s.url, attrs: 'dir="ltr"', placeholder: 'https://' })}
        ${UI.field({ label: 'مسؤول الاشتراك', name: 'ownerId', type: 'select', options: staffOpts('— غير محدد —'), value: s.ownerId })}
        ${UI.field({ label: 'الحالة', name: 'status', type: 'select', options: opts(SSTATUS), value: s.status })}
        ${UI.field({ label: 'تجديد تلقائي', name: 'autoRenew', type: 'checkbox', value: s.autoRenew })}
        ${UI.field({ label: 'خدمة أجنبية (احتساب عكسي للضريبة عند تسجيل المصروف)', name: 'foreign', type: 'checkbox', value: s.foreign })}
        <div class="field full"><span>مين بيستخدمه</span><div class="chk-grid">${(DB.team || []).filter(m => m.active !== false).map(m => `<label class="chk"><input type="checkbox" data-user="${m.id}" ${(s.users || []).includes(m.id) ? 'checked' : ''}> ${U.esc(m.name)}</label>`).join('')}</div></div>
        ${UI.field({ label: 'ملاحظات', name: 'notes', type: 'textarea', value: s.notes, full: true })}
      </div><p class="muted small">🔒 لا تكتب كلمات السر هنا — احفظها في مدير كلمات مرور (مثل Bitwarden أو 1Password).</p>`,
      onSave: m => {
        const d = UI.form(m.el); UI.require(d, [['name', 'اسم الخدمة'], ['cost', 'التكلفة']]);
        d.users = $$('[data-user]', m.el).filter(i => i.checked).map(i => i.dataset.user);
        if (d.seats && d.users.length > d.seats) throw new Error(`المستخدمين (${d.users.length}) أكثر من عدد المقاعد (${d.seats})`);
        const o = Object.assign({ history: [] }, s, d); if (!o.code && global.ITX) o.code = global.ITX.nextCode('LIC');
        C.upsert('subscriptions', o, 'اشتراك'); UI.toast('تم الحفظ'); global.Router.render();
      },
    });
  };
  // تجديد: يقدّم تاريخ التجديد دورة، ويسجّل المصروف في النظام المالي (اختياري)
  Fin.renewSub = function (s) {
    const cyc = (CYCLES[s.cycle] || CYCLES.monthly)[1], next = U.addMonths(s.renewalDate || today(), cyc);
    const tre = UI.opt.treasuries().filter(o => !L.isForeign(o.value));
    UI.modal({
      title: 'تجديد ' + s.name,
      body: `<div class="grid2">
        ${UI.field({ label: 'تاريخ الدفع', name: 'date', type: 'date', value: today() })}
        ${UI.field({ label: 'التجديد القادم بعد الدفع', name: 'next', type: 'date', value: next })}
        ${UI.field({ label: 'المبلغ المدفوع', name: 'amount', type: 'number', value: s.cost })}
        ${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: s.currency })}
        ${UI.field({ label: 'تسجيل المصروف في النظام المالي', name: 'expense', type: 'checkbox', value: !(global.APP_CONFIG || {}).standalone })}
        ${UI.field({ label: 'دُفع من', name: 'treasuryId', type: 'select', options: tre, value: (tre.find(o => /الراجحي|بنك/.test(o.label)) || tre[0] || {}).value })}
      </div><p class="muted small">المصروف يتسجل على حساب "اشتراكات البرامج والأدوات" (6400) بالريال بسعر الصرف المحفوظ${s.foreign ? '، مع احتساب عكسي للضريبة لأن الخدمة أجنبية' : ''}.</p>`,
      saveLabel: 'تجديد',
      onSave: m => {
        const d = UI.form(m.el); if (!U.num(d.amount)) throw new Error('أدخل المبلغ');
        const amountSar = sar(d.amount, d.currency); let expenseId = '';
        if (d.expense) {
          if (!d.treasuryId) throw new Error('اختر الخزينة');
          C.assertOpen(d.date);
          const acc = C.accByCode('6400') || C.accByCode('6000');
          const x = { id: U.uid(), no: C.nextNo('expense'), date: d.date, accountId: acc.id, amount: amountSar, taxRate: 0, treasuryId: d.treasuryId, method: 'بطاقة ائتمانية', payee: s.vendor || s.name, notes: 'تجديد اشتراك ' + s.name + (s.plan ? ' — ' + s.plan : '') + (d.currency !== 'SAR' ? ` (${d.amount} ${d.currency})` : ''), reverseCharge: !!s.foreign, source: 'it' };
          C.upsert('expenses', x, 'مصروف اشتراك'); expenseId = x.id;
        }
        s.history = (s.history || []).concat([{ date: d.date, amount: U.num(d.amount), currency: d.currency, sar: amountSar, expenseId }]);
        s.renewalDate = d.next; if (s.status === 'trial') s.status = 'active';
        C.upsert('subscriptions', s, 'تجديد اشتراك'); UI.toast('تم التجديد' + (expenseId ? ' وتسجيل المصروف ' + C.find('expenses', expenseId).no : '')); global.Router.render();
      },
    });
  };
  P.subs = function (el) {
    const t = today();
    UI.listPage(el, {
      title: 'الاشتراكات', subtitle: 'البرامج والخدمات المدفوعة، تكلفتها الشهرية، ومواعيد التجديد', csvName: 'subscriptions',
      actions: '<button class="btn primary" data-act="new">+ اشتراك</button>',
      filters: [{ key: 'status', options: [{ value: 'on', label: 'النشطة' }, { value: '', label: 'كل الحالات' }].concat(opts(SSTATUS)) }, { key: 'category', options: [{ value: '', label: 'كل الفئات' }].concat(SCATS) }],
      initial: { status: 'on' },
      rows: s => DB.subscriptions.filter(x => (s.status === 'on' ? ['active', 'trial'].includes(x.status) : (!s.status || x.status === s.status)) && (!s.category || x.category === s.category)).sort((a, b) => (a.renewalDate || '9').localeCompare(b.renewalDate || '9')),
      searchText: x => [x.name, x.vendor, x.plan, x.category, x.loginEmail].join(' '),
      summary: rows => { const mo = U.sum(rows.filter(x => ['active', 'trial'].includes(x.status)), x => sar(x.cost, x.currency) / (CYCLES[x.cycle] || CYCLES.monthly)[1]);
        return `<div class="cards"><div class="card"><span>العدد</span><b>${rows.length}</b></div><div class="card"><span>شهرياً</span><b>${U.money(mo)}</b></div><div class="card"><span>سنوياً</span><b>${U.money(mo * 12)}</b></div><div class="card"><span>تجديد خلال 30 يوم</span><b>${rows.filter(x => x.renewalDate && x.renewalDate <= U.addDays(t, 30) && x.status !== 'cancelled').length}</b></div></div>`; },
      empty: 'لا توجد اشتراكات',
      columns: [
        { label: 'الخدمة', render: x => `<a href="#/sub/${x.id}"><b>${U.esc(x.name)}</b></a><div class="muted small">${x.code ? `<span dir="ltr">${U.esc(x.code)}</span> · ` : ''}${x.kind === 'license' ? 'ترخيص · ' : ''}${U.esc([x.plan, x.category].filter(Boolean).join(' · '))}</div>`, text: x => (x.code || '') + ' ' + x.name },
        { label: 'التكلفة', cls: 'num', render: x => `${global.ITX.money(x.cost, x.currency || BASE())}<div class="muted small">${(CYCLES[x.cycle] || CYCLES.monthly)[0]}</div>`, text: x => sar(x.cost, x.currency) },
        { label: 'شهرياً (' + CW() + ')', cls: 'num', render: x => U.money(U.round(sar(x.cost, x.currency) / (CYCLES[x.cycle] || CYCLES.monthly)[1]), false), text: x => U.round(sar(x.cost, x.currency) / (CYCLES[x.cycle] || CYCLES.monthly)[1]) },
        { label: 'المقاعد', cls: 'num', render: x => { const u = (x.users || []).length || U.num(x.usedSeats); return `<span class="${x.seats && u >= x.seats ? 't-warn' : ''}">${u} / ${x.seats || '∞'}</span>`; }, text: x => ((x.users || []).length || U.num(x.usedSeats)) + '/' + (x.seats || '') },
        { label: 'التجديد', render: x => !x.renewalDate ? '—' : `<span class="${x.renewalDate < t ? 't-bad' : x.renewalDate <= U.addDays(t, 7) ? 't-warn' : ''}">${x.renewalDate}</span>${x.autoRenew ? ' <small class="muted">تلقائي</small>' : ''}`, text: x => x.renewalDate || '' },
        { label: 'المسؤول', render: x => U.esc(nm(x.ownerId) || '—'), text: x => nm(x.ownerId) },
        { label: 'الحالة', render: x => badge(SSTATUS, x.status), text: x => (SSTATUS[x.status] || [''])[0] },
        { label: '', noExport: true, render: x => x.status !== 'cancelled' ? act('renew', x.id, '🔁 تجديد') : '' },
      ],
      onAction: (k, id) => { if (k === 'new') Fin.editSub(); if (k === 'renew') Fin.renewSub(C.find('subscriptions', id)); },
    });
  };
  P.sub = function (el, id) {
    const s = C.find('subscriptions', id); if (!s) { el.innerHTML = '<div class="empty">الاشتراك غير موجود</div>'; return; }
    const cyc = CYCLES[s.cycle] || CYCLES.monthly, mo = U.round(sar(s.cost, s.currency) / cyc[1]);
    const hist = (s.history || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `<div class="page-head"><div><a href="#/subs" class="back">→ الاشتراكات</a><h1>${U.esc(s.name)} ${badge(SSTATUS, s.status)}</h1><p class="sub">${U.esc([s.vendor, s.plan, s.category].filter(Boolean).join(' · '))}</p></div>
      <div class="actions">${s.status !== 'cancelled' ? '<button class="btn primary" data-act="renew">🔁 تجديد</button><button class="btn ghost" data-act="cancel">إلغاء الاشتراك</button>' : ''}<button class="btn ghost" data-act="edit">تعديل</button></div></div>
      <div class="cards mk-cards">
        <div class="card"><span>التكلفة</span><b>${global.ITX.money(s.cost, s.currency || BASE())}</b><small>${cyc[0]}</small></div>
        <div class="card"><span>شهرياً بال${CW()}</span><b>${U.money(mo, false)}</b><small>سنوياً ${U.money(mo * 12, false)}</small></div>
        <div class="card"><span>التجديد القادم</span><b class="${s.renewalDate && s.renewalDate < today() ? 't-bad' : ''}">${s.renewalDate || '—'}</b><small>${s.autoRenew ? 'تجديد تلقائي' : 'تجديد يدوي'}</small></div>
        <div class="card"><span>المقاعد</span><b>${(s.users || []).length} / ${s.seats || '∞'}</b></div>
        <div class="card"><span>إجمالي المدفوع</span><b>${U.money(U.sum(hist, h => U.num(h.sar)), false)}</b><small>${hist.length} دفعة</small></div>
      </div>
      <div class="dash-grid">
        <div class="panel"><h2>بيانات الحساب</h2><table class="tbl compact"><tbody>
          <tr><td>حساب الدخول</td><td dir="ltr">${U.esc(s.loginEmail || '—')}</td></tr>${s.url ? `<tr><td>الموقع</td><td dir="ltr"><a href="${U.esc(s.url)}" target="_blank" rel="noopener">${U.esc(s.url)} ↗</a></td></tr>` : ''}<tr><td>وسيلة الدفع</td><td>${U.esc(s.payment || '—')}</td></tr>
          <tr><td>المسؤول</td><td>${U.esc(nm(s.ownerId) || '—')}</td></tr><tr><td>بداية الاشتراك</td><td>${s.startDate || '—'}</td></tr>
          <tr><td>المستخدمون</td><td>${(s.users || []).map(u => `<a href="#/holder/${u}">${U.esc(nm(u))}</a>`).join('، ') || '—'}</td></tr></tbody></table>
          ${s.notes ? `<p class="small">${U.esc(s.notes)}</p>` : ''}</div>
        <div class="panel"><h2>سجل الدفعات</h2>${UI.table({ rows: hist, empty: 'لا توجد دفعات مسجلة', columns: [
          { label: 'التاريخ', render: h => h.date }, { label: 'المبلغ', cls: 'num', render: h => U.money(h.amount, false) + ' ' + (h.currency || '') },
          { label: 'بال' + CW(), cls: 'num', render: h => U.money(h.sar, false), sum: h => U.num(h.sar) },
          { label: 'المصروف', render: h => { const x = h.expenseId && C.find('expenses', h.expenseId); return x ? `<span class="badge b-good">✓ ${U.esc(x.no)}</span>` : '<span class="muted small">غير مسجل</span>'; } }] })}</div>
      </div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'renew') Fin.renewSub(s); if (k === 'edit') Fin.editSub(s);
      if (k === 'cancel' && confirm('إلغاء اشتراك ' + s.name + '؟ (ألغِه من موقع الخدمة أيضاً)')) { s.status = 'cancelled'; s.cancelledAt = today(); C.upsert('subscriptions', s, 'إلغاء اشتراك'); global.Router.render(); } };
  };

  // البحث في نظام IT
  if (global.APP && global.APP.id === 'it') UI.search = function (q) {
    q = String(q || '').trim().toLowerCase(); if (q.length < 2) return [];
    const has = (...xs) => xs.some(x => x != null && String(x).toLowerCase().includes(q)), res = [];
    DB.assets.forEach(a => { if (has(a.tag, a.brand, a.model, a.serial, a.specs)) res.push({ ic: (TYPES[a.type] || TYPES.other)[1], t: a.tag + ' — ' + assetName(a), s: (ASTATUS[a.status] || [''])[0] + (a.holderId ? ' · ' + nm(a.holderId) : ''), h: '#/asset/' + a.id }); });
    (DB.team || []).forEach(m => { if (has(m.name, m.role, m.dept, m.email)) res.push({ ic: '👤', t: m.name, s: [m.dept, m.role].filter(Boolean).join(' · '), h: '#/holder/' + m.id }); });
    (DB.lines || []).forEach(l => { if (has(l.number, Fin.fmtPhone ? Fin.fmtPhone(l.number) : '', l.carrier, l.iccid)) res.push({ ic: '📞', t: (Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number) + ' — ' + l.carrier, s: 'خط' + (l.holderId ? ' · ' + nm(l.holderId) : ''), h: '#/lines' }); });
    (DB.mailboxes || []).forEach(b => { if (has(b.address, b.aliases)) res.push({ ic: '✉️', t: b.address, s: 'إيميل' + (b.holderId ? ' · ' + nm(b.holderId) : ''), h: '#/mail' }); });
    DB.subscriptions.forEach(s => { if (has(s.name, s.vendor, s.plan, s.loginEmail)) res.push({ ic: '🔁', t: s.name, s: 'اشتراك · ' + (s.renewalDate || ''), h: '#/sub/' + s.id }); });
    return res.slice(0, 30);
  };

  if (global.I18N) Object.assign(global.I18N.dict, {
    "تقنية المعلومات": "IT", "نظام تقنية المعلومات": "IT System", "لوحة تقنية المعلومات": "IT Dashboard", "العُهد": "Assets", "الأجهزة والعُهد": "Devices & Assets", "الموظفون وعهدهم": "Staff & Custody", "الاشتراكات": "Subscriptions", "الأنظمة": "Systems",
    "لابتوب": "Laptop", "موبايل": "Mobile", "كمبيوتر مكتبي": "Desktop", "شاشة": "Monitor", "تابلت": "Tablet", "كاميرا": "Camera", "عدسة": "Lens", "إضاءة ومعدات تصوير": "Lighting & gear", "مايك وصوتيات": "Mic & audio", "طابعة": "Printer", "راوتر وشبكات": "Router & network", "إكسسوارات": "Accessories",
    "في المخزن": "In stock", "مُسلَّم": "Assigned", "في الصيانة": "In repair", "مفقود": "Lost", "مُكهَّن": "Retired", "جديد": "New", "ممتاز": "Excellent", "جيد": "Good", "مقبول": "Fair", "به عيوب": "Defects", "تالف": "Damaged",
    "تسجيل جهاز جديد": "Register new device", "+ جهاز": "+ Device", "رقم العهدة": "Asset tag", "الماركة": "Brand", "الموديل": "Model", "الرقم التسلسلي (S/N) أو IMEI": "Serial no. / IMEI", "المواصفات": "Specs", "تاريخ الشراء": "Purchase date", "نهاية الضمان": "Warranty end",
    "سعر الشراء": "Purchase price", "المورد / المتجر": "Supplier / store", "الحالة الفنية": "Condition", "الموظف المستلم": "Receiving employee", "تاريخ التسليم": "Handover date", "الحالة عند التسليم": "Condition at handover", "ملحقات مسلّمة معه": "Accessories handed over",
    "طباعة إقرار الاستلام بعد الحفظ": "Print custody form after saving", "تسليم": "Hand over", "استلام": "Receive", "تاريخ الاستلام": "Return date", "الحالة عند الاستلام": "Condition at return", "ملاحظات (نواقص أو أعطال)": "Notes (missing parts or faults)",
    "📤 تسليم": "📤 Hand over", "📥 استلام": "📥 Receive", "📤 تسليم لموظف": "📤 Hand over to employee", "🔧 صيانة": "🔧 Repair", "✅ رجوع من الصيانة": "✅ Back from repair", "🗑️ تكهين": "🗑️ Retire", "⚠️ مفقود": "⚠️ Lost", "🔎 تم العثور عليه": "🔎 Found", "🖨 إقرار عهدة": "🖨 Custody form",
    "العطل": "Fault", "مركز الصيانة": "Repair center", "تكلفة الإصلاح": "Repair cost", "تكلفة متوقعة": "Estimated cost", "ما تم إصلاحه": "What was fixed", "الحالة بعد الإصلاح": "Condition after repair", "اكتب العطل": "Describe the fault",
    "إقرار استلام عهدة": "Asset Custody Form", "توقيع الموظف المستلم": "Employee signature", "مسؤول تقنية المعلومات": "IT officer", "حسابات واشتراكات مخصصة له:": "Assigned accounts and subscriptions:",
    "العُهد والأجهزة والاشتراكات في مكان واحد": "Assets, devices and subscriptions in one place", "+ اشتراك": "+ Subscription", "الأجهزة": "Devices", "مُسلَّمة لموظفين": "Assigned to staff", "متاحة في المخزن": "Available in stock",
    "الاشتراكات شهرياً": "Subscriptions / month", "الاشتراكات سنوياً": "Subscriptions / year", "ريال تقريباً": "SAR approx.", "التجديدات القادمة (30 يوم)": "Upcoming renewals (30 days)", "لا توجد تجديدات قريبة": "No upcoming renewals", "التجديد": "Renewal",
    "🔁 تجديد": "🔁 Renew", "الأجهزة حسب النوع": "Devices by type", "العدد": "Count", "مُسلَّم ": "Assigned", "متاح": "Available", "تكلفة الاشتراكات الشهرية حسب الفئة": "Monthly subscription cost by category", "شهرياً (ريال)": "Monthly (SAR)", "آخر الحركات": "Recent activity", "الحركة": "Action",
    "كل جهاز برقم عهدة، ومع مين، وحالته وضمانه": "Every device with its tag, holder, condition and warranty", "كل الأنواع": "All types", "الأجهزة الحالية": "Current devices", "كل الأماكن": "All locations", "القيمة": "Value", "مع": "With", "المكان": "Location", "الضمان": "Warranty",
    "لا توجد أجهزة — سجّل أول جهاز": "No devices — register the first one", "الجهاز غير موجود": "Device not found", "→ الأجهزة": "← Devices", "العمر": "Age", "تكلفة الصيانة": "Repair cost", "سجل الجهاز": "Device history", "لا يوجد سجل": "No history",
    "موظف جديد": "New employee", "تعديل موظف": "Edit employee", "+ موظف": "+ Employee", "القسم": "Department", "الوظيفة": "Job title", "الإدارة": "Management", "المالية": "Finance", "التشغيل": "Operations", "الموارد البشرية": "HR",
    "ما مع كل موظف من أجهزة واشتراكات — وإخلاء الطرف عند ترك العمل": "What each employee holds — and clearance when they leave", "قيمة العهدة": "Custody value", "اشتراكات": "Subscriptions", "ترك العمل": "Left", "ترك العمل — معه عهدة!": "Left — still holds assets!", "على رأس العمل": "Active",
    "الموظف غير موجود": "Employee not found", "→ الموظفون": "← Staff", "📤 تسليم جهاز": "📤 Hand over device", "🖨 إقرار العهدة": "🖨 Custody form", "🚪 إخلاء طرف": "🚪 Clearance", "أجهزة معه": "Devices held", "اشتراكات مخصصة له": "Assigned subscriptions", "أجهزة سلّمها سابقاً": "Previously returned",
    "العهدة الحالية": "Current custody", "لا توجد أجهزة معه": "No devices held", "الاشتراكات والحسابات": "Subscriptions & accounts", "حساب الدخول": "Login account", "تنفيذ إخلاء الطرف": "Run clearance", "حالة الأجهزة عند الاستلام": "Device condition at return",
    "لا توجد أجهزة متاحة في المخزن": "No devices in stock", "الجهاز (من المخزن)": "Device (from stock)", "التالي": "Next",
    "اشتراك جديد": "New subscription", "تعديل اشتراك": "Edit subscription", "اسم الخدمة": "Service name", "الفئة": "Category", "الشركة المقدمة": "Vendor", "الخطة": "Plan", "التكلفة لكل دورة": "Cost per cycle", "دورة الدفع": "Billing cycle",
    "عدد المقاعد / الحسابات": "Seats / accounts", "تاريخ التجديد القادم": "Next renewal date", "وسيلة الدفع": "Payment method", "حساب الدخول (الإيميل)": "Login (email)", "مسؤول الاشتراك": "Owner", "تجديد تلقائي": "Auto-renew",
    "خدمة أجنبية (احتساب عكسي للضريبة عند تسجيل المصروف)": "Foreign service (VAT reverse charge on expense)", "مين بيستخدمه": "Who uses it", "شهري": "Monthly", "ربع سنوي": "Quarterly", "سنوي": "Yearly",
    "نشط": "Active", "تجريبي": "Trial", "متوقف": "Paused", "ملغي": "Cancelled", "تصميم ومونتاج": "Design & editing", "إعلانات وتسويق": "Ads & marketing", "إنتاجية وبريد": "Productivity & email", "تواصل واجتماعات": "Communication", "استضافة ودومين": "Hosting & domain",
    "تحليلات وSEO": "Analytics & SEO", "أمن وحماية": "Security", "ذكاء اصطناعي": "AI", "تاريخ الدفع": "Payment date", "التجديد القادم بعد الدفع": "Next renewal after payment", "المبلغ المدفوع": "Amount paid", "تسجيل المصروف في النظام المالي": "Record expense in Financial System", "دُفع من": "Paid from",
    "البرامج والخدمات المدفوعة، تكلفتها الشهرية، ومواعيد التجديد": "Paid software and services, monthly cost and renewals", "النشطة": "Active", "كل الفئات": "All categories", "شهرياً": "Monthly", "سنوياً": "Yearly", "تجديد خلال 30 يوم": "Renewing in 30 days",
    "الخدمة": "Service", "المقاعد": "Seats", "المسؤول": "Owner", "لا توجد اشتراكات": "No subscriptions", "الاشتراك غير موجود": "Subscription not found", "→ الاشتراكات": "← Subscriptions", "إلغاء الاشتراك": "Cancel subscription", "شهرياً بالريال": "Monthly in SAR",
    "التجديد القادم": "Next renewal", "تجديد يدوي": "Manual renewal", "إجمالي المدفوع": "Total paid", "دفعة": "payments", "بيانات الحساب": "Account details", "بداية الاشتراك": "Start date", "المستخدمون": "Users", "سجل الدفعات": "Payment history",
    "لا توجد دفعات مسجلة": "No payments recorded", "بالريال": "In SAR", "المصروف": "Expense", "غير مسجل": "Not recorded", "الأنظمة ": "Systems",
  });
})(window);
