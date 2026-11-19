/* =========================================================
   pages-it2.js — نظام تقنية المعلومات (تكملة)
   • خطوط الشركة كعُهد: أرقام سعودية (STC، موبايلي، زين) ومصرية (فودافون، أورنج، اتصالات، WE)
   • إيميلات الشركة: شخصية ومشتركة، إيقاف وتحويل بعد ترك العمل
   • التعيين والإخلاء: قائمة مهام للموظف الجديد، وإخلاء طرف بكل ما معه + شهادة إخلاء طرف للطباعة
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, L = global.Ledger, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {};
  const { $, $$ } = UI;
  const act = (a, id, label, cls) => `<button class="link ${cls || ''}" data-act="${a}" data-id="${id || ''}">${label}</button>`;
  const today = () => U.today();
  const staff = id => (DB.team || []).find(m => m.id === id) || {};
  const nm = id => staff(id).name || '';
  const badge = (map, s) => { const x = map[s] || Object.values(map)[0]; return `<span class="badge b-${x[1]}"><i>•</i>${x[0]}</span>`; };
  const opts = map => Object.entries(map).map(([k, v]) => ({ value: k, label: v[0] }));
  const sar = (a, cur) => U.round(U.num(a) * L.defaultRate(cur || DB.settings.baseCurrency || 'SAR'));
  const staffOpts = empty => [{ value: '', label: empty || '— اختر —' }].concat((DB.team || []).filter(m => m.active !== false).map(m => ({ value: m.id, label: m.name + (m.dept ? ' · ' + m.dept : '') })));
  const log = (id, kind, extra) => C.upsert('assetLog', Object.assign({ id: U.uid(), assetId: id, kind, date: today() }, extra || {}), 'سجل عهدة');
  ['lines', 'mailboxes', 'moves'].forEach(k => { if (global.DB && !DB[k]) DB[k] = []; });

  // ================= الخطوط =================
  const COUNTRY = { SA: ['🇸🇦 السعودية', 'SAR'], EG: ['🇪🇬 مصر', 'EGP'] };
  const CARRIERS = { SA: ['STC', 'موبايلي', 'زين', 'سلام', 'ليبارا'], EG: ['فودافون', 'أورنج', 'اتصالات (e&)', 'WE'] };
  const LKIND = { voice: 'خط موبايل (مكالمات + إنترنت)', data: 'إنترنت فقط (راوتر / موبايل واي فاي)', esim: 'eSIM', landline: 'أرضي' };
  // كود الاستعلام / الشحن لكل شركة اتصالات سعودية
  const BAL = { 'زين': '*144#', 'موبايلي': '*222#', 'STC': '*150#' };
  const LSTATUS = { stock: ['في المخزن', 'info'], assigned: ['مُسلَّم', 'good'], suspended: ['موقوف مؤقتاً', 'warn'], cancelled: ['ملغي', 'muted'] };
  const normPhone = (p, c) => { let d = String(p || '').replace(/[^\d+]/g, ''); if (c === 'SA') { if (/^0[15]\d{8}$/.test(d)) d = '+966' + d.slice(1); if (/^966[15]\d{8}$/.test(d)) d = '+' + d; } if (c === 'EG') { if (/^01\d{9}$/.test(d)) d = '+2' + d; if (/^201\d{9}$/.test(d)) d = '+' + d; } return d; };
  const validPhone = (d, c) => c === 'SA' ? /^\+966[15]\d{8}$/.test(d) : c === 'EG' ? /^\+201[0125]\d{8}$/.test(d) : d.length > 6;
  const fmtPhone = d => { const m = String(d || ''); if (m.startsWith('+966')) return '+966 ' + m.slice(4, 6) + ' ' + m.slice(6, 9) + ' ' + m.slice(9); if (m.startsWith('+20')) return '+20 ' + m.slice(3, 6) + ' ' + m.slice(6, 9) + ' ' + m.slice(9); return m; };
  const guessCarrier = d => { const e = String(d).match(/^\+201([0125])/); if (e) return { 0: 'فودافون', 1: 'اتصالات (e&)', 2: 'أورنج', 5: 'WE' }[e[1]]; const s = String(d).match(/^\+9665(\d)/); if (s) return { 0: 'STC', 3: 'STC', 5: 'STC', 4: 'موبايلي', 6: 'موبايلي', 8: 'زين', 9: 'زين', 7: 'سلام' }[s[1]] || ''; return ''; };
  Fin.editLine = function (l) {
    const isNew = !l || !l.id;
    l = l || { country: 'SA', carrier: 'STC', kind: 'voice', status: 'stock', currency: 'SAR', cycle: 'monthly' };
    UI.modal({
      title: isNew ? 'تسجيل خط جديد' : 'تعديل خط ' + fmtPhone(l.number),
      body: `<div class="grid2">
        ${UI.field({ label: 'الدولة', name: 'country', type: 'select', options: Object.entries(COUNTRY).map(([k, v]) => ({ value: k, label: v[0] })), value: l.country })}
        ${UI.field({ label: 'رقم الخط', name: 'number', value: l.number ? fmtPhone(l.number) : '', required: true, placeholder: l.country === 'EG' ? '010 1234 5678' : '05X XXX XXXX', attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'شركة الاتصالات', name: 'carrier', type: 'select', options: CARRIERS[l.country] || CARRIERS.SA, value: l.carrier })}
        ${UI.field({ label: 'نوع الخط', name: 'kind', type: 'select', options: Object.entries(LKIND).map(([k, v]) => ({ value: k, label: v })), value: l.kind })}
        ${UI.field({ label: 'الباقة', name: 'plan', value: l.plan, placeholder: 'مثال: باقة أعمال 150 جيجا' })}
        ${UI.field({ label: 'رقم الشريحة (ICCID)', name: 'iccid', value: l.iccid, attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'التكلفة الشهرية', name: 'cost', type: 'number', value: l.cost || '' })}
        ${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: l.currency })}
        ${UI.field({ label: 'الاستخدام', name: 'purpose', value: l.purpose, placeholder: 'مثال: خط خدمة العملاء / خط الموظف' })}
        ${UI.field({ label: 'مسجل باسم', name: 'owner', value: l.owner || 'الشركة', placeholder: 'الشركة / اسم المفوض' })}
        ${UI.field({ label: 'آخر دفع / تجديد فعلي', name: 'lastPaid', type: 'date', value: l.lastPaid })}
        <div class="field"><span>مدة التجديد (لكل خط — مفيش مدة افتراضية)</span><div style="display:flex;gap:6px"><input type="number" name="renewDur" min="0" value="${U.esc(l.renewDur || '')}" placeholder="مثال: 3" style="flex:1"><select name="renewUnit">${UI.options(global.ITX ? global.ITX.UNITS : [], l.renewUnit || 'months')}</select></div></div>
        ${UI.field({ label: l.country === 'EG' ? 'ميعاد الشحن القادم' : 'ميعاد التجديد القادم', name: 'renewDate', type: 'date', value: l.renewDate, hint: 'بيتحسب لوحده من آخر دفع + المدة. اكتبه بإيدك بس لو المدة مش متحددة' })}
        ${UI.field({ label: 'نبّهني قبل (يوم)', name: 'notifyDays', type: 'number', value: l.notifyDays || '', placeholder: 'مثال: 10' })}
        ${UI.field({ label: 'حالة الشبكة', name: 'network', type: 'select', options: ['غير معروف', 'تعمل', 'لا تعمل'], value: l.network || 'غير معروف' })}
        ${UI.field({ label: 'مكالمات', name: 'calls', type: 'select', options: ['غير معروف', 'نعم', 'لا'], value: l.calls || 'غير معروف' })}
        ${l.country !== 'EG' ? `
        ${UI.field({ label: 'مكان الحيازة', name: 'possession', type: 'select', options: ['مع الشركة في مصر', 'مع الوكيل في السعودية'], value: l.possession || 'مع الشركة في مصر', hint: '"مع الوكيل" مكان مش عطل — الشريحة ممكن تبقى مستخدمة ومع الوكيل' })}
        ${UI.field({ label: 'المسؤول عن الشحن والمتابعة', name: 'chargeBy', value: l.chargeBy })}
        ${UI.field({ label: 'بيانات الوكيل', name: 'agentInfo', value: l.agentInfo, placeholder: 'الاسم / الرقم' })}
        ${UI.field({ label: 'إيميل الباك أب (العنوان بس)', name: 'backupEmail', value: l.backupEmail, attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'راجع الباك أب كل (يوم)', name: 'backupEveryDays', type: 'number', value: l.backupEveryDays || '', placeholder: 'مثال: 30' })}` : ''}
        ${UI.field({ label: 'في الموبايل (كود الهاتف)', name: 'phoneTag', type: 'select', options: [{ value: '', label: '— —' }].concat((DB.assets || []).filter(a => a.type === 'mobile').map(a => ({ value: a.tag, label: a.tag + ' — ' + ([a.brand, a.model].filter(Boolean).join(' ') || '') }))), value: l.phoneTag || '' })}
        ${UI.field({ label: 'عليه واتساب بيزنس', name: 'whatsapp', type: 'checkbox', value: l.whatsapp })}
        ${UI.field({ label: 'ملاحظات', name: 'notes', type: 'textarea', value: l.notes, full: true })}
        ${global.Vault ? global.Vault.section('line', l.id) : ''}
      </div>`,
      onOpen: m => {
        if (global.Vault) global.Vault.bindSection(m.el, 'line', l.id);
        const cs = $('[name=country]', m.el), car = $('[name=carrier]', m.el), num = $('[name=number]', m.el), cur = $('[name=currency]', m.el);
        cs.addEventListener('change', () => { car.innerHTML = UI.options(CARRIERS[cs.value], ''); cur.value = COUNTRY[cs.value][1]; num.placeholder = cs.value === 'EG' ? '010 1234 5678' : '05X XXX XXXX'; });
        num.addEventListener('change', () => { const g = guessCarrier(normPhone(num.value, cs.value)); if (g) car.value = g; });
      },
      onSave: m => {
        const d = UI.form(m.el); d.number = normPhone(d.number, d.country);
        if (global.ITX && d.lastPaid && U.num(d.renewDur)) d.renewDate = global.ITX.nextRenewal(d.lastPaid, d.renewDur, d.renewUnit); // المدة متحددة ← التاريخ بيتحسب
        if (!validPhone(d.number, d.country)) throw new Error(d.country === 'SA' ? 'الرقم السعودي لازم يكون 05XXXXXXXX (10 أرقام)' : 'الرقم المصري لازم يبدأ بـ 010 / 011 / 012 / 015 (11 رقم)');
        if (DB.lines.some(x => x.id !== l.id && x.number === d.number)) throw new Error('الرقم مسجل قبل كده');
        const x = Object.assign({}, l, d); if (!x.code && global.ITX) x.code = global.ITX.lineCode(x.country); C.upsert('lines', x, 'خط'); if (isNew) log(x.id, 'create', { note: 'خط ' + fmtPhone(x.number) });
        if (global.Vault) global.Vault.saveSection(m.el, 'line', x.id, 'باسوردات خط ' + fmtPhone(x.number));
        UI.toast('تم الحفظ'); global.Router.render();
      },
    });
  };
  function assignLine(l, holderId) {
    UI.modal({
      title: 'تسليم الخط ' + fmtPhone(l.number), saveLabel: 'تسليم',
      body: `<div class="grid2">${UI.field({ label: 'الموظف', name: 'holderId', type: 'select', options: staffOpts(), value: holderId || '', required: true })}${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: today() })}</div>`,
      onSave: m => { const d = UI.form(m.el); if (!d.holderId) throw new Error('اختر الموظف'); if (global.ITX) global.ITX.assertNotFrozen(d.holderId); Object.assign(l, { status: 'assigned', holderId: d.holderId, assignedAt: d.date }); C.upsert('lines', l, 'تسليم خط'); log(l.id, 'assign', { date: d.date, holderId: d.holderId }); global.Platform && global.Platform.notify({ to: ['it'], title: '📞 تم تسليم الخط ' + fmtPhone(l.number) + ' إلى ' + nm(d.holderId), icon: '📞', link: 'it.html#/lines' }); UI.toast('تم التسليم'); global.Router.render(); },
    });
  }
  function returnLine(l, note) { const h = l.holderId; Object.assign(l, { status: 'stock', holderId: '', assignedAt: '' }); C.upsert('lines', l, 'استلام خط'); log(l.id, 'return', { holderId: h, note: note || '' }); }
  Fin.assignLine = assignLine;

  // M04: باك أب الشرائح السعودية — "تم الباك أب النهارده" + سجل + تذكير دوري
  function bkpState(l) {
    if (!l.lastBackup) return { txt: 'مفيش باك أب متسجل', cls: 't-warn' };
    const every = U.num(l.backupEveryDays); const n = U.daysBetween(l.lastBackup, today());
    if (every && n >= every) return { txt: 'آخر باك أب ' + l.lastBackup + ' (فات ميعاده)', cls: 't-bad' };
    return { txt: 'آخر باك أب ' + l.lastBackup + (every ? ' · القادم ' + U.addDays(l.lastBackup, every) : ''), cls: 'muted' };
  }
  function backupDone(l) {
    UI.modal({ title: '✅ تم الباك أب — ' + fmtPhone(l.number), saveLabel: 'تسجيل', body: `<div class="grid2">
      ${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: today() })}
      ${UI.field({ label: 'إيميل الباك أب', name: 'email', value: l.backupEmail || '', attrs: 'dir="ltr"' })}
      ${UI.field({ label: 'ملاحظة', name: 'note', full: true })}</div>
      ${(DB.backupLog || []).filter(b => b.lineId === l.id).slice(-5).reverse().map(b => `<div class="muted small">• ${b.date} — ${U.esc(b.by || '')} ${b.note ? '· ' + U.esc(b.note) : ''}</div>`).join('') || '<div class="muted small">أول باك أب يتسجل للخط ده</div>'}`,
      onSave: m => { const d = UI.form(m.el); DB.backupLog = DB.backupLog || [];
        DB.backupLog.push({ id: U.uid(), lineId: l.id, code: l.code || '', date: d.date || today(), email: d.email, note: d.note, by: (global.Auth && global.Auth.current() || {}).name || '', at: new Date().toISOString() });
        l.lastBackup = d.date || today(); if (d.email) l.backupEmail = d.email; C.upsert('lines', l, 'باك أب شريحة'); log(l.id, 'backup', { date: l.lastBackup }); UI.toast('اتسجل الباك أب'); global.Router.render(); } });
  }
  Fin.lineBackupState = bkpState;

  P.lines = function (el, only) {
    only = only === 'SA' || only === 'EG' ? only : '';
    UI.listPage(el, {
      title: only === 'SA' ? '📱 الأرقام السعودية' : only === 'EG' ? '📱 الأرقام المصرية' : 'خطوط الشركة', subtitle: only === 'SA' ? 'خطوط الشركة في السعودية (STC، موبايلي، زين) كعُهد' : only === 'EG' ? 'خطوط فريق مصر (فودافون، أورنج، اتصالات، WE) كعُهد' : 'الأرقام السعودية والمصرية كعُهد: مع مين، الباقة، والتكلفة الشهرية', csvName: only ? 'lines-' + only : 'lines',
      actions: '<button class="btn primary" data-act="new">+ رقم ' + (only === 'SA' ? 'سعودي' : only === 'EG' ? 'مصري' : '') + '</button>',
      filters: (only ? [] : [{ key: 'country', options: [{ value: '', label: 'كل الدول' }].concat(Object.entries(COUNTRY).map(([k, v]) => ({ value: k, label: v[0] }))) }]).concat([{ key: 'status', options: [{ value: 'live', label: 'الخطوط الحالية' }, { value: '', label: 'كل الحالات' }].concat(opts(LSTATUS)) }]),
      initial: { status: 'live', country: only },
      rows: s => DB.lines.filter(x => (!s.country || x.country === s.country) && (s.status === 'live' ? x.status !== 'cancelled' : (!s.status || x.status === s.status))).sort((a, b) => a.country.localeCompare(b.country) || (a.code || '').localeCompare(b.code || '')),
      searchText: x => [x.number, fmtPhone(x.number), x.carrier, x.plan, nm(x.holderId), x.purpose, x.iccid].join(' '),
      summary: rows => { const live = rows.filter(x => x.status !== 'cancelled'); return `<div class="cards mk-cards">
        <div class="card"><span>🇸🇦 خطوط سعودية</span><b>${live.filter(x => x.country === 'SA').length}</b></div><div class="card"><span>🇪🇬 خطوط مصرية</span><b>${live.filter(x => x.country === 'EG').length}</b></div>
        <div class="card"><span>مُسلَّمة</span><b>${live.filter(x => x.status === 'assigned').length}</b></div><div class="card"><span>متاحة</span><b class="t-good">${live.filter(x => x.status === 'stock').length}</b></div>
        <div class="card"><span>التكلفة الشهرية</span><b>${U.money(U.sum(live.filter(x => x.status !== 'suspended'), x => sar(x.cost, x.currency)), false)}</b><small>${global.ITX ? global.ITX.curWord() : 'ريال'}</small></div></div>`; },
      empty: 'لا توجد خطوط',
      columns: [
        { label: 'الرقم', render: x => `<b dir="ltr">${fmtPhone(x.number)}</b>${x.whatsapp ? ' <span title="واتساب بيزنس">🟢</span>' : ''}<div class="muted small"><span dir="ltr">${U.esc(x.code || '')}</span> · ${COUNTRY[x.country][0]}</div>`, text: x => (x.code || '') + ' ' + x.number },
        { label: only === 'EG' ? 'الشحن القادم' : only === 'SA' ? 'التجديد القادم' : 'التجديد / الشحن', render: x => { if (!x.renewDate || x.status === 'cancelled') return '<span class="muted">—</span>'; const n = U.daysBetween(today(), x.renewDate); return `<span class="${n < 0 ? 't-bad' : n <= 3 ? 't-warn' : ''}">${n < 0 ? 'فات من ' + -n + ' يوم' : n === 0 ? 'النهارده' : n === 1 ? 'بكرة' : 'متبقي ' + n + ' يوم'}</span><div class="muted small">${x.renewDate}${x.lastPaid ? ' · آخر دفع ' + x.lastPaid : ''}</div>`; }, text: x => x.renewDate || '' },
        { label: 'الشركة / الباقة', render: x => `<b>${U.esc(x.carrier || '')}</b>${BAL[x.carrier] ? ` <span class="badge b-info" dir="ltr" title="كود الاستعلام / الشحن">${BAL[x.carrier]}</span>` : ''}<div class="muted small">${U.esc(LKIND[x.kind] || '')}${x.plan ? ' · ' + U.esc(x.plan) : ''}</div>`, text: x => x.carrier + ' ' + (x.plan || '') },
        { label: 'مع', render: x => (x.holderId ? `<a href="#/holder/${x.holderId}">${U.esc(nm(x.holderId))}</a>${x.purpose ? ' <small class="muted">(' + U.esc(x.purpose) + ')</small>' : ''}` : `<span class="muted">${U.esc(x.purpose || '—')}</span>`) + (x.phoneTag ? `<div class="small">📱 <a dir="ltr" href="#/asset/${(DB.assets.find(a => a.tag === x.phoneTag) || {}).id || ''}">${U.esc(x.phoneTag)}</a></div>` : ''), text: x => nm(x.holderId) + (x.phoneTag ? ' ' + x.phoneTag : '') },
        { label: 'شهرياً', cls: 'num', render: x => x.cost ? (global.ITX ? global.ITX.money(x.cost, x.currency) : U.money(x.cost, false) + ' <small>' + (x.currency || '') + '</small>') : '—', text: x => sar(x.cost, x.currency) },
        { label: 'الحالة', render: x => badge(LSTATUS, x.status) + (x.holderId && staff(x.holderId).active === false ? ' <span class="badge b-bad">الموظف ترك العمل!</span>' : '') + (x.network === 'لا تعمل' ? ' <span class="badge b-bad">الشبكة لا تعمل</span>' : ''), text: x => (LSTATUS[x.status] || [''])[0] },
        ...(only !== 'EG' ? [{ label: 'الحيازة / الباك أب', render: x => { if (x.country === 'EG') return '<span class="muted">—</span>'; const b = bkpState(x); return `<span class="badge ${x.possession === 'مع الوكيل في السعودية' ? 'b-info' : 'b-muted'}">${U.esc(x.possession || 'مع الشركة في مصر')}</span>${x.chargeBy ? '<div class="muted small">الشحن: ' + U.esc(x.chargeBy) + '</div>' : ''}<div class="small ${b.cls}">${b.txt}</div>`; }, text: x => (x.possession || '') + ' ' + (x.lastBackup || '') }] : []),
        { label: '', noExport: true, render: x => (global.Vault ? global.Vault.btn('line', x.id) : '') + (x.status !== 'cancelled' && global.ITX ? act('pay', x.id, '💳 دفع/تجديد') : '') + (x.country !== 'EG' && x.status !== 'cancelled' ? act('bkp', x.id, '✅ باك أب') : '') + (x.status === 'stock' ? act('assign', x.id, '📤 تسليم') : x.status === 'assigned' ? act('return', x.id, '📥 استلام') + (Fin.printReceipt ? act('receipt', x.id, '🖨 نموذج') : '') : '') + (x.status === 'suspended' ? act('resume', x.id, 'تفعيل') : x.status !== 'cancelled' ? act('suspend', x.id, 'إيقاف') : '') + act('edit', x.id, 'تعديل') },
      ],
      onAction: (k, id) => { const x = C.find('lines', id);
        if (k === 'new') Fin.editLine(only === 'EG' ? { country: 'EG', carrier: 'فودافون', kind: 'voice', status: 'stock', currency: 'EGP' } : null); if (k === 'edit') Fin.editLine(x); if (k === 'assign') assignLine(x);
        if (k === 'receipt' && Fin.printReceipt) Fin.printReceipt(x.holderId, [x.id]);
        if (k === 'pay') global.ITX.payRenewal('lines', x, { coll: 'lines', kind: 'line', title: fmtPhone(x.number) + (x.code ? ' · ' + x.code : ''), durField: 'renewDur', unitField: 'renewUnit' });
        if (k === 'bkp') backupDone(x);
        if (k === 'vault' && global.Vault) global.Vault.open('line', x.id, 'خط ' + fmtPhone(x.number) + (x.code ? ' · ' + x.code : ''));
        if (k === 'return' && confirm('استلام الخط من ' + nm(x.holderId) + '؟')) { returnLine(x); global.Router.render(); }
        if (k === 'suspend' && confirm('إيقاف الخط مؤقتاً؟ (لازم توقفه من شركة الاتصالات كمان)')) { x.status = 'suspended'; C.upsert('lines', x, 'إيقاف خط'); log(x.id, 'suspend', {}); global.Router.render(); }
        if (k === 'resume') { x.status = x.holderId ? 'assigned' : 'stock'; C.upsert('lines', x, 'تفعيل خط'); global.Router.render(); } },
    });
  };

  // ================= الإيميلات =================
  // دورة حياة الحساب عند الإخلاء: قفل ← أرشفة ← حذف (بعد مدة الاحتفاظ)
  const MSTATUS = { active: ['نشط', 'good'], free: ['🟢 خالي', 'good'], suspended: ['مقفول', 'warn'], archived: ['مؤرشف', 'muted'], deleted: ['محذوف', 'muted'] };
  const domain = () => DB.settings.emailDomain || 'seg.example';
  const cos = () => ((global.ITX && global.ITX.settings().companies) || []).map(c => c.name);
  Fin.editMailbox = function (b, pre) {
    const isNew = !b || !b.id;
    b = b || Object.assign({ kind: 'personal', status: 'active', provider: 'Google Workspace', members: [], createdAt: today() }, pre || {});
    UI.modal({
      title: isNew ? 'إيميل جديد' : 'تعديل ' + b.address,
      body: `<div class="grid2">
        ${UI.field({ label: 'النوع', name: 'kindCo', type: 'select', options: cos().map(c => ({ value: 'personal|' + c, label: 'تابع لـ ' + c })).concat([{ value: 'shared|', label: 'مشترك (info@، finance@...)' }, { value: 'service|', label: 'إيميل خدمة (أدمن / نظام)' }]), value: b.kind === 'personal' ? 'personal|' + (b.company || cos()[0] || '') : (b.kind || 'personal') + '|' })}
        ${UI.field({ label: 'الإيميل', name: 'address', value: b.address || '', required: true, placeholder: 'name@' + domain(), attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'الموظف المسلّم له الإيميل', name: 'holderId', type: 'select', options: staffOpts('— خالي (تبع قسم تكنولوجيا المعلومات) —'), value: b.free ? '' : b.holderId, hint: 'من غير موظف = الإيميل خالي ويتسجل تلقائي على قسم تكنولوجيا المعلومات' })}
        ${UI.field({ label: 'المزود', name: 'provider', type: 'select', options: ['Gmail', 'Google Workspace', 'Microsoft 365', 'Zoho Mail', 'استضافة الموقع'], value: b.provider })}
        ${UI.field({ label: 'أسماء بديلة (Aliases)', name: 'aliases', value: b.aliases, placeholder: 'sales@, hello@', attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'تحويل الرسائل إلى', name: 'forwardTo', value: b.forwardTo, placeholder: 'يُستخدم بعد ترك العمل', attrs: 'dir="ltr"' })}
        ${UI.field({ label: 'الحالة', name: 'status', type: 'select', options: opts(MSTATUS), value: b.status })}
        ${UI.field({ label: 'تاريخ الإنشاء', name: 'createdAt', type: 'date', value: b.createdAt })}
        ${UI.field({ label: 'MFA مفعّل', name: 'mfa', type: 'checkbox', value: b.mfa })}
        ${UI.field({ label: 'حساب مهم (إدارة / مالية / أدمن)', name: 'critical', type: 'checkbox', value: b.critical })}
        <div class="field full"><span>أعضاء الإيميل المشترك</span><div class="chk-grid">${(DB.team || []).filter(m => m.active !== false).map(m => `<label class="chk"><input type="checkbox" data-mem="${m.id}" ${(b.members || []).includes(m.id) ? 'checked' : ''}> ${U.esc(m.name)}</label>`).join('')}</div></div>
        ${global.Vault ? global.Vault.section('mail', b.id) : ''}
      </div><p class="muted small">إنشاء الإيميل نفسه بيتم من لوحة ${U.esc(b.provider)}، والنظام بيسجّله ويتابعه. الباسورد بيتحفظ متشفّر في خزنة الباسوردات.</p>`,
      onOpen: m => { if (global.Vault) global.Vault.bindSection(m.el, 'mail', b.id); },
      onSave: m => {
        const d = UI.form(m.el); d.address = d.address.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.address)) throw new Error('الإيميل غير صحيح');
        if (DB.mailboxes.some(x => x.id !== b.id && x.address === d.address)) throw new Error('الإيميل مسجل قبل كده');
        const kc = String(d.kindCo || 'personal|').split('|'); d.kind = kc[0]; if (kc[1]) d.company = kc[1]; delete d.kindCo;
        // من غير موظف (أو الحالة خالي) = خالي وتبع قسم تكنولوجيا المعلومات · واختيار موظف لإيميل خالي ← يبقى نشط معاه
        if (d.kind === 'personal') { if (d.holderId) { d.free = false; d.dept = ''; if (d.status === 'free') d.status = 'active'; } else if (['free', 'active'].includes(d.status)) { d.status = 'free'; d.free = true; d.dept = 'IT'; } }
        d.members = d.kind === 'shared' ? $$('[data-mem]', m.el).filter(i => i.checked).map(i => i.dataset.mem) : [];
        if (d.kind === 'shared') d.holderId = '';
        const x = Object.assign({}, b, d); if (!x.code && global.ITX) x.code = global.ITX.mailCode(); C.upsert('mailboxes', x, 'إيميل');
        if (global.Vault) global.Vault.saveSection(m.el, 'mail', x.id, 'باسورد ' + x.address);
        if (x.kind === 'personal' && x.holderId) { const s = staff(x.holderId); if (s.id && !s.email) { s.email = x.address; C.upsert('team', s, 'موظف'); } }
        UI.toast('تم الحفظ'); global.Router.render();
        if (pre && pre.__after) pre.__after(x);
      },
    });
  };
  // ملخص الإيميلات كرسوم: توزيع الحالة (دائرة) · الإيميلات لكل قسم (أعمدة) · الخالي غير المؤرشف (رقم كبير + الأسماء)
  const isFree = x => x.kind === 'personal' && (x.status === 'free' || (x.status === 'active' && (x.free || !x.holderId)));
  function mailCharts(rows) {
    const esc = U.esc, live = rows.filter(x => !['archived', 'deleted'].includes(x.status));
    const parts = [
      ['مستخدم مع موظف', 'var(--mb-used)', rows.filter(x => ['active', 'free'].includes(x.status) && x.kind === 'personal' && !isFree(x)).length],
      ['🟢 خالي', 'var(--mb-free)', rows.filter(isFree).length],
      ['خدمة / مشترك', 'var(--mb-svc)', rows.filter(x => x.status === 'active' && x.kind !== 'personal').length],
      ['موقوف', 'var(--mb-off)', rows.filter(x => x.status === 'suspended').length],
      ['مؤرشف / محذوف', 'var(--mb-arch)', rows.filter(x => ['archived', 'deleted'].includes(x.status)).length]];
    const total = rows.length, free = rows.filter(isFree);
    const byDept = {}; live.forEach(x => { const d = x.kind === 'personal' && x.holderId && !isFree(x) ? (staff(x.holderId).dept || 'بدون قسم') : x.kind === 'personal' ? (x.dept || 'IT') : 'خدمة / مشترك'; byDept[d] = (byDept[d] || 0) + 1; });
    const depts = Object.entries(byDept).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...depts.map(d => d[1]));
    const left = rows.filter(x => x.status === 'active' && x.holderId && staff(x.holderId).active === false).length;
    const donut = Fin.donut ? Fin.donut(parts.map(p => ({ v: p[2], c: p[1] })), String(total), 'إيميل') : '';
    return `<div class="mb-viz">
      <div class="panel mb-card"><h3>توزيع الإيميلات</h3><div class="mb-donut">${donut}<ul class="mb-legend">${parts.map(p => `<li title="${esc(p[0])}: ${p[2]} من ${total}"><i style="background:${p[1]}"></i><span>${esc(p[0])}</span><b>${p[2]}</b></li>`).join('')}</ul></div></div>
      <div class="panel mb-card"><h3>الإيميلات النشطة لكل قسم</h3>${depts.map(([d, n]) => `<div class="mb-bar" title="${esc(d)}: ${n} إيميل"><span>${esc(d)}</span><span class="mb-track"><i style="width:${Math.round(n / max * 100)}%"></i></span><b>${n}</b></div>`).join('') || '<p class="muted">—</p>'}</div>
      <div class="panel mb-card mb-hero"><h3>🟢 الخالي (مش مؤرشف)</h3><div class="mb-big">${free.length}</div><small class="muted">جاهز يتسلّم لموظف — من الصف الأخضر في شيت الإيميلات أو إيميل من غير صاحب</small>
        <ul class="mb-free">${free.map(x => `<li dir="ltr">${esc(x.address)}</li>`).join('') || '<li class="muted">مفيش إيميل خالي دلوقتي</li>'}</ul>
        ${left ? `<p class="t-bad small">⚠️ ${left} إيميل نشط لموظف ساب الشغل</p>` : ''}</div></div>`;
  }
  P.mail = function (el) {
    UI.listPage(el, {
      title: 'إيميلات الشركة', subtitle: 'إيميلات تابعة للشركة (مسلّمة لموظفين) ومشتركة: لمين، حالتها، والتحويل بعد ترك العمل', csvName: 'mailboxes',
      actions: '<button class="btn primary" data-act="new">+ إيميل</button>',
      filters: [{ key: 'kind', options: [{ value: '', label: 'كل الأنواع' }, { value: 'personal', label: 'تابع للشركة' }, { value: 'shared', label: 'مشترك' }, { value: 'service', label: 'خدمة' }, { value: 'free', label: '🟢 الخالي بس' }] }, { key: 'status', options: [{ value: '', label: 'كل الحالات' }].concat(opts(MSTATUS)) }],
      rows: s => DB.mailboxes.filter(x => (!s.kind || (s.kind === 'free' ? isFree(x) : x.kind === s.kind)) && (!s.status || x.status === s.status)).sort((a, b) => a.kind.localeCompare(b.kind) || a.address.localeCompare(b.address)),
      searchText: x => [x.code, x.address, x.aliases, nm(x.holderId), x.forwardTo].join(' '),
      summary: rows => mailCharts(rows),
      _oldSummary: rows => `<div class="cards mk-cards"><div class="card"><span>نشط</span><b>${rows.filter(x => x.status === 'active').length}</b></div><div class="card"><span>تابع للشركة</span><b>${rows.filter(x => x.kind === 'personal' && x.status === 'active').length}</b></div><div class="card"><span>مشترك</span><b>${rows.filter(x => x.kind === 'shared' && x.status === 'active').length}</b></div><div class="card"><span>🟢 خالي</span><b class="t-good">${rows.filter(x => x.kind !== 'shared' && x.status === 'active' && (x.free || !x.holderId)).length}</b></div><div class="card"><span>موقوف</span><b>${rows.filter(x => x.status === 'suspended').length}</b></div><div class="card"><span>لموظف ترك العمل وما زال نشطاً</span><b class="${rows.some(x => x.status === 'active' && x.holderId && staff(x.holderId).active === false) ? 't-bad' : ''}">${rows.filter(x => x.status === 'active' && x.holderId && staff(x.holderId).active === false).length}</b></div></div>`,
      empty: 'لا توجد إيميلات',
      columns: [
        { label: 'الكود', render: x => `<span dir="ltr" class="mono">${U.esc(x.code || '—')}</span>`, text: x => x.code || '' },
        { label: 'الإيميل', render: x => `<b dir="ltr">${U.esc(x.address)}</b>${x.aliases ? `<div class="muted small" dir="ltr">${U.esc(x.aliases)}</div>` : ''}`, text: x => x.address },
        ...(global.Vault && global.Vault.allowed() ? [{ label: 'الباسورد', noExport: true, render: x => global.Vault.btn('mail', x.id) }] : []),
        { label: 'النوع', render: x => x.kind === 'shared' ? '👥 مشترك' : x.kind === 'service' ? '⚙️ خدمة' : '🏢 تابع لـ ' + U.esc(x.company || cos()[0] || 'الشركة'), text: x => x.kind === 'personal' ? 'تابع لـ ' + (x.company || cos()[0] || '') : x.kind },
        { label: 'لمين', render: x => x.kind === 'shared' ? ((x.members || []).map(nm).filter(Boolean).join('، ') || '—') : x.kind === 'service' ? '<span class="muted">⚙️ إيميل خدمة</span>' : x.free || !x.holderId ? '<span class="badge b-good">🟢 خالي</span>' : `<a href="#/holder/${x.holderId}">${U.esc(nm(x.holderId))}</a>`, text: x => x.kind === 'shared' ? (x.members || []).map(nm).join('، ') : x.free || !x.holderId ? 'خالي' : nm(x.holderId) },
        { label: 'المزود', render: x => U.esc(x.provider || '') },
        { label: 'تحويل إلى', render: x => x.forwardTo ? `<span dir="ltr">${U.esc(x.forwardTo)}</span>` : '—', text: x => x.forwardTo || '' },
        { label: 'الحالة', render: x => badge(MSTATUS, x.status) + (x.status === 'active' && x.holderId && staff(x.holderId).active === false ? ' <span class="badge b-bad">الموظف ترك العمل!</span>' : ''), text: x => (MSTATUS[x.status] || [''])[0] },
        { label: '', noExport: true, render: x => (['active', 'free'].includes(x.status) ? act('suspend', x.id, 'قفل') : x.status === 'suspended' ? act('resume', x.id, 'تفعيل') + act('archive', x.id, 'أرشفة') : x.status === 'archived' ? act('del', x.id, 'حذف') : '') + act('edit', x.id, 'تعديل') },
      ],
      onAction: (k, id) => { const x = C.find('mailboxes', id);
        if (k === 'new') Fin.editMailbox(); if (k === 'edit') Fin.editMailbox(x);
        if (k === 'vault' && global.Vault) global.Vault.open('mail', x.id, x.address);
        if (k === 'suspend') { const fw = prompt('تحويل رسائل ' + x.address + ' إلى (اختياري):', x.forwardTo || ''); x.status = 'suspended'; if (fw) x.forwardTo = fw; C.upsert('mailboxes', x, 'إيقاف إيميل'); global.Router.render(); }
        if (k === 'resume') { x.status = 'active'; C.upsert('mailboxes', x, 'تفعيل إيميل'); global.Router.render(); }
        if (k === 'archive') { x.status = 'archived'; x.archivedAt = today(); C.upsert('mailboxes', x, 'أرشفة إيميل'); global.ITX && global.ITX.event('اتأرشف الإيميل ' + x.address, { ref: x.address, empId: x.holderId }); global.Router.render(); }
        if (k === 'del' && confirm('حذف ' + x.address + ' نهائيًا من المزود؟ (بعد انتهاء مدة الاحتفاظ)')) { x.status = 'deleted'; x.deletedAt = today(); C.upsert('mailboxes', x, 'حذف إيميل'); global.ITX && global.ITX.event('اتحذف الإيميل ' + x.address, { ref: x.address, empId: x.holderId }); global.Router.render(); } },
    });
  };

  // ================= التعيين والإخلاء =================
  const MOVE = { onboard: ['تعيين موظف جديد', 'info', '🟢'], offboard: ['إخلاء طرف', 'warn', '🚪'] };
  const MVST = { open: ['جارٍ', 'warn'], done: ['مكتمل', 'good'] };
  // قائمة مهام التعيين
  function onboardItems() {
    return [
      { key: 'email', label: 'إنشاء إيميل الشركة' }, { key: 'device', label: 'تسليم لابتوب / جهاز' }, { key: 'line', label: 'تسليم خط موبايل' },
      { key: 'subs', label: 'إضافته للاشتراكات (Google Workspace، Adobe...)' }, { key: 'account', label: 'إنشاء حساب على النظام بالصلاحية المناسبة' }, { key: 'form', label: 'توقيع إقرار استلام العهدة' },
    ].map(x => Object.assign(x, { done: false }));
  }
  // قائمة الإخلاء تُبنى من كل ما مع الموظف
  function offboardItems(id) {
    const items = [];
    DB.assets.filter(a => a.holderId === id && a.status === 'assigned').forEach(a => items.push({ key: 'asset', ref: a.id, label: 'استلام ' + a.tag + ' — ' + [a.brand, a.model].filter(Boolean).join(' '), done: false }));
    DB.lines.filter(l => l.holderId === id && l.status === 'assigned').forEach(l => items.push({ key: 'line', ref: l.id, label: 'استلام الخط ' + fmtPhone(l.number) + ' (' + l.carrier + ')', done: false }));
    DB.mailboxes.filter(b => b.holderId === id && b.status === 'active').forEach(b => items.push({ key: 'mail', ref: b.id, label: 'إيقاف الإيميل ' + b.address + ' وتحويله', done: false }));
    DB.mailboxes.filter(b => (b.members || []).includes(id) && b.status === 'active').forEach(b => items.push({ key: 'shared', ref: b.id, label: 'إزالته من الإيميل المشترك ' + b.address, done: false }));
    DB.subscriptions.filter(s => (s.users || []).includes(id) && s.status !== 'cancelled').forEach(s => items.push({ key: 'sub', ref: s.id, label: 'إزالته من ' + s.name + ' وتغيير كلمة السر', done: false }));
    const u = (DB.users || []).find(x => x.email && staff(id).email && x.email.toLowerCase() === staff(id).email.toLowerCase());
    if (u) items.push({ key: 'user', ref: u.id, label: 'إيقاف حسابه على النظام (' + u.email + ')', done: false });
    items.push({ key: 'finance', label: 'إبلاغ المالية بالتسوية النهائية (مستحقات / خصومات العهد)', done: false });
    return items;
  }
  // تنفيذ بند من بنود الإخلاء
  function doOffItem(mv, it, opt) {
    opt = opt || {};
    if (it.key === 'asset') { const a = C.find('assets', it.ref); if (a && a.holderId === mv.staffId) { const h = a.holderId; Object.assign(a, { status: opt.condition === 'تالف' ? 'repair' : 'stock', holderId: '', assignedAt: '', condition: opt.condition || a.condition }); C.upsert('assets', a, 'استلام عهدة'); log(a.id, 'return', { holderId: h, condition: opt.condition, note: 'إخلاء طرف' }); } }
    if (it.key === 'line') { const l = C.find('lines', it.ref); if (l && l.holderId === mv.staffId) returnLine(l, 'إخلاء طرف'); }
    if (it.key === 'mail') { const b = C.find('mailboxes', it.ref); if (b) { b.status = 'suspended'; if (opt.forwardTo) b.forwardTo = opt.forwardTo; C.upsert('mailboxes', b, 'إيقاف إيميل'); } }
    if (it.key === 'shared') { const b = C.find('mailboxes', it.ref); if (b) { b.members = (b.members || []).filter(x => x !== mv.staffId); C.upsert('mailboxes', b, 'إيميل'); } }
    if (it.key === 'sub') { const s = C.find('subscriptions', it.ref); if (s) { s.users = (s.users || []).filter(x => x !== mv.staffId); C.upsert('subscriptions', s, 'اشتراك'); } }
    if (it.key === 'user') { const u = (DB.users || []).find(x => x.id === it.ref); if (u) { u.disabled = true; u.passHash = 'disabled-' + U.uid(); global.Store.save(); } }
    if (it.key === 'finance' && global.Platform) global.Platform.notify({ to: ['accountant', 'admin'], title: '🚪 إخلاء طرف ' + nm(mv.staffId) + ': برجاء التسوية النهائية', icon: '🚪', link: 'index.html#/expenses' });
    it.done = true; it.doneAt = today();
  }
  function finishMove(mv) {
    if (mv.items.every(i => i.done) && mv.status !== 'done') {
      mv.status = 'done'; mv.doneAt = today();
      if (mv.type === 'offboard') { const s = staff(mv.staffId); if (s.id) { s.active = false; s.leftAt = mv.date || today(); C.upsert('team', s, 'إخلاء طرف'); } }
    }
    C.upsert('moves', mv, MOVE[mv.type][0]);
  }
  // بدء إخلاء طرف (من صفحة الموظف أو من صفحة التعيين والإخلاء)
  Fin.startOffboard = function (staffId) {
    const s = staff(staffId), existing = DB.moves.find(m => m.type === 'offboard' && m.staffId === staffId && m.status === 'open');
    if (existing) { global.Router.go('#/move/' + existing.id); return; }
    const items = offboardItems(staffId), mgr = (DB.mailboxes.find(b => b.holderId === (DB.team.find(m => m.dept === 'الإدارة') || {}).id) || {}).address || '';
    UI.modal({
      title: 'إخلاء طرف — ' + s.name, saveLabel: 'بدء الإخلاء',
      body: `<p>هيتم عمل قائمة بكل اللي مع الموظف (${items.length - 1} بند):</p><ul class="mv-pre">${items.map(i => `<li>${U.esc(i.label)}</li>`).join('')}</ul>
        <div class="grid2">${UI.field({ label: 'آخر يوم عمل', name: 'date', type: 'date', value: today() })}${UI.field({ label: 'حالة الأجهزة عند الاستلام', name: 'condition', type: 'select', options: ['جديد', 'ممتاز', 'جيد', 'مقبول', 'به عيوب', 'تالف'], value: 'جيد' })}
        ${UI.field({ label: 'تحويل إيميله إلى', name: 'forwardTo', value: mgr, attrs: 'dir="ltr"' })}${UI.field({ label: 'ملاحظات', name: 'note' })}
        ${UI.field({ label: 'نفّذ كل الخطوات الآن (أو اتركها لتنفيذها خطوة بخطوة)', name: 'all', type: 'checkbox', value: true, full: true })}</div>`,
      onSave: m => {
        const d = UI.form(m.el);
        const mv = { id: U.uid(), type: 'offboard', staffId, date: d.date, status: 'open', items, note: d.note, opts: { condition: d.condition, forwardTo: d.forwardTo }, by: ((global.Auth && global.Auth.current()) || {}).name || '' };
        if (d.all) mv.items.forEach(it => doOffItem(mv, it, mv.opts));
        finishMove(mv);
        UI.toast(d.all ? 'تم إخلاء طرف ' + s.name + ' ✅' : 'تم إنشاء قائمة الإخلاء'); global.Router.go('#/move/' + mv.id);
      },
    });
  };
  Fin.startOnboard = function () {
    UI.modal({
      title: 'تعيين موظف جديد', saveLabel: 'إنشاء قائمة التعيين',
      body: `<div class="grid2">
        ${UI.field({ label: 'موظف موجود في القائمة', name: 'staffId', type: 'select', options: [{ value: '', label: '— موظف جديد (اكتب بياناته) —' }].concat((DB.team || []).filter(m => m.active !== false).map(m => ({ value: m.id, label: m.name }))) })}
        ${UI.field({ label: 'تاريخ البدء', name: 'date', type: 'date', value: U.addDays(today(), 3) })}
        ${UI.field({ label: 'الاسم', name: 'name' })}${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: ['الإدارة', 'المالية', 'التسويق', 'المبيعات', 'التشغيل', 'الموارد البشرية', 'تقنية المعلومات'], value: 'التسويق' })}
        ${UI.field({ label: 'الوظيفة', name: 'role' })}${UI.field({ label: 'المكان', name: 'location', type: 'select', options: ['القاهرة', 'الرياض', 'عن بُعد'] })}
      </div><p class="muted small">بعد الإنشاء هتلاقي قائمة مهام، وكل بند فيه زرار ينفّذه على طول.</p>`,
      onSave: m => {
        const d = UI.form(m.el); let sid = d.staffId;
        if (!sid) { if (!d.name) throw new Error('اختر موظف أو اكتب اسم الموظف الجديد'); const s = { id: U.uid(), name: d.name, dept: d.dept, role: d.role, location: d.location, active: true, startDate: d.date }; C.upsert('team', s, 'موظف'); sid = s.id; }
        const mv = { id: U.uid(), type: 'onboard', staffId: sid, date: d.date, status: 'open', items: onboardItems(), by: ((global.Auth && global.Auth.current()) || {}).name || '' };
        C.upsert('moves', mv, 'تعيين موظف'); global.Platform && global.Platform.notify({ to: ['it', 'admin'], title: '🟢 موظف جديد يبدأ ' + d.date + ': ' + nm(sid), icon: '🟢', link: 'it.html#/move/' + mv.id });
        UI.toast('تم إنشاء قائمة التعيين'); global.Router.go('#/move/' + mv.id);
      },
    });
  };

  P.linesSA = el => P.lines(el, 'SA');
  P.linesEG = el => P.lines(el, 'EG');
  P.onboard = el => P.moves(el, 'onboard');
  P.offboard = el => P.moves(el, 'offboard');
  P.moves = function (el, only) {
    const M = (DB.moves || []).filter(m => !only || m.type === only).slice().sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || (b.date || '').localeCompare(a.date || ''));
    el.innerHTML = `<div class="page-head"><div><h1>${only === 'onboard' ? '🟢 التعيينات' : only === 'offboard' ? '🚪 الإخلاءات' : 'التعيين والإخلاء'}</h1><p class="sub">${only === 'onboard' ? 'سجّل الموظف الجديد وتابع قائمة تجهيزه: إيميل، جهاز، خط، اشتراكات، إقرار عهدة' : only === 'offboard' ? 'سجّل إخلاء طرف الموظف: استلام كل العهد والخطوط وإيقاف الإيميل والحسابات + شهادة إخلاء طرف' : 'قائمة مهام لكل موظف جديد (إيميل، جهاز، خط، اشتراكات)، وإخلاء طرف بكل ما مع الموظف عند ترك العمل'}</p></div>
      <div class="actions">${only !== 'onboard' ? `<button class="btn ${only === 'offboard' ? 'primary' : ''}" data-act="off">🚪 تسجيل إخلاء طرف</button>` : ''}${only !== 'offboard' ? '<button class="btn primary" data-act="on">🟢 تسجيل تعيين جديد</button>' : ''}</div></div>
      <div class="cards"><div class="card"><span>تعيين جارٍ</span><b>${M.filter(m => m.type === 'onboard' && m.status === 'open').length}</b></div><div class="card"><span>إخلاء جارٍ</span><b class="${M.some(m => m.type === 'offboard' && m.status === 'open') ? 't-warn' : ''}">${M.filter(m => m.type === 'offboard' && m.status === 'open').length}</b></div><div class="card"><span>مكتمل</span><b class="t-good">${M.filter(m => m.status === 'done').length}</b></div></div>
      <div class="panel">${UI.table({ rows: M, empty: 'لا توجد عمليات', columns: [
        { label: 'العملية', render: m => `<a href="#/move/${m.id}">${MOVE[m.type][2]} <b>${MOVE[m.type][0]}</b></a>` },
        { label: 'الموظف', render: m => `<a href="#/holder/${m.staffId}">${U.esc(nm(m.staffId))}</a><div class="muted small">${U.esc(staff(m.staffId).dept || '')}</div>` },
        { label: 'التاريخ', render: m => m.date || '' },
        { label: 'التقدّم', render: m => { const d = m.items.filter(i => i.done).length; return `<span class="meter"><i style="width:${m.items.length ? d / m.items.length * 100 : 0}%"></i></span> ${d}/${m.items.length}`; } },
        { label: 'الحالة', render: m => badge(MVST, m.status) },
      ] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'on') Fin.startOnboard();
      if (b.dataset.act === 'off') UI.modal({ title: 'إخلاء طرف — اختر الموظف', saveLabel: 'التالي', body: UI.field({ label: 'الموظف', name: 'sid', type: 'select', options: (DB.team || []).filter(m => m.active !== false || DB.assets.some(a => a.holderId === m.id && a.status === 'assigned')).map(m => ({ value: m.id, label: m.name + (m.active === false ? ' (ترك العمل)' : '') })) }), onSave: x => { const sid = UI.form(x.el).sid; setTimeout(() => Fin.startOffboard(sid)); } }); };
  };

  P.move = function (el, id) {
    const mv = C.find('moves', id); if (!mv) { el.innerHTML = '<div class="empty">العملية غير موجودة</div>'; return; }
    const s = staff(mv.staffId), done = mv.items.filter(i => i.done).length;
    const itemBtn = (it, i) => {
      if (it.done) return `<span class="badge b-good">✓ ${it.doneAt || ''}</span>`;
      if (mv.type === 'offboard') return `<button class="btn sm" data-do="${i}">تنفيذ</button>`;
      return { email: `<button class="btn sm" data-ob="email">+ إنشاء الإيميل</button>`, device: `<button class="btn sm" data-ob="device">📤 اختر جهاز</button>`, line: `<button class="btn sm" data-ob="line">📤 اختر خط</button>`, subs: `<button class="btn sm" data-ob="subs">اختر الاشتراكات</button>`, form: `<button class="btn sm" data-ob="form">🖨 طباعة الإقرار</button>` }[it.key] || '' ;
    };
    el.innerHTML = `<div class="page-head"><div><a href="#/moves" class="back">→ التعيين والإخلاء</a><h1>${MOVE[mv.type][2]} ${MOVE[mv.type][0]} — ${U.esc(s.name || '')} ${badge(MVST, mv.status)}</h1>
        <p class="sub">${U.esc([s.role, s.dept, s.location].filter(Boolean).join(' · '))} · ${mv.type === 'onboard' ? 'يبدأ' : 'آخر يوم'} ${mv.date || ''}${mv.by ? ' · بواسطة ' + U.esc(mv.by) : ''}</p></div>
      <div class="actions">${mv.status === 'open' && mv.type === 'offboard' ? '<button class="btn primary" data-all>تنفيذ كل الباقي</button>' : ''}${mv.type === 'offboard' ? `<button class="btn" data-cert ${mv.status !== 'done' ? 'disabled title="تكتمل كل البنود الأول"' : ''}>🖨 شهادة إخلاء طرف</button>` : ''}<a class="btn ghost" href="#/holder/${mv.staffId}">صفحة الموظف</a></div></div>
      <div class="panel"><div class="mv-prog"><span class="meter"><i style="width:${mv.items.length ? done / mv.items.length * 100 : 0}%"></i></span><b>${done} من ${mv.items.length}</b></div>
        <ol class="mv-list">${mv.items.map((it, i) => `<li class="${it.done ? 'done' : ''}"><label class="chk"><input type="checkbox" data-tick="${i}" ${it.done ? 'checked disabled' : ''}> ${U.esc(it.label)}</label>${itemBtn(it, i)}</li>`).join('')}</ol>
        ${mv.note ? `<p class="small">${U.esc(mv.note)}</p>` : ''}</div>`;
    const save = () => { finishMove(mv); global.Router.render(); };
    const mark = key => { const it = mv.items.find(x => x.key === key && !x.done); if (it) { it.done = true; it.doneAt = today(); } save(); };
    el.onclick = e => {
      const dz = e.target.closest('[data-do]'); if (dz) { doOffItem(mv, mv.items[+dz.dataset.do], mv.opts || {}); save(); return; }
      if (e.target.closest('[data-all]')) { if (confirm('تنفيذ كل البنود الباقية؟')) { mv.items.filter(i => !i.done).forEach(it => doOffItem(mv, it, mv.opts || {})); save(); } return; }
      if (e.target.closest('[data-cert]') && mv.status === 'done') { printClearance(mv); return; }
      const ob = e.target.closest('[data-ob]'); if (!ob) return; const k = ob.dataset.ob;
      if (k === 'email') Fin.editMailbox(null, { kind: 'personal', holderId: mv.staffId, __after: () => setTimeout(() => mark('email'), 50) });
      if (k === 'device') { const stock = DB.assets.filter(a => a.status === 'stock'); if (!stock.length) return UI.toast('لا توجد أجهزة في المخزن', 'warn');
        UI.modal({ title: 'تسليم جهاز إلى ' + s.name, saveLabel: 'تسليم', body: UI.field({ label: 'الجهاز', name: 'aid', type: 'select', options: stock.map(a => ({ value: a.id, label: a.tag + ' — ' + [a.brand, a.model].filter(Boolean).join(' ') })) }),
          onSave: x => { const a = C.find('assets', UI.form(x.el).aid); Object.assign(a, { status: 'assigned', holderId: mv.staffId, assignedAt: today() }); C.upsert('assets', a, 'تسليم عهدة'); log(a.id, 'assign', { holderId: mv.staffId, condition: a.condition }); mark('device'); } }); }
      if (k === 'line') { const stock = DB.lines.filter(l => l.status === 'stock'); if (!stock.length) return UI.toast('لا توجد خطوط متاحة', 'warn');
        UI.modal({ title: 'تسليم خط إلى ' + s.name, saveLabel: 'تسليم', body: UI.field({ label: 'الخط', name: 'lid', type: 'select', options: stock.map(l => ({ value: l.id, label: fmtPhone(l.number) + ' — ' + l.carrier })) }),
          onSave: x => { const l = C.find('lines', UI.form(x.el).lid); Object.assign(l, { status: 'assigned', holderId: mv.staffId, assignedAt: today() }); C.upsert('lines', l, 'تسليم خط'); log(l.id, 'assign', { holderId: mv.staffId }); mark('line'); } }); }
      if (k === 'subs') UI.modal({ title: 'إضافة ' + s.name + ' للاشتراكات', saveLabel: 'إضافة', body: `<div class="chk-grid">${DB.subscriptions.filter(x => x.status !== 'cancelled').map(x => `<label class="chk"><input type="checkbox" data-sub="${x.id}"> ${U.esc(x.name)} <small class="muted">(${(x.users || []).length}/${x.seats || '∞'})</small></label>`).join('')}</div>`,
        onSave: x => { const ids = $$('[data-sub]', x.el).filter(i => i.checked).map(i => i.dataset.sub); ids.forEach(sid => { const sb = C.find('subscriptions', sid); if (sb.seats && (sb.users || []).length >= sb.seats) throw new Error(sb.name + ': كل المقاعد مستخدمة'); }); ids.forEach(sid => { const sb = C.find('subscriptions', sid); sb.users = (sb.users || []).concat([mv.staffId]); C.upsert('subscriptions', sb, 'اشتراك'); }); mark('subs'); } });
      if (k === 'form') { Fin.printCustody(mv.staffId); mark('form'); }
    };
    el.onchange = e => { const t = e.target.closest('[data-tick]'); if (!t || !t.checked) return; const it = mv.items[+t.dataset.tick]; if (mv.type === 'offboard') doOffItem(mv, it, mv.opts || {}); else { it.done = true; it.doneAt = today(); } save(); };
  };
  function printClearance(mv) {
    const s = staff(mv.staffId);
    UI.print(UI.printHeader('شهادة إخلاء طرف', s.name || '', mv.doneAt || today(), 'Clearance Certificate') + `
      <div class="p-notes">تشهد شركة <b>${U.esc(DB.settings.companyName || 'SEG')}</b> بأن الموظف/ة <b>${U.esc(s.name || '')}</b>${s.role ? ' (' + U.esc(s.role) + (s.dept ? ' — ' + U.esc(s.dept) : '') + ')' : ''} قد سلّم جميع العهد والأجهزة والخطوط، وتم إيقاف حساباته على أنظمة الشركة، وذلك بتاريخ ${mv.doneAt || today()}، ولا توجد لديه أي عهد تخص قسم تقنية المعلومات.</div>
      <table class="tbl p-lines"><thead><tr><th>#</th><th>البند</th><th>تاريخ التنفيذ</th></tr></thead><tbody>${mv.items.map((it, i) => `<tr><td>${i + 1}</td><td>${U.esc(it.label)}</td><td>${it.doneAt || ''}</td></tr>`).join('')}</tbody></table>
      <div class="p-sign"><div>مسؤول تقنية المعلومات</div><div>الموارد البشرية</div><div>المدير المباشر</div></div>`);
  }
  Fin.offboardItems = offboardItems; Fin.fmtPhone = fmtPhone;

  if (global.I18N) Object.assign(global.I18N.dict, {
    "خطوط الشركة": "Company Lines", "الخطوط": "Lines", "الإيميلات": "Emails", "إيميلات الشركة": "Company Emails", "التعيين والإخلاء": "Onboarding & Clearance", "الموظفين": "Staff",
    "تسجيل خط جديد": "Register new line", "+ خط": "+ Line", "الدولة": "Country", "رقم الخط": "Line number", "شركة الاتصالات": "Carrier", "نوع الخط": "Line type", "الباقة": "Plan", "رقم الشريحة (ICCID)": "SIM no. (ICCID)", "التكلفة الشهرية": "Monthly cost", "الاستخدام": "Purpose", "مسجل باسم": "Registered to", "عليه واتساب بيزنس": "Has WhatsApp Business",
    "خط موبايل (مكالمات + إنترنت)": "Mobile line (voice + data)", "إنترنت فقط (راوتر / موبايل واي فاي)": "Data only (router / MiFi)", "أرضي": "Landline", "موقوف مؤقتاً": "Suspended", "ملغي": "Cancelled", "الخطوط الحالية": "Current lines", "كل الدول": "All countries",
    "🇸🇦 خطوط سعودية": "🇸🇦 Saudi lines", "🇪🇬 خطوط مصرية": "🇪🇬 Egyptian lines", "مُسلَّمة": "Assigned", "متاحة": "Available", "الرقم": "Number", "الشركة / الباقة": "Carrier / plan", "شهرياً": "Monthly", "الموظف ترك العمل!": "Employee left!", "إيقاف": "Suspend", "تفعيل": "Activate",
    "الأرقام السعودية والمصرية كعُهد: مع مين، الباقة، والتكلفة الشهرية": "Saudi and Egyptian numbers as assets: holder, plan and monthly cost", "تسليم الخط": "Hand over line", "استلام الخط": "Receive line",
    "إيميل جديد": "New email", "+ إيميل": "+ Email", "شخصي لموظف": "Personal", "مشترك (info@، finance@...)": "Shared (info@, finance@...)", "الإيميل": "Email", "الموظف (للإيميل الشخصي)": "Employee (personal email)", "المزود": "Provider", "أسماء بديلة (Aliases)": "Aliases", "تحويل الرسائل إلى": "Forward to",
    "تاريخ الإنشاء": "Created", "أعضاء الإيميل المشترك": "Shared mailbox members", "موقوف": "Suspended", "محذوف": "Deleted", "شخصي": "Personal", "مشترك": "Shared", "لمين": "Assigned to", "تحويل إلى": "Forward to", "لموظف ترك العمل وما زال نشطاً": "Active but employee left",
    "الإيميلات الشخصية والمشتركة: لمين، حالتها، والتحويل بعد ترك العمل": "Personal and shared mailboxes: owner, status and forwarding after leaving",
    "تعيين موظف جديد": "Onboard new employee", "🟢 تعيين موظف جديد": "🟢 Onboard employee", "إخلاء طرف": "Clearance", "🚪 إخلاء طرف": "🚪 Clearance", "جارٍ": "In progress", "مكتمل": "Completed", "تعيين جارٍ": "Onboarding in progress", "إخلاء جارٍ": "Clearance in progress", "العملية": "Process", "التقدّم": "Progress",
    "قائمة مهام لكل موظف جديد (إيميل، جهاز، خط، اشتراكات)، وإخلاء طرف بكل ما مع الموظف عند ترك العمل": "A checklist for each new hire (email, device, line, subscriptions), and full clearance when someone leaves",
    "إنشاء إيميل الشركة": "Create company email", "تسليم لابتوب / جهاز": "Hand over laptop / device", "تسليم خط موبايل": "Hand over mobile line", "إنشاء حساب على النظام بالصلاحية المناسبة": "Create system account with the right role", "توقيع إقرار استلام العهدة": "Sign custody form",
    "تنفيذ": "Run", "تنفيذ كل الباقي": "Run all remaining", "🖨 شهادة إخلاء طرف": "🖨 Clearance certificate", "شهادة إخلاء طرف": "Clearance Certificate", "صفحة الموظف": "Employee page", "+ إنشاء الإيميل": "+ Create email", "📤 اختر جهاز": "📤 Pick device", "📤 اختر خط": "📤 Pick line", "اختر الاشتراكات": "Pick subscriptions", "🖨 طباعة الإقرار": "🖨 Print form",
    "بدء الإخلاء": "Start clearance", "آخر يوم عمل": "Last working day", "تحويل إيميله إلى": "Forward email to", "إنشاء قائمة التعيين": "Create onboarding checklist", "تاريخ البدء": "Start date", "موظف موجود في القائمة": "Existing employee",
    "الخطوط والإيميل": "Lines & email", "📱 الأرقام السعودية": "📱 Saudi numbers", "📱 الأرقام المصرية": "📱 Egyptian numbers", "الأرقام السعودية": "Saudi numbers", "الأرقام المصرية": "Egyptian numbers", "🟢 التعيينات": "🟢 Onboarding", "🚪 الإخلاءات": "🚪 Clearances", "التعيينات": "Onboarding", "الإخلاءات": "Clearances", "🟢 تسجيل تعيين جديد": "🟢 Register new hire", "🚪 تسجيل إخلاء طرف": "🚪 Register clearance", "+ رقم سعودي": "+ Saudi number", "+ رقم مصري": "+ Egyptian number", "خطوط": "Lines",
  });
})(window);
