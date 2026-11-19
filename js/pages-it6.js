/* =========================================================
   pages-it6.js — M05 الإدارة والمالية + M06 إدارة النظام
   طلبات الشراء (موافقة المدير الورقية) · الاستلام والفواتير · المصروفات والمدفوعات وتوزيع التكلفة · الميزانيات
   المستخدمون · الأدوار والصلاحيات · الشركات والفروع والأقسام
   قاعدة M05: المتوقع ≠ الملتزم ≠ المفوتر ≠ المدفوع — كل رقم منفصل
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {}, X = global.ITX;
  const today = () => U.today();
  const esc = s => U.esc(s);
  const act = (a, id, label, cls) => `<button class="link ${cls || ''}" data-act="${a}" data-id="${id || ''}">${label}</button>`;
  const badge = (map, s) => { const x = map[s] || Object.values(map)[0]; return `<span class="badge b-${x[1]}"><i>•</i>${x[0]}</span>`; };
  const opts = map => Object.entries(map).map(([k, v]) => ({ value: k, label: v[0] }));
  const money = (v, cur) => X.money(v, cur || X.cur());
  const base = (v, cur) => X.sar(v, cur || X.cur());
  const me = () => X.me().name || '';
  const arr = k => (DB[k] = DB[k] || []);
  const seq = (pfx, pad) => { DB.seq = DB.seq || {}; const k = 'c_' + pfx; DB.seq[k] = (DB.seq[k] || 0) + 1; return pfx + '-' + String(DB.seq[k]).padStart(pad || 4, '0'); };
  const depts = () => X.allDepts().slice().sort();
  const branches = () => (X.settings().companies || []).map(c => c.name);
  const suppliers = () => Array.from(new Set((DB.assets || []).map(a => a.supplier).concat(arr('purchaseRequests').map(p => p.supplier), arr('itExpenses').map(e => e.supplier)).map(s => String(s || '').trim()).filter(Boolean))).sort();
  const datalist = (id, list) => `<datalist id="${id}">${list.map(s => `<option value="${esc(s)}">`).join('')}</datalist>`;
  const CATS = ['أجهزة', 'ملحقات ومستهلكات', 'صيانة', 'اشتراكات وتراخيص', 'إنترنت واتصالات', 'دومينات واستضافة', 'خدمات', 'أخرى'];
  const ITEM_TYPES = () => [{ value: '', label: 'بند غير أصل (خدمة/مستهلك)' }].concat(Object.entries(Fin.TYPES || {}).map(([k, v]) => ({ value: k, label: 'أصل: ' + v[0] })));

  // ================= طلبات الشراء =================
  const PRS = { draft: ['مسودة', 'muted'], pending: ['بانتظار موافقة المدير', 'warn'], approved: ['معتمد', 'info'], rejected: ['مرفوض', 'bad'], ordered: ['تم الطلب من المورد', 'info'], partial: ['استلام جزئي', 'warn'], received: ['مستلم بالكامل', 'good'], cancelled: ['ملغي', 'muted'] };
  const prTotal = p => U.sum(p.items || [], i => U.num(i.qty) * U.num(i.unitCost));
  const prReceivedVal = p => U.sum(p.items || [], i => U.num(i.received) * U.num(i.unitCost));
  const invOf = p => arr('itInvoices').filter(i => i.prId === p.id);
  const paidOf = inv => U.sum(arr('itPayments').filter(x => x.invoiceId === inv.id), x => U.num(x.amount));
  // الأرقام الأربعة (بالعملة الأساسية)
  Fin.finStages = function (filter) {
    const f = filter || (() => true), PR = arr('purchaseRequests').filter(f);
    const forecast = U.sum(PR.filter(p => ['draft', 'pending'].includes(p.status)), p => base(prTotal(p), p.currency));
    const invoicedPR = p => U.sum(invOf(p), i => U.num(i.amount));
    const committed = U.sum(PR.filter(p => ['approved', 'ordered', 'partial', 'received'].includes(p.status)), p => base(Math.max(0, prTotal(p) - invoicedPR(p)), p.currency));
    const INV = arr('itInvoices').filter(i => f(i)), EXP = arr('itExpenses').filter(f);
    const invoiced = U.sum(INV, i => base(i.amount, i.currency)) + U.sum(EXP, e => base(e.amount, e.currency));
    const paid = U.sum(INV, i => base(paidOf(i), i.currency)) + U.sum(EXP.filter(e => e.paid), e => base(e.amount, e.currency));
    return { forecast, committed, invoiced, paid, due: invoiced - paid };
  };
  const stageCards = s => `<div class="cards mk-cards">
    <div class="card"><span>📝 متوقع (طلبات لسه ما اتعتمدتش)</span><b>${money(s.forecast)}</b></div>
    <div class="card"><span>🤝 ملتزم (معتمد ولسه ما اتفوترش)</span><b class="t-warn">${money(s.committed)}</b></div>
    <div class="card"><span>🧾 مفوتر</span><b>${money(s.invoiced)}</b></div>
    <div class="card"><span>✅ مدفوع</span><b class="t-good">${money(s.paid)}</b><small>مستحق: ${money(s.due)}</small></div></div>`;

  function editPR(p) {
    p = p ? JSON.parse(JSON.stringify(p)) : { date: today(), requester: me(), currency: X.cur(), priority: 'عادي', status: 'draft', items: [{ desc: '', type: '', qty: 1, unitCost: '' }] };
    const row = (i, k) => `<tr data-i="${k}"><td><input data-k="desc" value="${esc(i.desc)}" placeholder="الوصف / الموديل"></td><td><select data-k="type">${UI.options(ITEM_TYPES(), i.type || '')}</select></td><td><input data-k="qty" type="number" min="1" value="${esc(i.qty)}" style="width:70px"></td><td><input data-k="unitCost" type="number" value="${esc(i.unitCost)}" style="width:110px"></td><td><button type="button" class="link danger" data-del="${k}">✕</button></td></tr>`;
    UI.modal({ title: p.id ? 'تعديل طلب شراء ' + p.code : 'طلب شراء جديد', wide: true, saveLabel: 'حفظ',
      body: `<div class="grid4">${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: p.date })}${UI.field({ label: 'مقدم الطلب', name: 'requester', value: p.requester })}
        ${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: [''].concat(depts()), value: p.dept })}${UI.field({ label: X.coLabel(), name: 'company', type: 'select', options: [''].concat(branches()), value: p.company })}
        ${UI.field({ label: 'المورد المقترح', name: 'supplier', value: p.supplier, attrs: 'list="dl-sup"' })}${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: p.currency })}
        ${UI.field({ label: 'الأولوية', name: 'priority', type: 'select', options: ['عادي', 'مهم', 'عاجل'], value: p.priority })}${UI.field({ label: 'مرتبط بطلب احتياج / مرشح', name: 'ref', value: p.ref, placeholder: 'REQ-0001' })}
        ${UI.field({ label: 'سبب الشراء', name: 'reason', value: p.reason, full: true })}</div>${datalist('dl-sup', suppliers())}
        <h4>البنود</h4><div class="table-wrap"><table class="tbl"><thead><tr><th>البند</th><th>النوع</th><th>الكمية</th><th>سعر الوحدة</th><th></th></tr></thead><tbody class="pr-items">${p.items.map(row).join('')}</tbody></table></div>
        <button type="button" class="btn ghost sm" data-addrow>+ بند</button> <b class="pr-tot"></b>
        <p class="muted small">البند اللي نوعه "أصل" بيتحول لجهاز في الأصول عند الاستلام بس — مش عند الطلب.</p>`,
      onOpen: m => {
        const tb = m.el.querySelector('.pr-items');
        const read = () => Array.from(tb.querySelectorAll('tr')).map(tr => { const o = {}; tr.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value; }); return o; });
        const tot = () => { m.el.querySelector('.pr-tot').textContent = 'الإجمالي: ' + U.money(U.sum(read(), i => U.num(i.qty) * U.num(i.unitCost)), false); };
        m.el.addEventListener('input', tot); tot();
        m.el.querySelector('[data-addrow]').onclick = () => { tb.insertAdjacentHTML('beforeend', row({ qty: 1 }, tb.children.length)); };
        tb.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d && tb.children.length > 1) { d.closest('tr').remove(); tot(); } });
        m.read = read;
      },
      onSave: m => {
        const d = UI.form(m.el); const items = m.read().filter(i => i.desc.trim());
        if (!items.length) throw new Error('ضيف بند واحد على الأقل');
        const old = p.items || [];
        d.items = items.map((i, k) => ({ desc: i.desc.trim(), type: i.type, qty: U.num(i.qty) || 1, unitCost: U.num(i.unitCost), received: (old[k] && old[k].desc === i.desc.trim()) ? U.num(old[k].received) : 0 }));
        ['date', 'requester', 'dept', 'company', 'supplier', 'currency', 'priority', 'ref', 'reason'].forEach(k => { p[k] = d[k]; }); p.items = d.items;
        if (!p.code) p.code = seq('PR');
        C.upsert('purchaseRequests', p, 'طلب شراء'); X.event(p.code + ': طلب شراء ' + U.money(prTotal(p), false) + ' ' + p.currency, { kind: 'purchase', ref: p.code });
        UI.toast('اتحفظ ' + p.code); location.hash = '#/purchase/' + p.id;
      } });
  }

  // نموذج A4 للموافقة الورقية من المدير التنفيذي
  function printPR(p) {
    const B = global.BRAND || {};
    UI.print(`<div dir="rtl" style="font-family:Cairo,Tahoma;font-size:13px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #222;padding-bottom:8px">${B.logo ? `<img src="${esc(B.logo)}" style="height:50px">` : ''}<div style="text-align:left"><b>${esc(B.company || '')}</b><br>إدارة تقنية المعلومات</div></div>
      <h2 style="text-align:center;margin:14px 0">طلب شراء — ${esc(p.code)}</h2>
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><tr><td>التاريخ</td><td>${esc(p.date)}</td><td>مقدم الطلب</td><td>${esc(p.requester || '')}</td></tr>
      <tr><td>القسم</td><td>${esc(p.dept || '—')}</td><td>${esc(X.coLabel())}</td><td>${esc(p.company || '—')}</td></tr>
      <tr><td>المورد المقترح</td><td>${esc(p.supplier || '—')}</td><td>الأولوية</td><td>${esc(p.priority || '')}</td></tr>
      <tr><td>سبب الشراء</td><td colspan="3">${esc(p.reason || '')}</td></tr></table>
      <h3>البنود</h3><table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><thead><tr><th>#</th><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>${p.items.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.desc)}</td><td>${i.qty}</td><td>${U.money(i.unitCost, false)}</td><td>${U.money(i.qty * i.unitCost, false)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4"><b>الإجمالي (${esc(p.currency)})</b></td><td><b>${U.money(prTotal(p), false)}</b></td></tr></tfoot></table>
      <div style="display:flex;gap:30px;margin-top:40px"><div style="flex:1">مقدم الطلب<br><br>التوقيع: ____________</div><div style="flex:1">مدير تقنية المعلومات<br><br>التوقيع: ____________</div>
      <div style="flex:1;border:1px solid #222;padding:8px">قرار المدير التنفيذي<br>☐ موافق &nbsp; ☐ مرفوض &nbsp; ☐ موافق بتعديل<br><br>التوقيع: ____________<br>التاريخ: ____/____/______</div></div>
      <p style="font-size:11px;color:#666;margin-top:20px">بعد التوقيع: يتسجل القرار ورقم/صورة الموافقة في النظام (زرار "تسجيل قرار المدير").</p></div>`);
  }

  function decide(p) {
    UI.modal({ title: 'تسجيل قرار المدير التنفيذي — ' + p.code, saveLabel: 'تسجيل', body: `<div class="grid2">
      ${UI.field({ label: 'القرار', name: 'decision', type: 'select', options: [{ value: 'approved', label: 'موافق' }, { value: 'rejected', label: 'مرفوض' }] })}${UI.field({ label: 'تاريخ القرار', name: 'date', type: 'date', value: today() })}
      ${UI.field({ label: 'اسم المعتمد', name: 'by', value: 'المدير التنفيذي' })}${UI.field({ label: 'مرجع إثبات الموافقة', name: 'ref', placeholder: 'رقم الورقة / مكان الصورة على الدرايف' })}
      ${UI.field({ label: 'ملاحظة / تعديلات المدير', name: 'note', full: true })}</div><p class="muted small">الموافقة ورقية — هنا بنسجل إثباتها بس.</p>`,
      onSave: m => { const d = UI.form(m.el); if (!d.ref && d.decision === 'approved') throw new Error('اكتب مرجع إثبات الموافقة');
        p.status = d.decision; p.approval = { decision: d.decision, date: d.date, by: d.by, ref: d.ref, note: d.note, recordedBy: me(), at: new Date().toISOString() };
        C.upsert('purchaseRequests', p, 'قرار طلب شراء'); X.event(p.code + ': ' + (d.decision === 'approved' ? 'اتعتمد' : 'اترفض') + ' من ' + d.by, { kind: 'purchase', ref: p.code }); global.Router.render(); } });
  }

  // الاستلام (جزئي أو كامل): بنود الأصول بتتحول لأجهزة هنا بس
  function receive(p) {
    const mirror = !!((global.BRAND || {}).sheet || {}).mirror;
    UI.modal({ title: '📦 استلام — ' + p.code, wide: true, saveLabel: 'تسجيل الاستلام', body: `${UI.field({ label: 'تاريخ الاستلام', name: 'date', type: 'date', value: today() })}
      <table class="tbl"><thead><tr><th>البند</th><th>المطلوب</th><th>اتستلم قبل كده</th><th>المستلم دلوقتي</th></tr></thead><tbody>${p.items.map((i, k) => { const left = U.num(i.qty) - U.num(i.received); return `<tr><td>${esc(i.desc)}${i.type ? ' <span class="badge b-info">أصل</span>' : ''}</td><td>${i.qty}</td><td>${U.num(i.received)}</td><td><input type="number" min="0" max="${left}" data-rcv="${k}" value="${left}" ${left ? '' : 'disabled'} style="width:80px"></td></tr>`; }).join('')}</tbody></table>
      ${mirror ? '<p class="muted small">⚠️ النظام مطابق لشيت الجرد (قراءة بس) — الأجهزة المستلمة هتظهر في "الأجهزة" لما تتضاف في الشيت. هنا بنسجل الاستلام والأكواد المقترحة.</p>' : '<p class="muted small">كل وحدة من بند "أصل" هتتسجل جهاز في المخزن بكود جديد.</p>'}`,
      onSave: m => { const d = UI.form(m.el), lines = [], created = [];
        m.el.querySelectorAll('[data-rcv]').forEach(inp => { const k = +inp.dataset.rcv, i = p.items[k], q = Math.min(U.num(inp.value), U.num(i.qty) - U.num(i.received)); if (q > 0) lines.push({ k, q }); });
        if (!lines.length) throw new Error('مفيش كميات مستلمة');
        lines.forEach(({ k, q }) => { const i = p.items[k]; i.received = U.num(i.received) + q;
          if (i.type) for (let n = 0; n < q; n++) {
            if (mirror) { created.push({ suggested: X.assetCode ? '(كود مقترح عند الإضافة للشيت)' : '', desc: i.desc }); continue; }
            const a = { type: i.type, model: i.desc, status: 'stock', condition: 'جديد', supplier: p.supplier, cost: i.unitCost, currency: p.currency, purchaseDate: d.date, company: p.company, dept: '', poRef: p.code };
            a.tag = X.assetCode(a.type, a.company); C.upsert('assets', a, 'استلام شراء'); created.push({ id: a.id, tag: a.tag, desc: i.desc });
          } });
        p.receipts = p.receipts || []; p.receipts.push({ date: d.date, lines, assets: created, by: me() });
        p.status = p.items.every(i => U.num(i.received) >= U.num(i.qty)) ? 'received' : 'partial';
        C.upsert('purchaseRequests', p, 'استلام شراء'); X.event(p.code + ': استلام ' + (p.status === 'received' ? 'كامل' : 'جزئي') + (created.length ? ' · ' + created.length + ' جهاز' : ''), { kind: 'purchase', ref: p.code });
        UI.toast(created.filter(c => c.tag).length ? 'اتسجل ' + created.filter(c => c.tag).length + ' جهاز في المخزن' : 'اتسجل الاستلام'); global.Router.render(); } });
  }

  P.purchases = function (el) {
    UI.listPage(el, { title: '🛒 طلبات الشراء', subtitle: 'طلب ← طباعة A4 لموافقة المدير التنفيذي (ورقي) ← تسجيل القرار ← طلب من المورد ← استلام جزئي/كامل ← فاتورة ودفع', csvName: 'purchase-requests',
      actions: '<button class="btn primary" data-act="new">+ طلب شراء</button>',
      filters: [{ key: 'status', label: 'الحالة', options: [{ value: '', label: 'كل الحالات' }].concat(opts(PRS)) }, { key: 'dept', label: 'القسم', options: [{ value: '', label: 'كل الأقسام' }].concat(depts()) }],
      rows: s => arr('purchaseRequests').filter(p => (!s.status || p.status === s.status) && (!s.dept || p.dept === s.dept)).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      searchText: p => [p.code, p.supplier, p.requester, p.dept, p.reason].concat((p.items || []).map(i => i.desc)).join(' '),
      summary: rows => stageCards(Fin.finStages(p => rows.includes(p) || rows.some(r => r.id === p.prId))),
      empty: 'لا توجد طلبات شراء',
      columns: [
        { label: 'الكود', render: p => `<a href="#/purchase/${p.id}" dir="ltr"><b>${esc(p.code)}</b></a><div class="muted small">${esc(p.date)}</div>`, text: p => p.code },
        { label: 'البنود', render: p => esc((p.items || []).map(i => i.qty + '× ' + i.desc).join('، ')) + (p.reason ? `<div class="muted small">${esc(p.reason)}</div>` : ''), text: p => (p.items || []).map(i => i.qty + 'x ' + i.desc).join(' / ') },
        { label: 'القسم', render: p => esc(p.dept || '—') + (p.company ? `<div class="muted small">${esc(p.company)}</div>` : ''), text: p => p.dept || '' },
        { label: 'المورد', render: p => esc(p.supplier || '—'), text: p => p.supplier || '' },
        { label: 'الإجمالي', cls: 'num', render: p => money(prTotal(p), p.currency), text: p => prTotal(p) },
        { label: 'الحالة', render: p => badge(PRS, p.status) + (p.priority === 'عاجل' ? ' <span class="badge b-bad">عاجل</span>' : ''), text: p => PRS[p.status][0] },
        { label: '', noExport: true, render: p => act('open', p.id, 'فتح') + act('print', p.id, '🖨 A4') },
      ],
      onAction: (k, id) => { const p = arr('purchaseRequests').find(x => x.id === id); if (k === 'new') editPR(); if (k === 'open') location.hash = '#/purchase/' + id; if (k === 'print') printPR(p); } });
  };

  P.purchase = function (el, id) {
    const p = arr('purchaseRequests').find(x => x.id === id); if (!p) { el.innerHTML = '<div class="empty">الطلب مش موجود</div>'; return; }
    const inv = invOf(p), s = Fin.finStages(x => x === p || x.prId === p.id);
    const can = { submit: p.status === 'draft', decide: p.status === 'pending', order: p.status === 'approved', receive: ['approved', 'ordered', 'partial'].includes(p.status), invoice: ['approved', 'ordered', 'partial', 'received'].includes(p.status), edit: ['draft', 'pending', 'rejected'].includes(p.status) };
    el.innerHTML = `<div class="page-head"><div><h1>🛒 ${esc(p.code)} ${badge(PRS, p.status)}</h1><p class="sub">${esc(p.reason || '')} · ${esc(p.requester || '')} · ${esc(p.dept || '')}</p></div><div class="actions">
      <a class="btn ghost" href="#/purchases">رجوع</a>${act('print', p.id, '🖨 طباعة A4 للموافقة', 'btn')}${can.edit ? act('edit', p.id, 'تعديل', 'btn ghost') : ''}${can.submit ? act('submit', p.id, '📨 إرسال للموافقة', 'btn primary') : ''}${can.decide ? act('decide', p.id, '✍️ تسجيل قرار المدير', 'btn primary') : ''}
      ${can.order ? act('order', p.id, '📞 تم الطلب من المورد', 'btn') : ''}${can.receive ? act('receive', p.id, '📦 استلام', 'btn primary') : ''}${can.invoice ? act('invoice', p.id, '🧾 تسجيل فاتورة', 'btn') : ''}${!['received', 'cancelled'].includes(p.status) ? act('cancel', p.id, 'إلغاء', 'btn ghost') : ''}</div></div>
      ${stageCards(s)}
      <div class="dash-grid"><div class="panel"><h2>البنود</h2>${UI.table({ rows: p.items, columns: [{ label: 'البند', render: i => esc(i.desc) + (i.type ? ' <span class="badge b-info">' + esc(((Fin.TYPES || {})[i.type] || [''])[0]) + '</span>' : '') }, { label: 'الكمية', cls: 'num', render: i => i.qty }, { label: 'المستلم', cls: 'num', render: i => `<span class="${U.num(i.received) >= i.qty ? 't-good' : U.num(i.received) ? 't-warn' : 'muted'}">${U.num(i.received)}</span>` }, { label: 'سعر الوحدة', cls: 'num', render: i => U.money(i.unitCost, false) }, { label: 'الإجمالي', cls: 'num', render: i => U.money(i.qty * i.unitCost, false) }] })}
        <p>الإجمالي: <b>${money(prTotal(p), p.currency)}</b> · قيمة المستلم: ${money(prReceivedVal(p), p.currency)}</p></div>
      <div class="panel"><h2>الموافقة</h2>${p.approval ? `<p>${p.approval.decision === 'approved' ? '✅ موافق' : '❌ مرفوض'} — ${esc(p.approval.by)} بتاريخ ${esc(p.approval.date)}</p><p class="muted small">مرجع الإثبات: ${esc(p.approval.ref || '—')}${p.approval.note ? ' · ' + esc(p.approval.note) : ''} · سجّلها ${esc(p.approval.recordedBy || '')}</p>` : '<p class="muted">لسه مفيش قرار — اطبع النموذج A4 وخد توقيع المدير التنفيذي</p>'}
        <h2>الاستلامات</h2>${(p.receipts || []).map(r => `<div class="small">📦 ${esc(r.date)} — ${r.lines.map(l => l.q + '× ' + esc(p.items[l.k] ? p.items[l.k].desc : '')).join('، ')}${r.assets && r.assets.filter(a => a.tag).length ? '<br>الأجهزة: ' + r.assets.filter(a => a.tag).map(a => `<a dir="ltr" href="#/asset/${a.id}">${esc(a.tag)}</a>`).join(' ') : ''} <span class="muted">· ${esc(r.by || '')}</span></div>`).join('') || '<p class="muted">لسه مفيش استلام</p>'}
        <h2>الفواتير</h2>${inv.map(i => `<div class="small">🧾 <a href="#/invoices">${esc(i.no || i.code)}</a> — ${money(i.amount, i.currency)} · مدفوع ${money(paidOf(i), i.currency)}</div>`).join('') || '<p class="muted">لسه مفيش فواتير</p>'}</div></div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'print') printPR(p); if (k === 'edit') editPR(p); if (k === 'decide') decide(p); if (k === 'receive') receive(p); if (k === 'invoice') editInvoice({ prId: p.id, supplier: p.supplier, currency: p.currency, amount: Math.max(0, prTotal(p) - U.sum(inv, i => U.num(i.amount))), dept: p.dept, company: p.company, category: 'أجهزة' });
      const st = { submit: 'pending', order: 'ordered', cancel: 'cancelled' }[k];
      if (st && (k !== 'cancel' || confirm('إلغاء الطلب؟'))) { p.status = st; if (k === 'order') p.orderedAt = today(); C.upsert('purchaseRequests', p, 'طلب شراء'); X.event(p.code + ': ' + PRS[st][0], { kind: 'purchase', ref: p.code }); global.Router.render(); } };
  };

  // ================= الفواتير والمدفوعات =================
  const invStatus = i => { const pd = paidOf(i); return pd >= U.num(i.amount) && U.num(i.amount) ? 'paid' : pd > 0 ? 'partial' : i.dueDate && i.dueDate < today() ? 'overdue' : 'open'; };
  const INVS = { open: ['غير مدفوعة', 'warn'], partial: ['مدفوعة جزئياً', 'info'], paid: ['مدفوعة', 'good'], overdue: ['متأخرة', 'bad'] };
  // توزيع التكلفة بالنسبة: لازم المجموع = 100%
  const allocField = a => `<div class="alloc" style="grid-column:1/-1"><span class="muted small">توزيع التكلفة على الأقسام (٪) — اختياري، المجموع لازم 100</span>${[0, 1, 2].map(k => { const x = (a || [])[k] || {}; return `<div style="display:flex;gap:6px;margin-top:4px"><select data-al-d="${k}">${UI.options([''].concat(depts()), x.dept || '')}</select><input type="number" data-al-p="${k}" value="${esc(x.pct || '')}" placeholder="%" style="width:80px"></div>`; }).join('')}</div>`;
  const readAlloc = el => { const out = []; [0, 1, 2].forEach(k => { const d = el.querySelector(`[data-al-d="${k}"]`).value, p = U.num(el.querySelector(`[data-al-p="${k}"]`).value); if (d && p) out.push({ dept: d, pct: p }); }); if (out.length && Math.round(U.sum(out, x => x.pct)) !== 100) throw new Error('مجموع نسب التوزيع لازم يساوي 100%'); return out; };

  function editInvoice(i) {
    i = Object.assign({ date: today(), currency: X.cur(), category: 'أجهزة' }, i || {});
    UI.modal({ title: i.id ? 'تعديل فاتورة' : '🧾 فاتورة مورد', wide: true, body: `<div class="grid4">
      ${UI.field({ label: 'رقم فاتورة المورد', name: 'no', value: i.no, required: true })}${UI.field({ label: 'المورد', name: 'supplier', value: i.supplier, attrs: 'list="dl-sup2"' })}
      ${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: i.date })}${UI.field({ label: 'تاريخ الاستحقاق', name: 'dueDate', type: 'date', value: i.dueDate })}
      ${UI.field({ label: 'المبلغ', name: 'amount', type: 'number', value: i.amount })}${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: i.currency })}
      ${UI.field({ label: 'الفئة', name: 'category', type: 'select', options: (Fin.list ? Fin.list('expCats') : CATS), value: i.category })}${UI.field({ label: 'طلب الشراء', name: 'prId', type: 'select', options: [{ value: '', label: '— بدون —' }].concat(arr('purchaseRequests').map(p => ({ value: p.id, label: p.code + ' · ' + (p.supplier || '') }))), value: i.prId })}
      ${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: [''].concat(depts()), value: i.dept })}${UI.field({ label: X.coLabel(), name: 'company', type: 'select', options: [''].concat(branches()), value: i.company })}
      ${UI.field({ label: 'ملاحظة / مكان صورة الفاتورة', name: 'note', full: true, value: i.note })}${allocField(i.allocations)}</div>${datalist('dl-sup2', suppliers())}`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['no', 'رقم الفاتورة']]); if (!U.num(d.amount)) throw new Error('اكتب المبلغ');
        const o = Object.assign(i, d, { amount: U.num(d.amount), allocations: readAlloc(m.el) }); if (!o.code) o.code = seq('INV');
        C.upsert('itInvoices', o, 'فاتورة مورد'); X.event(o.code + ': فاتورة ' + (o.supplier || '') + ' ' + U.money(o.amount, false) + ' ' + o.currency, { kind: 'finance', ref: o.code }); UI.toast('اتحفظت الفاتورة'); global.Router.render(); } });
  }
  function pay(i) {
    const left = U.num(i.amount) - paidOf(i);
    UI.modal({ title: '💳 دفعة — ' + (i.no || i.code), saveLabel: 'تسجيل الدفعة', body: `<div class="grid2">${UI.field({ label: 'المبلغ', name: 'amount', type: 'number', value: left })}${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: today() })}
      ${UI.field({ label: 'طريقة الدفع', name: 'method', type: 'select', options: Fin.list ? Fin.list('payMethods') : ['تحويل بنكي', 'كاش', 'شيك', 'بطاقة', 'محفظة'] })}${UI.field({ label: 'المرجع', name: 'ref' })}</div><p class="muted small">المتبقي: ${money(left, i.currency)} — الدفع الجزئي مسموح.</p>`,
      onSave: m => { const d = UI.form(m.el), a = U.num(d.amount); if (a <= 0) throw new Error('اكتب مبلغ'); if (a > left + 0.01) throw new Error('المبلغ أكبر من المتبقي');
        C.upsert('itPayments', { invoiceId: i.id, amount: a, date: d.date, method: d.method, ref: d.ref, by: me() }, 'دفعة مورد'); X.event((i.no || i.code) + ': دفعة ' + U.money(a, false) + ' ' + i.currency, { kind: 'finance', ref: i.code }); global.Router.render(); } });
  }

  P.invoices = function (el) {
    UI.listPage(el, { title: '🧾 الاستلام والفواتير', subtitle: 'فواتير الموردين مربوطة بطلبات الشراء · دفع جزئي أو كامل · توزيع التكلفة على الأقسام', csvName: 'it-invoices',
      actions: '<button class="btn primary" data-act="new">+ فاتورة</button>',
      filters: [{ key: 'st', label: 'الحالة', options: [{ value: '', label: 'كل الحالات' }].concat(opts(INVS)) }],
      rows: s => arr('itInvoices').filter(i => !s.st || invStatus(i) === s.st).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      searchText: i => [i.code, i.no, i.supplier, i.category, i.note].join(' '),
      summary: rows => `<div class="cards mk-cards"><div class="card"><span>إجمالي الفواتير</span><b>${money(U.sum(rows, i => base(i.amount, i.currency)))}</b></div><div class="card"><span>المدفوع</span><b class="t-good">${money(U.sum(rows, i => base(paidOf(i), i.currency)))}</b></div><div class="card"><span>المستحق</span><b class="t-warn">${money(U.sum(rows, i => base(U.num(i.amount) - paidOf(i), i.currency)))}</b></div><div class="card"><span>متأخرة</span><b class="t-bad">${rows.filter(i => invStatus(i) === 'overdue').length}</b></div></div>`,
      empty: 'لا توجد فواتير',
      columns: [
        { label: 'الفاتورة', render: i => `<b>${esc(i.no || '')}</b><div class="muted small" dir="ltr">${esc(i.code)} · ${esc(i.date)}</div>`, text: i => i.no },
        { label: 'المورد', render: i => esc(i.supplier || '—') + `<div class="muted small">${esc(i.category || '')}</div>`, text: i => i.supplier || '' },
        { label: 'طلب الشراء', render: i => { const p = arr('purchaseRequests').find(x => x.id === i.prId); return p ? `<a href="#/purchase/${p.id}" dir="ltr">${esc(p.code)}</a>` : '<span class="muted">—</span>'; }, text: i => (arr('purchaseRequests').find(x => x.id === i.prId) || {}).code || '' },
        { label: 'المبلغ', cls: 'num', render: i => money(i.amount, i.currency), text: i => i.amount },
        { label: 'المدفوع', cls: 'num', render: i => money(paidOf(i), i.currency), text: i => paidOf(i) },
        { label: 'الاستحقاق', render: i => esc(i.dueDate || '—'), text: i => i.dueDate || '' },
        { label: 'التوزيع', render: i => (i.allocations || []).map(a => esc(a.dept) + ' ' + a.pct + '%').join('، ') || esc(i.dept || '—'), text: i => (i.allocations || []).map(a => a.dept + ' ' + a.pct + '%').join(' / ') || i.dept || '' },
        { label: 'الحالة', render: i => badge(INVS, invStatus(i)), text: i => INVS[invStatus(i)][0] },
        { label: '', noExport: true, render: i => (invStatus(i) !== 'paid' ? act('pay', i.id, '💳 دفعة') : '') + act('edit', i.id, 'تعديل') },
      ],
      onAction: (k, id) => { const i = arr('itInvoices').find(x => x.id === id); if (k === 'new') editInvoice(); if (k === 'edit') editInvoice(i); if (k === 'pay') pay(i); } });
  };

  // ================= المصروفات المباشرة (بدون طلب شراء) + سجل كل المدفوعات =================
  function editExpense(e) {
    e = Object.assign({ date: today(), currency: X.cur(), category: 'خدمات', paid: true }, e || {});
    UI.modal({ title: e.id ? 'تعديل مصروف' : '💸 مصروف IT', wide: true, body: `<div class="grid4">
      ${UI.field({ label: 'البيان', name: 'desc', value: e.desc, required: true, full: true })}
      ${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: e.date })}${UI.field({ label: 'الفئة', name: 'category', type: 'select', options: (Fin.list ? Fin.list('expCats') : CATS), value: e.category })}
      ${UI.field({ label: 'المبلغ', name: 'amount', type: 'number', value: e.amount })}${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: e.currency })}
      ${UI.field({ label: 'المورد / الجهة', name: 'supplier', value: e.supplier, attrs: 'list="dl-sup3"' })}${UI.field({ label: 'اتدفع؟', name: 'paid', type: 'select', options: [{ value: '1', label: 'مدفوع' }, { value: '', label: 'لسه' }], value: e.paid ? '1' : '' })}
      ${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: [''].concat(depts()), value: e.dept })}${UI.field({ label: X.coLabel(), name: 'company', type: 'select', options: [''].concat(branches()), value: e.company })}
      ${allocField(e.allocations)}</div>${datalist('dl-sup3', suppliers())}`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['desc', 'البيان']]); if (!U.num(d.amount)) throw new Error('اكتب المبلغ');
        const o = Object.assign(e, d, { amount: U.num(d.amount), paid: !!d.paid, allocations: readAlloc(m.el) }); if (!o.code) o.code = seq('EXP');
        C.upsert('itExpenses', o, 'مصروف IT'); global.Router.render(); } });
  }
  P.itexpenses = function (el) {
    const rowsAll = () => arr('itExpenses').map(e => ({ kind: 'exp', id: e.id, date: e.date, desc: e.desc, supplier: e.supplier, category: e.category, amount: e.amount, currency: e.currency, paid: e.paid, code: e.code, ref: e }))
      .concat(arr('itPayments').map(p => { const i = arr('itInvoices').find(x => x.id === p.invoiceId) || {}; return { kind: 'pay', id: p.id, date: p.date, desc: 'دفعة فاتورة ' + (i.no || ''), supplier: i.supplier, category: i.category, amount: p.amount, currency: i.currency, paid: true, code: i.code, method: p.method }; }));
    UI.listPage(el, { title: '💸 المصروفات والمدفوعات', subtitle: 'المصروفات المباشرة + كل دفعات الفواتير في سجل واحد', csvName: 'it-expenses',
      actions: '<button class="btn primary" data-act="new">+ مصروف</button>',
      filters: [{ key: 'kind', label: 'النوع', options: [{ value: '', label: 'الكل' }, { value: 'exp', label: 'مصروفات مباشرة' }, { value: 'pay', label: 'دفعات فواتير' }] }, { key: 'cat', label: 'الفئة', options: [{ value: '', label: 'كل الفئات' }].concat(Fin.list ? Fin.list('expCats') : CATS) }, { key: 'month', label: 'الشهر', options: [{ value: '', label: 'كل الشهور' }].concat(Array.from(new Set(rowsAll().map(r => (r.date || '').slice(0, 7)).filter(Boolean))).sort().reverse()) }],
      rows: s => rowsAll().filter(r => (!s.kind || r.kind === s.kind) && (!s.cat || r.category === s.cat) && (!s.month || (r.date || '').startsWith(s.month))).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      searchText: r => [r.desc, r.supplier, r.category, r.code].join(' '),
      summary: rows => `<div class="cards mk-cards"><div class="card hero"><span>الإجمالي</span><b>${money(U.sum(rows, r => base(r.amount, r.currency)))}</b></div><div class="card"><span>مدفوع</span><b class="t-good">${money(U.sum(rows.filter(r => r.paid), r => base(r.amount, r.currency)))}</b></div><div class="card"><span>لسه ما اتدفعش</span><b class="t-warn">${money(U.sum(rows.filter(r => !r.paid), r => base(r.amount, r.currency)))}</b></div></div>`,
      empty: 'لا توجد مصروفات',
      columns: [
        { label: 'التاريخ', render: r => esc(r.date), text: r => r.date },
        { label: 'البيان', render: r => esc(r.desc) + `<div class="muted small" dir="ltr">${esc(r.code || '')}</div>`, text: r => r.desc },
        { label: 'الفئة', render: r => esc(r.category || '—'), text: r => r.category || '' },
        { label: 'المورد', render: r => esc(r.supplier || '—'), text: r => r.supplier || '' },
        { label: 'المبلغ', cls: 'num', render: r => money(r.amount, r.currency), text: r => r.amount },
        { label: 'الحالة', render: r => r.kind === 'pay' ? `<span class="badge b-good">دفعة · ${esc(r.method || '')}</span>` : r.paid ? '<span class="badge b-good">مدفوع</span>' : '<span class="badge b-warn">لسه</span>', text: r => r.paid ? 'مدفوع' : 'لسه' },
        { label: '', noExport: true, render: r => r.kind === 'exp' ? act('edit', r.id, 'تعديل') : `<a href="#/invoices">الفاتورة</a>` },
      ],
      onAction: (k, id) => { if (k === 'new') editExpense(); if (k === 'edit') editExpense(arr('itExpenses').find(x => x.id === id)); } });
  };

  // ================= الميزانيات =================
  // الفعلي = فواتير + مصروفات (حسب التوزيع لو موجود) في نفس السنة والقسم والفئة
  const actualFor = b => {
    const inYear = d => (d || '').startsWith(String(b.year));
    const share = o => { if (!b.dept) return 1; if ((o.allocations || []).length) { const a = o.allocations.find(x => x.dept === b.dept); return a ? a.pct / 100 : 0; } return o.dept === b.dept ? 1 : 0; };
    const items = arr('itInvoices').concat(arr('itExpenses')).filter(o => inYear(o.date) && (!b.category || o.category === b.category));
    const committed = arr('purchaseRequests').filter(p => inYear(p.date) && ['approved', 'ordered', 'partial', 'received'].includes(p.status) && (!b.dept || p.dept === b.dept)).reduce((s, p) => s + base(Math.max(0, prTotal(p) - U.sum(invOf(p), i => U.num(i.amount))), p.currency), 0);
    return { actual: U.sum(items, o => base(o.amount, o.currency) * share(o)), committed: b.category && b.category !== 'أجهزة' ? 0 : committed };
  };
  function editBudget(b) {
    b = Object.assign({ year: new Date().getFullYear(), currency: X.cur() }, b || {});
    UI.modal({ title: b.id ? 'تعديل ميزانية' : '📐 ميزانية جديدة', body: `<div class="grid2">
      ${UI.field({ label: 'السنة', name: 'year', type: 'number', value: b.year })}${UI.field({ label: 'المبلغ المعتمد (' + X.curWord() + ')', name: 'amount', type: 'number', value: b.amount })}
      ${UI.field({ label: 'القسم (فاضي = كل الأقسام)', name: 'dept', type: 'select', options: [''].concat(depts()), value: b.dept })}${UI.field({ label: 'الفئة (فاضي = كل الفئات)', name: 'category', type: 'select', options: [''].concat(Fin.list ? Fin.list('expCats') : CATS), value: b.category })}
      ${UI.field({ label: 'ملاحظة', name: 'note', full: true, value: b.note })}</div>`,
      onSave: m => { const d = UI.form(m.el); if (!U.num(d.amount)) throw new Error('اكتب المبلغ'); C.upsert('itBudgets', Object.assign(b, d, { amount: U.num(d.amount), year: U.num(d.year) }), 'ميزانية IT'); global.Router.render(); } });
  }
  P.itbudgets = function (el) {
    UI.listPage(el, { title: '📐 الميزانيات', subtitle: 'المعتمد مقابل الملتزم والفعلي — لكل سنة وقسم وفئة', csvName: 'it-budgets',
      actions: '<button class="btn primary" data-act="new">+ ميزانية</button>',
      filters: [{ key: 'year', label: 'السنة', options: [{ value: '', label: 'كل السنين' }].concat(Array.from(new Set(arr('itBudgets').map(b => String(b.year)))).sort().reverse()) }],
      rows: s => arr('itBudgets').filter(b => !s.year || String(b.year) === s.year).sort((a, b) => b.year - a.year),
      searchText: b => [b.year, b.dept, b.category, b.note].join(' '),
      summary: rows => { const tot = U.sum(rows, b => b.amount), ac = U.sum(rows, b => actualFor(b).actual); return `<div class="cards mk-cards"><div class="card"><span>المعتمد</span><b>${money(tot)}</b></div><div class="card"><span>الفعلي</span><b>${money(ac)}</b></div><div class="card"><span>المتبقي</span><b class="${tot - ac < 0 ? 't-bad' : 't-good'}">${money(tot - ac)}</b></div></div>` + stageCards(Fin.finStages()); },
      empty: 'لا توجد ميزانيات',
      columns: [
        { label: 'السنة', render: b => '<b>' + b.year + '</b>', text: b => b.year },
        { label: 'القسم', render: b => esc(b.dept || 'كل الأقسام'), text: b => b.dept || 'الكل' },
        { label: 'الفئة', render: b => esc(b.category || 'كل الفئات'), text: b => b.category || 'الكل' },
        { label: 'المعتمد', cls: 'num', render: b => money(b.amount), text: b => b.amount },
        { label: 'ملتزم', cls: 'num', render: b => money(actualFor(b).committed), text: b => actualFor(b).committed },
        { label: 'الفعلي', cls: 'num', render: b => money(actualFor(b).actual), text: b => actualFor(b).actual },
        { label: 'الاستهلاك', render: b => { const a = actualFor(b), pct = b.amount ? Math.round((a.actual + a.committed) / b.amount * 100) : 0; return `${Fin.hbar ? Fin.hbar(pct, pct > 100 ? 'bad' : pct > 80 ? 'warn' : 'used') : ''} <b class="${pct > 100 ? 't-bad' : pct > 80 ? 't-warn' : ''}">${pct}%</b>`; }, text: b => { const a = actualFor(b); return b.amount ? Math.round((a.actual + a.committed) / b.amount * 100) + '%' : ''; } },
        { label: '', noExport: true, render: b => act('edit', b.id, 'تعديل') + act('del', b.id, 'حذف', 'danger') },
      ],
      onAction: (k, id) => { const b = arr('itBudgets').find(x => x.id === id); if (k === 'new') editBudget(); if (k === 'edit') editBudget(b); if (k === 'del' && confirm('حذف الميزانية؟')) { C.remove('itBudgets', id, 'ميزانية IT'); global.Router.render(); } } });
  };

  // ================= M01: بلوكات إضافية في نظرة عامة (المالية + متابعة الخدمات) =================
  const baseDash = P.itdash;
  if (baseDash) P.itdash = function (el, arg) {
    baseDash(el, arg);
    if (X.role() === 'hr') return; // الـ HR مالوش في المالية
    const s = Fin.finStages(), PR = arr('purchaseRequests'), pend = PR.filter(p => p.status === 'pending'), wait = PR.filter(p => ['approved', 'ordered', 'partial'].includes(p.status));
    const over = arr('itInvoices').filter(i => invStatus(i) === 'overdue');
    const sa = (DB.lines || []).filter(l => l.country !== 'EG' && l.status !== 'cancelled'), bkpDue = sa.filter(l => U.num(l.backupEveryDays) && (!l.lastBackup || U.addDays(l.lastBackup, U.num(l.backupEveryDays)) <= today()));
    const netBad = (DB.netPackages || []).filter(x => x.status !== 'cancelled' && X.netState && ['warn', 'crit'].includes(X.netState(x).lvl));
    const agent = sa.filter(l => l.possession === 'مع الوكيل في السعودية').length;
    el.insertAdjacentHTML('beforeend', `<div class="dash-grid" style="margin-top:14px">
      <div class="panel"><h2>💰 الإدارة والمالية</h2>${stageCards(s)}
        <p class="small">🛒 بانتظار موافقة المدير: <b>${pend.length}</b> ${pend.slice(0, 3).map(p => `<a href="#/purchase/${p.id}" dir="ltr">${esc(p.code)}</a>`).join(' ')} · 📦 مستني استلام: <b>${wait.length}</b> · 🧾 فواتير متأخرة: <b class="${over.length ? 't-bad' : ''}">${over.length}</b></p></div>
      <div class="panel"><h2>📡 متابعة الخدمات</h2>
        <p>🌐 باقات محتاجة رصيد: <b class="${netBad.length ? 't-warn' : ''}">${netBad.length}</b> ${netBad.map(x => X.chip(esc(x.code) + ' · ' + X.netState(x).txt, X.netState(x).lvl === 'crit' ? 'bad' : 'warn')).join(' ')}</p>
        <p>🇸🇦 شرائح سعودية: <b>${sa.length}</b> · مع الوكيل: <b>${agent}</b> · باك أب مستحق: <b class="${bkpDue.length ? 't-warn' : ''}">${bkpDue.length}</b></p>
        <p class="small"><a href="#/renewals">🔁 مركز التجديدات</a> · <a href="#/alerts">🔔 التنبيهات</a></p></div></div>`);
  };

  // ================= M06: الأدوار والصلاحيات =================
  const ROLE_NAMES = { admin: 'مدير النظام', it: 'تقنية المعلومات', hr: 'الموارد البشرية', accountant: 'محاسب', marketing: 'تسويق' };
  const navPages = () => ((global.APP || {}).navAll || (global.APP || {}).nav || []).map(g => ({ group: g.group, items: g.items.map(i => ({ k: i[0], ic: i[1], label: i[2] })) }));
  // الافتراضي لو الدور مالوش مصفوفة متسجلة: IT كله · HR رحلة الموظف · الباقي الداشبورد
  Fin.roleDefault = (role, group) => role === 'admin' || role === 'it' ? 'edit' : role === 'hr' ? (group === 'رحلة الموظف' ? 'edit' : group === 'الرئيسية' ? 'view' : 'none') : role === 'accountant' ? (group === 'الإدارة والمالية' ? 'edit' : group === 'الرئيسية' ? 'view' : 'none') : group === 'الرئيسية' ? 'view' : 'none';
  Fin.permOf = (role, page, group) => { if (role === 'admin') return 'edit'; const r = arr('appRoles').find(x => x.role === role); return r && r.perms && r.perms[page] ? r.perms[page] : Fin.roleDefault(role, group); };

  P.roles = function (el) {
    const roles = Object.keys(ROLE_NAMES), sel = P.roles._r = P.roles._r || 'it', groups = navPages();
    const LV = { none: '🚫 لا', view: '👁 عرض', edit: '✏️ تعديل' };
    el.innerHTML = `<div class="page-head"><div><h1>🔑 الأدوار والصلاحيات</h1><p class="sub">مصفوفة لكل دور: مين يشوف ومين يعدّل كل صفحة. المدير دايمًا صلاحية كاملة. الصفحات اللي "لا" بتختفي من القايمة.</p></div></div>
      <div class="toolbar">${roles.map(r => `<button class="btn ${r === sel ? 'primary' : 'ghost'}" data-role="${r}">${ROLE_NAMES[r]} <small>(${(DB.users || []).filter(u => u.role === r).length})</small></button>`).join('')}</div>
      <div class="panel">${sel === 'admin' ? '<p>مدير النظام عنده كل الصلاحيات ومينفعش تتقلل.</p>' : groups.map(g => `<h3>${esc(g.group)}</h3><div class="table-wrap"><table class="tbl"><tbody>${g.items.map(i => { const v = Fin.permOf(sel, i.k, g.group); return `<tr><td style="width:40%">${i.ic} ${esc(i.label)}</td><td><select data-perm="${i.k}" style="max-width:180px">${Object.entries(LV).map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>`).join('') + '<button class="btn primary" data-save>💾 حفظ صلاحيات ' + ROLE_NAMES[sel] + '</button> <button class="btn ghost" data-reset>رجوع للافتراضي</button>'}</div>`;
    el.onclick = e => {
      const r = e.target.closest('[data-role]'); if (r) { P.roles._r = r.dataset.role; return global.Router.render(); }
      if (e.target.closest('[data-save]')) { const perms = {}; el.querySelectorAll('[data-perm]').forEach(i => { perms[i.dataset.perm] = i.value; });
        const ex = arr('appRoles').find(x => x.role === sel); C.upsert('appRoles', Object.assign(ex || { role: sel }, { perms, updatedAt: new Date().toISOString(), by: me() }), 'صلاحيات ' + ROLE_NAMES[sel]); UI.toast('اتحفظت الصلاحيات — هتطبق عند الدخول الجاي'); }
      if (e.target.closest('[data-reset]') && confirm('ترجع صلاحيات الدور ده للافتراضي؟')) { const ex = arr('appRoles').find(x => x.role === sel); if (ex) C.remove('appRoles', ex.id, 'صلاحيات'); global.Router.render(); }
    };
  };

  // ================= M06: المستخدمون =================
  P.users = function (el) {
    const isAdmin = X.role() === 'admin';
    UI.listPage(el, { title: '👤 المستخدمون', subtitle: 'حسابات الدخول للنظام والدور بتاع كل واحد — الصلاحيات التفصيلية من "الأدوار والصلاحيات"', csvName: 'users',
      actions: isAdmin && global.Auth && global.Auth.manageUsers ? '<button class="btn primary" data-act="manage">+ إضافة / تعديل مستخدمين</button>' : '',
      filters: [{ key: 'role', label: 'الدور', options: [{ value: '', label: 'كل الأدوار' }].concat(Object.entries(ROLE_NAMES).map(([k, v]) => ({ value: k, label: v }))) }],
      rows: s => (DB.users || []).filter(u => u.role !== 'client' && (!s.role || u.role === s.role)),
      searchText: u => [u.name, u.email, ROLE_NAMES[u.role]].join(' '),
      empty: 'لا يوجد مستخدمون',
      columns: [
        { label: 'الاسم', render: u => '<b>' + esc(u.name) + '</b>' + (X.me().id === u.id ? ' <span class="badge b-info">أنت</span>' : ''), text: u => u.name },
        { label: 'البريد', render: u => `<span dir="ltr">${esc(u.email)}</span>`, text: u => u.email },
        { label: 'الدور', render: u => `<span class="badge b-info">${esc(ROLE_NAMES[u.role] || u.role)}</span>`, text: u => ROLE_NAMES[u.role] || u.role },
        { label: 'الصفحات المسموحة', render: u => { const n = navPages().reduce((s, g) => s + g.items.filter(i => Fin.permOf(u.role, i.k, g.group) !== 'none').length, 0), all = navPages().reduce((s, g) => s + g.items.length, 0); return `${n} من ${all}`; }, text: () => '' },
        { label: 'آخر نشاط', render: u => { const l = (DB.audit || []).filter(a => a.user === u.name || a.by === u.name).slice(-1)[0]; return l ? esc(l.at || l.date || '') : '<span class="muted">—</span>'; }, text: () => '' },
      ],
      onAction: k => { if (k === 'manage') global.Auth.manageUsers(); } });
  };

  // ================= M06: الشركات والفروع والأقسام =================
  P.orgs = function (el) {
    const s = X.settings(), cos = s.companies || [], mirror = !!((global.BRAND || {}).sheet || {}).mirror;
    const cnt = (k, v) => (DB.assets || []).filter(a => !['retired', 'lost'].includes(a.status) && (X.placeOf ? X.placeOf(a) : a.company) === v).length;
    const dl = depts().map(d => ({ d, staff: (DB.team || []).filter(m => m.dept === d && !(X.isExited && X.isExited(m))).length, assets: (DB.assets || []).filter(a => a.dept === d && !['retired', 'lost'].includes(a.status)).length }));
    el.innerHTML = `<div class="page-head"><div><h1>🏢 الشركات والفروع والأقسام</h1><p class="sub">الهيكل اللي النظام كله بيفلتر عليه</p></div></div>
      <div class="dash-grid"><div class="panel"><h2>${esc(X.coLabel())} (${cos.length})</h2>${UI.table({ rows: cos, columns: [{ label: 'الاسم', render: c => '<b>' + esc(c.name) + '</b>' }, { label: 'الكود', render: c => `<span dir="ltr" class="mono">${esc(c.code || '')}</span>` }, { label: 'الفروع', render: c => esc((c.branches || []).join('، ') || '—') }, { label: 'الأجهزة', cls: 'num', render: c => cnt('company', c.name) }] })}
        <p class="muted small">الأسماء من ملف الهوية (brand.js) — بالإنجليزي زي ما اتفقنا: ${cos.map(c => esc(c.name)).join(' / ')}</p></div>
      <div class="panel"><h2>الأقسام (${dl.length})</h2>${UI.table({ rows: dl, empty: 'لا توجد أقسام', columns: [{ label: 'القسم', render: x => '<b>' + esc(x.d) + '</b>' }, { label: 'الموظفين', cls: 'num', render: x => x.staff }, { label: 'الأجهزة', cls: 'num', render: x => x.assets }] })}
        <p class="muted small">${mirror ? '📄 الأقسام بتتقري من شيت الجرد بس (عمود القسم) — عشان تضيف أو تعدل قسم عدّله في الشيت.' : 'الأقسام من إعدادات النظام والموظفين.'}</p></div></div>`;
  };
})(window);
