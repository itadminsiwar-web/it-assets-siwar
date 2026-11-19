/* =========================================================
   ui.js — مكونات الواجهة المشتركة والتوجيه
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, L = global.Ledger;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const STATUS = {
    draft: ['مسودة', 'muted'], issued: ['صادرة', 'info'], void: ['ملغاة', 'muted'],
    paid: ['مدفوعة', 'good'], partial: ['مدفوعة جزئياً', 'warn'], unpaid: ['غير مدفوعة', 'info'], overdue: ['متأخرة', 'bad'],
    sent: ['مُرسل', 'info'], accepted: ['مقبول', 'good'], rejected: ['مرفوض', 'bad'], invoiced: ['تم التحويل لفاتورة', 'good'], expired: ['منتهي', 'muted'],
  };
  const ICON = { good: '✓', warn: '◐', bad: '!', info: '•', muted: '–' };

  const UI = {
    $, $$,
    badge(status) {
      const s = STATUS[status] || [status, 'muted'];
      return `<span class="badge b-${s[1]}"><i>${ICON[s[1]]}</i>${s[0]}</span>`;
    },
    toast(msg, type) {
      const t = document.createElement('div');
      t.className = 'toast ' + (type || 'ok'); t.textContent = msg;
      $('#toasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3000);
    },

    // ---------- النوافذ ----------
    modal({ title, body, wide, onSave, saveLabel, onOpen, extraButtons }) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <header><h3>${U.esc(title)}</h3><button class="icon-btn" data-x aria-label="إغلاق">✕</button></header>
        <div class="modal-body">${body}</div>
        <footer>${extraButtons || ''}<span class="spacer"></span><button class="btn ghost" data-x>إلغاء</button>${onSave ? `<button class="btn primary" data-save>${saveLabel || 'حفظ'}</button>` : ''}</footer>
      </div>`;
      document.body.appendChild(wrap);
      const close = () => wrap.remove();
      wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-x]')) close(); });
      wrap.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      const api = { el: wrap, close };
      if (onSave) $('[data-save]', wrap).onclick = () => {
        try { if (onSave(api) !== false) close(); }
        catch (err) { UI.toast(err.message, 'err'); console.error(err); }
      };
      if (onOpen) onOpen(api);
      const first = $('input:not([type=hidden]),select,textarea', wrap); if (first) first.focus();
      return api;
    },

    // ---------- النماذج ----------
    field({ label, name, type, value, options, required, step, attrs, full, hint, placeholder }) {
      type = type || 'text';
      const v = value == null ? '' : value;
      let input;
      if (type === 'select') input = `<select name="${name}" ${required ? 'required' : ''} ${attrs || ''}>${UI.options(options, v)}</select>`;
      else if (type === 'textarea') input = `<textarea name="${name}" rows="2" ${attrs || ''} placeholder="${U.esc(placeholder || '')}">${U.esc(v)}</textarea>`;
      else if (type === 'checkbox') return `<label class="field check ${full ? 'full' : ''}"><input type="checkbox" name="${name}" ${v ? 'checked' : ''} ${attrs || ''}> ${U.esc(label)}</label>`;
      else input = `<input type="${type}" name="${name}" value="${U.esc(v)}" ${required ? 'required' : ''} ${step ? `step="${step}"` : (type === 'number' ? 'step="any"' : '')} ${attrs || ''} placeholder="${U.esc(placeholder || '')}">`;
      return `<label class="field ${full ? 'full' : ''}"><span>${U.esc(label)}${required ? ' <b class="req">*</b>' : ''}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
    },
    options(opts, value) {
      return (opts || []).map(o => {
        if (typeof o === 'string') o = { value: o, label: o };
        if (o.group) return `<optgroup label="${U.esc(o.group)}">${UI.options(o.items, value)}</optgroup>`;
        return `<option value="${U.esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${U.esc(o.label)}</option>`;
      }).join('');
    },
    form(el) {
      const d = {};
      $$('[name]', el).forEach(i => {
        if (i.closest('.lines')) return;
        d[i.name] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? U.num(i.value) : i.value.trim();
      });
      return d;
    },
    require(d, keys) {
      keys.forEach(([k, label]) => { if (d[k] === '' || d[k] == null || (typeof d[k] === 'number' && d[k] <= 0)) throw new Error('حقل مطلوب: ' + label); });
    },

    // قوائم الاختيار
    opt: {
      customers(empty) { return (empty ? [{ value: '', label: empty }] : []).concat(DB.customers.slice().sort(U.by('name')).map(c => ({ value: c.id, label: c.name + (c.company ? ' — ' + c.company : '') }))); },
      suppliers(empty) { return (empty ? [{ value: '', label: empty }] : []).concat(DB.suppliers.slice().sort(U.by('name')).map(c => ({ value: c.id, label: c.name }))); },
      treasuries(empty) { return (empty ? [{ value: '', label: empty }] : []).concat(DB.treasuries.map(t => ({ value: t.id, label: (t.kind === 'bank' ? '🏦 ' : t.kind === 'wallet' ? '📱 ' : '💵 ') + t.name + (L.isForeign(t.id) ? ' (' + t.currency + ')' : '') }))); },
      projects(empty, customerId) {
        return [{ value: '', label: empty || '— بدون مشروع —' }].concat(DB.projects.filter(p => p.status !== 'closed' || !customerId).filter(p => !customerId || !p.customerId || p.customerId === customerId)
          .map(p => ({ value: p.id, label: p.name + (p.customerId ? ' — ' + ((DB.customers.find(c => c.id === p.customerId) || {}).name || '') : '') })));
      },
      currencies() { return [{ value: DB.settings.baseCurrency || 'SAR', label: (DB.settings.baseCurrency || 'SAR') + ' — العملة الأساسية' }].concat((DB.settings.currencies || []).map(c => ({ value: c.code, label: c.code + ' — ' + c.name }))); },
      reps(empty) { return [{ value: '', label: empty || 'بدون مندوب' }].concat(DB.reps.map(r => ({ value: r.id, label: r.name }))); },
      items() { return [{ value: '', label: '— بند حر —' }].concat(DB.items.filter(i => i.active !== false).map(i => ({ value: i.id, label: i.name }))); },
      accounts(types, empty, leafOnly) {
        const T = global.Core.ACCOUNT_TYPES;
        const groups = Object.keys(T).filter(t => !types || types.includes(t)).map(t => ({
          group: T[t].label,
          items: DB.accounts.filter(a => a.type === t && a.active !== false && (!leafOnly || L.isLeaf(a.id))).sort(U.by('code')).map(a => ({ value: a.id, label: a.code + ' - ' + a.name })),
        }));
        return (empty ? [{ value: '', label: empty }] : []).concat(groups);
      },
      methods() { return ['تحويل بنكي', 'نقدي', 'مدى', 'بطاقة ائتمانية', 'Apple Pay', 'STC Pay', 'سداد', 'شيك', 'إنستاباي (مصر)', 'فودافون كاش (مصر)', 'تحويل دولي / ويسترن يونيون']; },
    },

    // حقول العملة الأجنبية: لو الخزينة بعملة غير الريال يظهر المبلغ بعملتها وسعر الصرف،
    // ويُحسب المبلغ بالريال تلقائياً في حقل amount
    bindFx(el, rec) {
      const slot = $('.fx-slot', el), tSel = $('[name=treasuryId]', el), amt = $('[name=amount]', el);
      if (!slot || !tSel || !amt) return;
      const sync = () => {
        const f = $('[name=fxAmount]', el), r = $('[name=fxRate]', el); if (!f) return;
        amt.value = U.num(f.value) ? U.round(U.num(f.value) * U.num(r.value)) : '';
        const h = $('.fx-inv', el); if (h) h.textContent = U.num(r.value) ? '1 ريال = ' + (1 / U.num(r.value)).toFixed(3) + ' ' + L.curOf(tSel.value) : '';
        amt.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const draw = () => {
        const tid = tSel.value, cur = L.curOf(tid);
        if (!tid || !L.isForeign(tid)) { slot.innerHTML = ''; amt.readOnly = false; return; }
        const same = rec && rec.treasuryId === tid;
        const rate = same && rec.fxRate ? rec.fxRate : L.defaultRate(cur);
        const fx = same && rec.fxAmount ? rec.fxAmount : (U.num(amt.value) ? U.round(U.num(amt.value) / rate) : '');
        slot.innerHTML = `<div class="fx-box"><span>💱 الخزينة بعملة <b>${cur}</b> — المبلغ بالريال يُحسب تلقائياً</span>
          ${UI.field({ label: 'المبلغ بـ ' + L.curLabel(cur), name: 'fxAmount', type: 'number', value: fx })}
          ${UI.field({ label: 'سعر الصرف (ريال لكل 1 ' + cur + ')', name: 'fxRate', type: 'number', value: rate, step: 'any' })}
          <small class="fx-inv muted"></small></div>`;
        amt.readOnly = true; sync();
      };
      tSel.addEventListener('change', draw); slot.addEventListener('input', sync); draw();
    },
    fxClean(d) { if (!d.treasuryId || !L.isForeign(d.treasuryId)) { d.fxAmount = null; d.fxRate = null; } else if (!U.num(d.fxAmount)) throw new Error('أدخل المبلغ بعملة الخزينة'); return d; },

    // ---------- الجداول ----------
    table({ columns, rows, empty, foot, cls }) {
      if (!rows.length) return `<div class="empty">${empty || 'لا توجد بيانات'}</div>`;
      const th = columns.map(c => `<th class="${c.cls || ''}">${c.label}</th>`).join('');
      const tb = rows.map(r => `<tr ${r.__attrs || ''}>${columns.map(c => `<td class="${c.cls || ''}" data-label="${U.esc(c.label)}">${c.render(r)}</td>`).join('')}</tr>`).join('');
      let tf = '';
      if (foot) tf = `<tfoot><tr>${foot.map(f => `<td class="${f.cls || ''}">${f.html || ''}</td>`).join('')}</tr></tfoot>`;
      else if (columns.some(c => c.sum)) tf = `<tfoot><tr>${columns.map((c, i) => `<td class="${c.cls || ''}">${c.sum ? U.money(U.sum(rows, c.sum)) : (i === 0 ? 'الإجمالي' : '')}</td>`).join('')}</tr></tfoot>`;
      return `<div class="table-wrap"><table class="tbl ${cls || ''}"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody>${tf}</table></div>`;
    },
    // تصدير CSV متوافق مع Excel العربي
    csv(filename, headers, rows) {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const text = '﻿' + [headers.map(q).join(',')].concat(rows.map(r => r.map(q).join(','))).join('\r\n');
      UI.download(filename + '.csv', text, 'text/csv;charset=utf-8');
    },
    download(name, text, type) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/octet-stream' }));
      a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },

    // تجهيز تقرير من أي قائمة: اختيار الأعمدة والتجميع ← معاينة (ملخص + رسم + جدول) ← طباعة/PDF أو Excel
    // التقرير بيطلع بنفس الفلاتر والبحث الحاليين، ومكتوب فيه الفلاتر ووقت التجهيز ومصدر البيانات
    reportBuilder(cfg, rows, state, el) {
      const cols = cfg.columns.filter(c => !c.noExport && c.label);
      const txt = (c, r) => String(c.text ? c.text(r) : c.render(r).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      const filt = (cfg.filters || []).map(f => { const v = state[f.key]; if (!v) return ''; const o = (f.options || []).find(o => (o.value != null ? o.value : o) === v); return (f.label ? f.label + ': ' : '') + (o ? (o.label || o) : v); }).filter(Boolean).concat(state.q ? ['بحث: ' + state.q] : []);
      UI.modal({ title: '📊 تجهيز تقرير — ' + String(cfg.title).replace(/<[^>]+>/g, ''), wide: true, saveLabel: 'معاينة وطباعة',
        body: `<p class="muted small">${rows.length} سجل حسب الفلاتر الحالية${filt.length ? ' (' + U.esc(filt.join(' · ')) + ')' : ''}</p>
          <h4>الأعمدة</h4><div class="rb-cols" style="display:flex;flex-wrap:wrap;gap:6px 14px">${cols.map((c, i) => `<label style="display:flex;gap:4px;align-items:center"><input type="checkbox" data-col="${i}" checked> ${U.esc(c.label)}</label>`).join('')}</div>
          <div class="grid2" style="margin-top:10px">${UI.field({ label: 'تجميع حسب (ملخص + رسم)', name: 'group', type: 'select', options: [{ value: '', label: 'بدون تجميع' }].concat(cols.map((c, i) => ({ value: String(i), label: c.label }))) })}
          ${UI.field({ label: 'عنوان التقرير', name: 'title', value: String(cfg.title).replace(/<[^>]+>/g, '').trim() })}</div>
          <button type="button" class="btn ghost" data-rbcsv>⬇ Excel بالأعمدة دي</button>`,
        onOpen: m => { m.el.querySelector('[data-rbcsv]').onclick = () => { const sel = pick(m); UI.csv(cfg.csvName || 'report', sel.map(c => c.label), rows.map(r => sel.map(c => txt(c, r)))); }; },
        onSave: m => {
          const sel = pick(m), d = UI.form(m.el); if (!sel.length) throw new Error('اختار عمود واحد على الأقل');
          const gc = d.group !== '' ? cols[+d.group] : null; let chart = '';
          if (gc) {
            const g = {}; rows.forEach(r => { const k = txt(gc, r) || '—'; g[k] = (g[k] || 0) + 1; });
            const ent = Object.entries(g).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...ent.map(e => e[1]));
            chart = `<h3>ملخص حسب: ${U.esc(gc.label)}</h3><table class="tbl"><tbody>${ent.map(([k, n]) => `<tr><td style="width:35%">${U.esc(k)}</td><td><div style="background:#2563eb;height:12px;border-radius:3px;width:${Math.round(n / max * 100)}%"></div></td><td class="num" style="width:60px"><b>${n}</b></td></tr>`).join('')}</tbody></table>`;
          }
          const now = new Date(), who = ((global.Auth && global.Auth.current()) || {}).name || '';
          UI.print(`<div class="rpt" dir="rtl"><h1 style="margin:0">${U.esc(d.title)}</h1>
            <p style="color:#555;font-size:12px">تاريخ التجهيز: ${now.toLocaleString('ar-EG')}${who ? ' · بواسطة ' + U.esc(who) : ''} · المصدر: ${U.esc(String(cfg.title).replace(/<[^>]+>/g, ''))} (بيانات النظام${(global.BRAND && global.BRAND.sheet && global.BRAND.sheet.mirror) ? ' المطابقة لشيت الجرد' : ''})<br>الفلاتر: ${filt.length ? U.esc(filt.join(' · ')) : 'بدون'} · عدد السجلات: <b>${rows.length}</b></p>
            ${chart}<h3>التفاصيل</h3><table class="tbl" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th>#</th>${sel.map(c => `<th>${U.esc(c.label)}</th>`).join('')}</tr></thead>
            <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td>${sel.map(c => `<td>${U.esc(txt(c, r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        } });
      function pick(m) { return Array.from(m.el.querySelectorAll('[data-col]')).filter(x => x.checked).map(x => cols[+x.dataset.col]); }
    },

    // صفحة قائمة مع بحث وفلاتر وتصدير
    listPage(el, cfg) {
      const state = Object.assign({ q: '' }, cfg.initial || {});
      el.innerHTML = `
        <div class="page-head"><div><h1>${cfg.title}</h1>${cfg.subtitle ? `<p class="sub">${cfg.subtitle}</p>` : ''}</div>
          <div class="actions">${cfg.actions || ''}<button class="btn ghost" data-act="report">📊 تجهيز تقرير</button><button class="btn ghost" data-act="csv">⬇ Excel</button></div></div>
        ${cfg.summary ? '<div class="summary-slot"></div>' : ''}
        <div class="toolbar">
          <input type="search" class="search" placeholder="بحث..." value="${U.esc(state.q)}">
          ${(cfg.filters || []).map(f => f.type === 'date'
            ? `<label class="mini">${f.label}<input type="date" data-f="${f.key}" value="${U.esc(state[f.key] || '')}"></label>`
            : `<select data-f="${f.key}">${UI.options(f.options, state[f.key] || '')}</select>`).join('')}
        </div>
        <div class="list-slot"></div>`;
      const draw = () => {
        let rows = cfg.rows(state);
        if (state.q) { const q = state.q.toLowerCase(); rows = rows.filter(r => (cfg.searchText ? cfg.searchText(r) : JSON.stringify(r)).toLowerCase().includes(q)); }
        $('.list-slot', el).innerHTML = UI.table({ columns: cfg.columns, rows, empty: cfg.empty });
        if (cfg.summary) $('.summary-slot', el).innerHTML = cfg.summary(rows);
        el._rows = rows;
      };
      $('.search', el).addEventListener('input', e => { state.q = e.target.value; draw(); });
      $$('[data-f]', el).forEach(s => s.addEventListener('change', e => { state[e.target.dataset.f] = e.target.value; draw(); }));
      el.onclick = e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'csv') {
          const cols = cfg.columns.filter(c => !c.noExport);
          UI.csv(cfg.csvName || 'export', cols.map(c => c.label), (el._rows || []).map(r => cols.map(c => c.text ? c.text(r) : c.render(r).replace(/<[^>]+>/g, ''))));
          return;
        }
        if (b.dataset.act === 'report') return UI.reportBuilder(cfg, el._rows || [], state, el);
        cfg.onAction && cfg.onAction(b.dataset.act, b.dataset.id, b);
      };
      draw();
      return { redraw: draw, state };
    },

    // ---------- محرر بنود المستند ----------
    // mode: 'sales' (أصناف) أو 'purchase' (حسابات مصروف)
    docEditor(container, doc, mode) {
      const vat = U.num(DB.settings.vatRate);
      let lines = (doc.lines && doc.lines.length) ? U.clone(doc.lines) : [{ itemId: '', desc: '', qty: 1, price: 0, discount: 0, taxRate: vat, accountId: '' }];
      const itemOpts = UI.opt.items();
      const accOpts = UI.opt.accounts(['expense', 'asset'], null, true);
      const st = { discount: U.num(doc.discount), discountType: doc.discountType || 'amt' };

      const render = () => {
        container.innerHTML = `
          <div class="lines table-wrap"><table class="tbl lines-tbl">
            <thead><tr><th>${mode === 'sales' ? 'الصنف / الخدمة' : 'الحساب'}</th><th>الوصف</th><th>الكمية</th><th>السعر</th><th>خصم %</th><th>ضريبة %</th><th>الإجمالي</th><th></th></tr></thead>
            <tbody>${lines.map((l, i) => `<tr data-i="${i}">
              <td>${mode === 'sales'
                ? `<select data-k="itemId">${UI.options(itemOpts, l.itemId)}</select>`
                : `<select data-k="accountId">${UI.options(accOpts, l.accountId || global.Core.accId(global.Core.SYS.PURCHASES))}</select>`}</td>
              <td><input data-k="desc" value="${U.esc(l.desc)}"></td>
              <td><input data-k="qty" type="number" step="any" value="${l.qty}" class="n"></td>
              <td><input data-k="price" type="number" step="any" value="${l.price}" class="n"></td>
              <td><input data-k="discount" type="number" step="any" value="${l.discount || 0}" class="n s"></td>
              <td><input data-k="taxRate" type="number" step="any" value="${l.taxRate}" class="n s"></td>
              <td class="num lt">${U.money(L.lineCalc(l).net + L.lineCalc(l).tax, false)}</td>
              <td><button type="button" class="icon-btn" data-del="${i}" aria-label="حذف البند">✕</button></td>
            </tr>`).join('')}</tbody></table></div>
          <button type="button" class="btn ghost sm" data-add>+ إضافة بند</button>
          <div class="doc-totals">
            <div class="disc-row"><label>خصم إضافي <input type="number" step="any" name="docDiscount" value="${st.discount}" class="n"></label>
              <select name="docDiscountType">${UI.options([{ value: 'amt', label: 'مبلغ' }, { value: 'pct', label: '%' }], st.discountType)}</select></div>
            <div class="tot-box"></div>
          </div>`;
        updateTotals();
      };
      const updateTotals = () => {
        const t = L.docTotals({ lines, discount: U.num($('[name=docDiscount]', container).value), discountType: $('[name=docDiscountType]', container).value });
        $('.tot-box', container).innerHTML = `
          <div><span>الإجمالي قبل الخصم</span><b>${U.money(t.subtotal)}</b></div>
          <div><span>الخصم</span><b>${U.money(t.discount)}</b></div>
          <div><span>الصافي</span><b>${U.money(t.net)}</b></div>
          <div><span>الضريبة</span><b>${U.money(t.tax)}</b></div>
          <div class="grand"><span>الإجمالي المستحق</span><b>${U.money(t.total)}</b></div>`;
        $$('tr[data-i]', container).forEach(tr => { const l = lines[tr.dataset.i]; const c = L.lineCalc(l); $('.lt', tr).textContent = U.money(c.net + c.tax, false); });
      };
      container.addEventListener('input', e => {
        if (e.target.name === 'docDiscount') st.discount = U.num(e.target.value);
        if (e.target.name === 'docDiscountType') st.discountType = e.target.value;
        const tr = e.target.closest('tr[data-i]');
        if (tr && e.target.dataset.k) {
          const l = lines[tr.dataset.i], k = e.target.dataset.k;
          l[k] = ['qty', 'price', 'discount', 'taxRate'].includes(k) ? U.num(e.target.value) : e.target.value;
          if (k === 'itemId') {
            const it = DB.items.find(x => x.id === l.itemId);
            if (it) { l.desc = it.name; l.price = U.num(mode === 'sales' ? it.price : it.cost); l.taxRate = it.taxable === false ? 0 : vat; l.accountId = mode === 'sales' ? (it.accountId || '') : l.accountId; }
            render(); return;
          }
        }
        updateTotals();
      });
      container.addEventListener('click', e => {
        if (e.target.closest('[data-add]')) { lines.push({ itemId: '', desc: '', qty: 1, price: 0, discount: 0, taxRate: vat, accountId: '' }); render(); }
        const d = e.target.closest('[data-del]'); if (d) { lines.splice(+d.dataset.del, 1); if (!lines.length) lines.push({ itemId: '', desc: '', qty: 1, price: 0, discount: 0, taxRate: vat }); render(); }
      });
      render();
      return {
        value() {
          const clean = lines.filter(l => (l.desc || l.itemId) && U.num(l.qty) !== 0);
          if (!clean.length) throw new Error('أضف بنداً واحداً على الأقل');
          return { lines: clean, discount: U.num($('[name=docDiscount]', container).value), discountType: $('[name=docDiscountType]', container).value };
        },
      };
    },

    // ---------- الطباعة ----------
    print(html) {
      const area = $('#print-area');
      area.innerHTML = html;
      document.body.classList.add('printing');
      setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50);
    },
    printHeader(title, no, date, titleEn) {
      const s = DB.settings; const bi = s.bilingual && titleEn;
      const addr = [s.buildingNo && 'مبنى ' + s.buildingNo, s.street, s.district, s.city, s.postalCode && 'ص.ب ' + s.postalCode].filter(Boolean).join('، ') || s.address;
      return `<div class="p-head">
        <div class="p-co">${s.logo ? `<img src="${s.logo}" alt="">` : ''}<div><h2>${U.esc(s.companyName)}</h2>${s.companyNameEn ? `<div class="en">${U.esc(s.companyNameEn)}</div>` : ''}
          <div>${U.esc(addr)}</div><div>${U.esc(s.phone)} ${s.email ? ' · ' + U.esc(s.email) : ''}</div>
          ${s.taxNumber ? `<div>الرقم الضريبي${bi ? ' / VAT No.' : ''}: <b>${U.esc(s.taxNumber)}</b></div>` : ''}${s.commercialReg ? `<div>السجل التجاري${bi ? ' / CR' : ''}: ${U.esc(s.commercialReg)}</div>` : ''}</div></div>
        <div class="p-title"><h1>${title}</h1>${bi ? `<div class="en t">${titleEn}</div>` : ''}${no ? `<div>رقم${bi ? ' / No.' : ''}: <b>${U.esc(no)}</b></div>` : ''}${date ? `<div>التاريخ${bi ? ' / Date' : ''}: ${date}</div>${s.showHijri && U.hijri(date) ? `<div class="muted">${U.hijri(date)}</div>` : ''}` : ''}</div>
      </div>`;
    },
    // تفقيط المبلغ بالعربية
    tafqeet(n) {
      n = Math.floor(Math.abs(n));
      if (n === 0) return 'صفر';
      const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
      const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
      const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
      const under1000 = x => {
        const h = Math.floor(x / 100), r = x % 100, parts = [];
        if (h) parts.push(hundreds[h]);
        if (r < 20) { if (r) parts.push(ones[r]); }
        else { const o = r % 10, t = Math.floor(r / 10); parts.push(o ? ones[o] + ' و' + tens[t] : tens[t]); }
        return parts.join(' و');
      };
      const scales = [[1e9, 'مليار', 'ملياران', 'مليارات'], [1e6, 'مليون', 'مليونان', 'ملايين'], [1e3, 'ألف', 'ألفان', 'آلاف']];
      const parts = [];
      scales.forEach(([v, one, two, many]) => {
        const k = Math.floor(n / v); if (!k) return; n %= v;
        if (k === 1) parts.push(one); else if (k === 2) parts.push(two); else if (k <= 10) parts.push(under1000(k) + ' ' + many); else parts.push(under1000(k) + ' ' + one);
      });
      if (n) parts.push(under1000(n));
      return parts.join(' و');
    },
    amountWords(v) {
      const whole = Math.floor(v), frac = Math.round((v - whole) * 100);
      const s = DB.settings;
      return 'فقط ' + UI.tafqeet(whole) + ' ' + (s.currencyWord || s.currency || '') + (frac ? ' و' + UI.tafqeet(frac) + ' ' + (s.subunitWord || 'هللة') : '') + ' لا غير';
    },
    periodPicker(state, onChange) {
      const id = 'pp' + Math.random().toString(36).slice(2, 7);
      setTimeout(() => {
        const box = document.getElementById(id); if (!box) return;
        box.addEventListener('change', e => {
          const t = e.target;
          if (t.name === 'preset') {
            const today = U.today();
            const presets = {
              month: [U.startOfMonth(today), today], lastmonth: [U.addMonths(U.startOfMonth(today), -1), U.addDays(U.startOfMonth(today), -1)],
              quarter: [U.addMonths(U.startOfMonth(today), -2), today], year: [U.startOfYear(today), today],
              lastyear: [(+today.slice(0, 4) - 1) + '-01-01', (+today.slice(0, 4) - 1) + '-12-31'], all: ['', ''],
            };
            if (presets[t.value]) { [state.from, state.to] = presets[t.value]; $('[name=from]', box).value = state.from; $('[name=to]', box).value = state.to; }
          } else if (t.name === 'from' || t.name === 'to') { state[t.name] = t.value; $('[name=preset]', box).value = ''; }
          onChange();
        });
      });
      return `<div class="period" id="${id}">
        <select name="preset">${UI.options([{ value: '', label: 'فترة مخصصة' }, { value: 'month', label: 'الشهر الحالي' }, { value: 'lastmonth', label: 'الشهر السابق' }, { value: 'quarter', label: 'آخر 3 شهور' }, { value: 'year', label: 'السنة الحالية' }, { value: 'lastyear', label: 'السنة السابقة' }, { value: 'all', label: 'كل الفترات' }], state.preset || '')}</select>
        <label class="mini">من <input type="date" name="from" value="${state.from || ''}"></label>
        <label class="mini">إلى <input type="date" name="to" value="${state.to || ''}"></label></div>`;
    },
  };

  // ---------- رسم بياني مشترك (المالي + التسويق) ----------
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const mLabel = key => MONTHS[+key.slice(5, 7) - 1] + ' ' + key.slice(2, 4);
  // ---------- رسم أعمدة مجمعة (إيرادات/مصروفات) ----------
  // labels: [اسم السلسلة 1، اسم السلسلة 2، اسم الصافي]
  function barChart(data, labels) {
    labels = labels || ['الإيرادات', 'المصروفات', 'صافي الربح'];
    const W = 760, H = 260, pl = 56, pr = 12, pt = 12, pb = 28;
    const max = Math.max(1, ...data.map(d => Math.max(d.revenue, d.expense)));
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; })();
    const y = v => pt + (H - pt - pb) * (1 - v / nice);
    const gw = (W - pl - pr) / data.length, bw = Math.min(18, (gw - 10) / 2);
    const ticks = [0, .25, .5, .75, 1].map(f => f * nice);
    const short = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : String(Math.round(v));
    const bar = (x, v, cls) => { const h = Math.max(0, H - pb - y(v)); if (h < 0.5) return ''; const r = Math.min(4, h, bw / 2);
      return `<path class="${cls}" d="M${x},${H - pb} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} z"/>`; };
    return `<div class="chart" dir="ltr">
      <div class="legend" dir="rtl"><span><i class="sw s1"></i>${labels[0]}</span><span><i class="sw s2"></i>${labels[1]}</span></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${labels[0]} و${labels[1]}" data-labels="${labels.join('|')}">
        ${ticks.map(t => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${pl - 8}" y="${y(t) + 4}" text-anchor="end">${short(t)}</text>`).join('')}
        <line class="axis" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/>
        ${data.map((d, i) => { const gx = pl + i * gw, x1 = gx + gw / 2 - bw - 1, x2 = gx + gw / 2 + 1;
          return `<g class="grp" data-i="${i}"><rect class="hit" x="${gx}" y="${pt}" width="${gw}" height="${H - pt - pb}"/>${bar(x1, d.revenue, 's1')}${bar(x2, d.expense, 's2')}
          <text class="tick" x="${gx + gw / 2}" y="${H - 8}" text-anchor="middle">${MONTHS[+d.key.slice(5, 7) - 1].slice(0, 3)}</text></g>`; }).join('')}
      </svg><div class="tip" hidden></div></div>`;
  }
  function bindChart(root, data) {
    const chart = $('.chart', root); if (!chart) return;
    const tip = $('.tip', chart);
    const lb = ($('svg', chart).dataset.labels || 'الإيرادات|المصروفات|صافي الربح').split('|');
    $$('.grp', chart).forEach(g => {
      const show = () => {
        const d = data[g.dataset.i];
        $$('.grp', chart).forEach(x => x.classList.toggle('dim', x !== g));
        tip.innerHTML = `<b>${mLabel(d.key)}</b><div><i class="sw s1"></i>${lb[0]} <span>${U.money(d.revenue)}</span></div><div><i class="sw s2"></i>${lb[1]} <span>${U.money(d.expense)}</span></div><div class="sep">${lb[2]} <span class="${d.profit < 0 ? 't-bad' : 't-good'}">${U.money(d.profit)}</span></div>`;
        tip.hidden = false;
        const r = g.getBoundingClientRect(), c = chart.getBoundingClientRect();
        let left = r.left - c.left + r.width / 2 - tip.offsetWidth / 2;
        left = Math.max(0, Math.min(c.width - tip.offsetWidth, left));
        tip.style.left = left + 'px'; tip.style.top = '28px';
      };
      g.addEventListener('mouseenter', show); g.addEventListener('click', show);
    });
    chart.addEventListener('mouseleave', () => { tip.hidden = true; $$('.grp', chart).forEach(x => x.classList.remove('dim')); });
  }

  UI.barChart = barChart; UI.bindChart = bindChart;

  // ---------- البحث الشامل ----------
  // يبحث في العملاء والموردين والمشاريع وكل المستندات بالاسم أو الرقم أو المبلغ
  UI.search = function (q) {
    q = String(q || '').trim().toLowerCase(); if (q.length < 2) return [];
    const amt = U.num(q); const res = [];
    const has = (...xs) => xs.some(x => x != null && String(x).toLowerCase().includes(q));
    const nm = (coll, id) => ((DB[coll] || []).find(x => x.id === id) || {}).name || '';
    const amtHit = v => amt > 0 && Math.abs(U.num(v) - amt) < 0.01;
    DB.customers.forEach(c => { if (has(c.name, c.company, c.phone, c.email, c.taxNumber)) res.push({ ic: '👥', t: c.name, s: 'عميل', h: '#/customer/' + c.id }); });
    DB.suppliers.forEach(s => { if (has(s.name, s.phone, s.taxNumber)) res.push({ ic: '🏭', t: s.name, s: 'مورد', h: '#/supplier/' + s.id }); });
    DB.projects.forEach(p => { if (has(p.name, p.type)) res.push({ ic: '🎯', t: p.name, s: 'مشروع', h: '#/project/' + p.id }); });
    DB.invoices.forEach(i => { const t = L.docTotals(i).total; if (has(i.no, i.ref) || amtHit(t)) res.push({ ic: '🧾', t: i.no + ' — ' + nm('customers', i.customerId), s: 'فاتورة · ' + i.date + ' · ' + U.money(t), h: '#/invoice/' + i.id }); });
    DB.quotes.forEach(x => { if (has(x.no, x.subject)) res.push({ ic: '📝', t: x.no + ' — ' + nm('customers', x.customerId), s: 'عرض سعر · ' + x.date, h: '#/quotes' }); });
    DB.receipts.forEach(r => { if (has(r.no, r.ref, r.notes) || amtHit(r.amount)) res.push({ ic: '💰', t: r.no + ' — ' + nm('customers', r.customerId), s: 'سند قبض · ' + r.date + ' · ' + U.money(r.amount), h: '#/receipts' }); });
    DB.bills.forEach(b => { const t = L.docTotals(b).total; if (has(b.no, b.supplierRef, b.notes) || amtHit(t)) res.push({ ic: '📥', t: b.no + ' — ' + nm('suppliers', b.supplierId), s: 'فاتورة مشتريات · ' + b.date + ' · ' + U.money(t), h: '#/bills' }); });
    DB.payments.forEach(p => { if (has(p.no, p.ref, p.notes) || amtHit(p.amount)) res.push({ ic: '💸', t: p.no + ' — ' + nm('suppliers', p.supplierId), s: 'سند صرف · ' + p.date + ' · ' + U.money(p.amount), h: '#/payments' }); });
    DB.expenses.forEach(x => { if (has(x.no, x.payee, x.notes, x.ref) || amtHit(x.amount) || amtHit(x.fxAmount)) res.push({ ic: '🧮', t: x.no + ' — ' + (x.payee || x.notes || ''), s: 'مصروف · ' + x.date + ' · ' + U.money(x.amount), h: '#/expenses' }); });
    DB.journals.forEach(j => { if (has(j.no, j.memo)) res.push({ ic: '📒', t: j.no + ' — ' + (j.memo || ''), s: 'قيد · ' + j.date, h: '#/journals' }); });
    return res.slice(0, 30);
  };
  UI.bindSearch = function (input, box) {
    let items = [], sel = -1;
    const close = () => { box.hidden = true; sel = -1; };
    const draw = () => {
      items = UI.search(input.value);
      if (!input.value.trim()) return close();
      box.innerHTML = items.length ? items.map((r, i) => `<a href="${r.h}" class="${i === sel ? 'on' : ''}"><span>${r.ic}</span><div><b>${U.esc(r.t)}</b><small>${U.esc(r.s)}</small></div></a>`).join('') : '<div class="empty">لا توجد نتائج</div>';
      box.hidden = false;
    };
    input.addEventListener('input', () => { sel = -1; draw(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); draw(); }
      if (e.key === 'Enter' && items[Math.max(0, sel)]) { location.hash = items[Math.max(0, sel)].h; input.value = ''; close(); input.blur(); }
      if (e.key === 'Escape') { input.value = ''; close(); }
    });
    box.addEventListener('click', e => { if (e.target.closest('a')) { input.value = ''; close(); } });
    document.addEventListener('click', e => { if (!e.target.closest('.gsearch')) close(); });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); } });
  };

  // ---------- التوجيه ----------
  const Pages = {};
  // كل تطبيق (المالي / التسويق) يقدر يحدد قائمته وصفحته الرئيسية عبر window.APP
  const APP = Object.assign({ id: 'finance', home: 'dashboard', label: 'SEG · Financial System' }, global.APP || {});
  const NAV = APP.nav || [
    { group: 'عام', items: [['dashboard', '📊', 'لوحة التحكم']] },
    { group: 'المبيعات', items: [['customers', '👥', 'العملاء'], ['quotes', '📝', 'عروض الأسعار'], ['invoices', '🧾', 'فواتير المبيعات'], ['receipts', '💰', 'سندات القبض'], ['credits', '↩️', 'المرتجعات / إشعارات دائنة'], ['installments', '📅', 'الأقساط'], ['projects', '🎯', 'المشاريع والحملات'], ['items', '📦', 'الخدمات والباقات'], ['reps', '🧑‍💼', 'المندوبين والعمولات']] },
    { group: 'المشتريات والمصروفات', items: [['suppliers', '🏭', 'الموردين'], ['bills', '📥', 'فواتير المشتريات'], ['debits', '↪️', 'مرتجعات المشتريات'], ['payments', '💸', 'سندات الصرف'], ['expenses', '🧮', 'المصروفات']] },
    { group: 'الخزينة والمحاسبة', items: [['treasuries', '🏦', 'الخزائن والبنوك'], ['transfers', '🔁', 'التحويلات'], ['accounts', '🗂️', 'دليل الحسابات'], ['journals', '📒', 'قيود اليومية'], ['budgets', '📐', 'الموازنات']] },
    { group: 'التقارير', items: [['reports', '📈', 'التقارير المالية'], ['adrecon', '🔎', 'مطابقة الإنفاق الإعلاني']] },
    { group: 'الأتمتة والذكاء', items: [['assistant', '✨', 'المساعد الذكي'], ['automation', '⚡', 'الأتمتة'], ['integrations', '🔌', 'التكاملات']] },
    { group: 'النظام', items: [['settings', '⚙️', 'الإعدادات والنسخ الاحتياطي'], ['audit', '🕒', 'سجل العمليات']] },
  ];

  // ---------- الأنظمة والصلاحيات (مكان واحد لكل التطبيقات) ----------
  const APPS = [
    { id: 'finance', href: 'index.html', ic: '💰', name: 'النظام المالي', roles: ['admin', 'accountant'] },
    { id: 'marketing', href: 'marketing.html', ic: '📣', name: 'نظام التسويق', roles: ['admin', 'marketing'] },
    { id: 'it', href: 'it.html', ic: '🖥️', name: 'تقنية المعلومات', roles: ['admin', 'it', 'hr'] },
    { id: 'portal', href: 'clients.html', ic: '🤝', name: 'منصة العملاء', roles: ['admin', 'marketing', 'client'] },
  ];
  const roleOf = u => (u && u.role) || 'accountant';
  // يرجع false ويحوّل المستخدم لو التطبيق الحالي مش من صلاحيته
  UI.guard = function (user) {
    const here = APPS.find(a => a.id === APP.id), r = roleOf(user);
    if (!here || here.roles.includes(r)) return true;
    const to = APPS.find(a => a.roles.includes(r)); location.replace(to ? to.href : 'index.html'); return false;
  };
  // قائمة التنقل بين الأنظمة (لمن له أكثر من نظام)
  UI.mountAppSwitch = function (user) {
    const box = document.getElementById('appSwitch'); if (!box) return;
    const r = roleOf(user), list = APPS.filter(a => a.id !== APP.id && a.roles.includes(r));
    if (!list.length) { box.hidden = true; return; }
    box.innerHTML = `<details class="app-menu"><summary title="الأنظمة">▦ <span>الأنظمة</span></summary><div class="app-menu-list">${list.map(a => `<a href="${a.href}"><span>${a.ic}</span>${a.name}</a>`).join('')}</div></details>`;
    box.hidden = false;
    document.addEventListener('click', e => { const d = box.querySelector('details'); if (d && !e.target.closest('#appSwitch')) d.open = false; });
  };
  UI.APPS = APPS;

  const Router = {
    go(hash) { location.hash = hash; },
    current() { const h = (location.hash || '#/' + APP.home).slice(2).split('/'); return { page: h[0] || APP.home, arg: decodeURIComponent(h[1] || '') }; },
    render() {
      const { page, arg } = Router.current();
      // التطبيق يقدر يحدد الصفحات المسموحة فقط (منصة العملاء لا تفتح صفحات النظام المالي حتى لو كُتب الرابط يدوياً)
      const allowed = !APP.pages || APP.pages.includes(page);
      const p = (allowed && Pages[page]) || Pages[APP.home];
      $$('.nav a').forEach(a => { a.classList.toggle('active', a.dataset.page === page); if (a.dataset.page === page) { const g = a.closest('.nav-group'); if (g) g.classList.remove('collapsed'); } });
      const main = $('#main');
      main.onclick = null; main.onchange = null; main.oninput = null; main.innerHTML = '';
      try { p(main, arg); } catch (e) { console.error(e); main.innerHTML = `<div class="empty">حدث خطأ: ${U.esc(e.message)}</div>`; }
      document.body.classList.remove('nav-open');
      main.focus({ preventScroll: true }); window.scrollTo(0, 0);
    },
    buildNav() {
      // الأقسام بتتفتح وتتقفل (والاختيار بيتحفظ)؛ القسم اللي فيه الصفحة الحالية بيفضل مفتوح
      let closed = []; try { closed = JSON.parse(localStorage.getItem('nav_closed') || '[]'); } catch (e) {}
      $('#nav').innerHTML = NAV.map(g => `<div class="nav-group ${closed.includes(g.group) ? 'collapsed' : ''}" data-g="${U.esc(g.group)}"><button type="button" class="nav-title nav-toggle" aria-expanded="${!closed.includes(g.group)}">${g.group}<span class="nav-caret">▾</span></button><div class="nav-items">${g.items.map(([k, ic, label]) => `<a href="#/${k}" data-page="${k}"><span class="ic">${ic}</span>${label}</a>`).join('')}</div></div>`).join('')
        + '<div class="dev-credit" dir="ltr"><small>' + APP.label + '</small><span class="dc-badge"><span class="lc-code" aria-hidden="true">&lt;/&gt;</span>Developed by <b>Eng. Mahmoud Ebrahim</b></span></div>';
      $('#nav').onclick = e => {
        const t = e.target.closest('.nav-toggle'); if (!t) return;
        const g = t.closest('.nav-group'); g.classList.toggle('collapsed'); t.setAttribute('aria-expanded', !g.classList.contains('collapsed'));
        try { localStorage.setItem('nav_closed', JSON.stringify($$('.nav-group.collapsed').map(x => x.dataset.g))); } catch (er) {}
      };
    },
  };

  global.UI = UI; global.Pages = Pages; global.Router = Router;
})(window);
