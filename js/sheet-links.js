/* =========================================================
   sheet-links.js — زرار «🔗 ربط الشيتات» في كل صفحة
   • كل صفحة ليها بيانات: تربطها بشيت Google (لينك + اسم التاب) ← بتتقري تلقائي مع كل مزامنة
   • استيراد دلوقتي (من اللينك أو من ملف CSV) · وأي حاجة فيها استيراد فيها تصدير: تصدير البيانات كلها + قالب الشيت
   • الأجهزة: شيت الجرد (المزامنة في الاتجاهين) — من «الربط والأتمتة»
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, UI = global.UI, X = global.ITX, R = global.Router;
  const esc = s => U.esc(s);
  const S = () => X.settings();
  const links = () => { const it = DB.itSettings = DB.itSettings || {}; return (it.pageSheets = it.pageSheets || {}); };
  // الصفحة ← البيانات
  const MAP = {
    assets: ['assets', 'الأجهزة'], mobiles: ['assets', 'الأجهزة'], asset: ['assets', 'الأجهزة'], stocktake: ['assets', 'الأجهزة'], maint: ['assets', 'الأجهزة'],
    lines: ['lines', 'الشرائح'], linesSA: ['lines', 'الشرائح'], linesEG: ['lines', 'الشرائح'], net: ['netPackages', 'باقات الإنترنت'], tools: ['tools', 'التولات'], tool: ['tools', 'التولات'],
    subs: ['subscriptions', 'الاشتراكات والتراخيص'], sub: ['subscriptions', 'الاشتراكات والتراخيص'], domains: ['domains', 'الدومينات و SSL'], consumables: ['consumables', 'المستهلكات'],
    staff: ['team', 'الموظفين'], holder: ['team', 'الموظفين'], mail: ['mailboxes', 'الإيميلات'], backup: ['backups', 'النسخ الاحتياطي'],
    purchases: ['purchaseRequests', 'طلبات الشراء'], purchase: ['purchaseRequests', 'طلبات الشراء'], invoices: ['itInvoices', 'الفواتير'], itexpenses: ['itExpenses', 'المصروفات'], itbudgets: ['itBudgets', 'الميزانيات'],
    cands: ['candidates', 'المرشحين'], cand: ['candidates', 'المرشحين'], reqs: ['requisitions', 'طلبات الاحتياج'], onboard: ['cycles', 'التعيين والإخلاء'], offboard: ['cycles', 'التعيين والإخلاء'], cycle: ['cycles', 'التعيين والإخلاء'],
    docs: ['itDocs', 'المستندات'], renewals: ['renewalEvents', 'سجل التجديدات'], roles: ['appRoles', 'الصلاحيات'],
  };
  const IMPORTER = ['lines', 'tools', 'netPackages', 'subscriptions', 'domains', 'consumables', 'team']; // ليهم مطابقة أعمدة جاهزة في المزامنة
  const PRIVATE = /^(passHash|mfaSecret|mfaLastStep|_tw|secret)/;
  const sheetIdOf = url => { const m = String(url || '').match(/\/d\/([a-zA-Z0-9_-]{20,})/); return m ? m[1] : (/^[a-zA-Z0-9_-]{30,}$/.test(String(url || '').trim()) ? String(url).trim() : ''); };
  const gviz = (id, tab) => 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/gviz/tq?tqx=out:csv' + (tab ? '&sheet=' + encodeURIComponent(tab) : '');
  const head = k => (X.COLS[k] || [])[0] || k; // اسم العمود: العربي اللي المزامنة بتفهمه، وإلا اسم الحقل

  // ---------- التصدير (كل البيانات · أو قالب فاضي) ----------
  function exportColl(coll, title, template) {
    const rows = template ? [] : (DB[coll] || []);
    let keys = [];
    if (template && IMPORTER.includes(coll)) keys = (X.OWN && X.OWN[coll]) || []; else rows.forEach(r => Object.keys(r).forEach(k => { if (!keys.includes(k) && !PRIVATE.test(k)) keys.push(k); }));
    if (!keys.length) keys = ['id', 'code', 'name'];
    const val = v => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v;
    UI.csv((template ? 'قالب-' : '') + title.replace(/\s+/g, '-') + '-' + U.today(), keys.map(head), rows.map(r => keys.map(k => val(r[k]))));
  }
  // ---------- الاستيراد ----------
  function importText(coll, text, tab, l) {
    if (coll === 'usageReview' && X.importUsageReview) return X.importUsageReview(text);
    if (coll === 'lines' && l && l.action === 'lines' && X.importNumbersSheet) return X.importNumbersSheet(text);
    if (coll === 'mailboxes' && X.importMailSheet) return X.importMailSheet(text); // شيت الإيميلات: من غير باسوردات + الموظفين الجداد
    if (IMPORTER.includes(coll)) return X.importRows(coll, X.parseCSV(text), tab || coll);
    // عام: نفس أعمدة التصدير ← يحدّث بالـ id أو الكود، ويضيف الجديد
    const all = X.csv2D(text); if (all.length < 2) return { added: 0, updated: 0 };
    const H = all[0].map(h => { h = String(h).trim(); const k = Object.keys(X.COLS).find(c => X.COLS[c].some(a => a.toLowerCase() === h.toLowerCase())); return k || h; });
    let added = 0, updated = 0; DB[coll] = DB[coll] || [];
    all.slice(1).forEach(r => {
      const o = {}; H.forEach((k, i) => { if (!k || PRIVATE.test(k)) return; let v = r[i]; if (v === undefined || v === '') return; if (/^[[{]/.test(v)) { try { v = JSON.parse(v); } catch (e) {} } o[k] = v; });
      if (!Object.keys(o).length) return;
      const key = o.id ? ['id', o.id] : o.code ? ['code', o.code] : o.no ? ['no', o.no] : null;
      const ex = key && DB[coll].find(x => String(x[key[0]] || '').toUpperCase() === String(key[1]).toUpperCase());
      if (ex) { Object.assign(ex, o); updated++; } else { DB[coll].push(Object.assign({ id: U.uid(), createdAt: new Date().toISOString(), source: 'sheet' }, o)); added++; }
    });
    global.Store.save(); return { added, updated };
  }
  async function pullLink(coll) {
    const l = links()[coll]; if (!l || !l.id) return null;
    let txt = '';
    if (l.action) { // شيت خاص ← عن طريق سكربت حسابك (السكربت بيرجّع الأعمدة المطلوبة بس)
      const t = S().twoWay || {}; if (!t.url) throw new Error('اربط سكربت المزامنة من «الربط والأتمتة» الأول');
      const r = await fetch(t.url + '?action=' + encodeURIComponent(l.action) + '&secret=' + encodeURIComponent(t.secret) + '&id=' + encodeURIComponent(l.id) + '&tab=' + encodeURIComponent(l.tab || '') + '&t=' + Date.now());
      txt = await r.text(); if (/^\s*\{/.test(txt)) throw new Error(JSON.parse(txt).error || 'خطأ في القراءة');
      const res = importText(coll, txt, l.tab, l); l.lastPull = new Date().toISOString(); l.lastRes = res; global.Store.save(); return res;
    }
    try { const r = await fetch(gviz(l.id, l.tab)); if (r.ok) txt = await r.text(); } catch (e) { /* مش عام أو مفيش نت */ }
    // الشيت مش «أي حد معاه اللينك» ← نقراه عن طريق سكربت حسابك (قراءة بس)
    if (!txt || /^\s*</.test(txt)) { const t = S().twoWay || {}; if (!t.url) throw new Error('الشيت مش متاح للقراءة — خليه «أي حد معاه اللينك يقدر يشوف» أو اربط سكربت المزامنة'); const r2 = await fetch(t.url + '?action=read&secret=' + encodeURIComponent(t.secret) + '&id=' + encodeURIComponent(l.id) + '&tab=' + encodeURIComponent(l.tab || '')); txt = await r2.text(); if (/^\s*\{/.test(txt)) throw new Error(JSON.parse(txt).error || 'خطأ في القراءة'); }
    const res = importText(coll, txt, l.tab); l.lastPull = new Date().toISOString(); l.lastRes = res; global.Store.save(); return res;
  }
  // مع كل مزامنة: الصفحات المربوطة بتتقري (قراءة بس — الشيت مش بيتعدّل)
  const baseSync = X.sync;
  X.sync = async function () { const r = await baseSync.apply(this, arguments); for (const c of Object.keys(links())) { if (c === 'assets' || !links()[c].auto) continue; try { await pullLink(c); } catch (e) { console.warn('sheet link', c, e); } } return r; };

  // ---------- النافذة ----------
  function open() {
    const page = (R.current().page || ''), m = MAP[page];
    const all = Object.entries(links());
    const overview = `<h4>كل الصفحات المربوطة (${all.length + 1})</h4><table class="tbl compact"><tbody><tr><td>الأجهزة</td><td>شيت الجرد</td><td>${X.tw && X.tw() ? '<span class="badge b-good">في الاتجاهين</span>' : '<span class="badge b-info">قراءة</span>'}</td></tr>${all.map(([c, l]) => `<tr><td>${esc(l.title || c)}</td><td><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.tab || 'أول تاب')}</a></td><td>${l.lastPull ? 'آخر قراءة ' + esc(X.ago(l.lastPull)) : '—'}</td></tr>`).join('')}</tbody></table>`;
    if (!m) return UI.modal({ title: '🔗 ربط الشيتات', body: overview + '<p class="muted small">افتح أي صفحة فيها بيانات (الأجهزة، الشرائح، الموظفين، الإيميلات، المشتريات…) ودوس «🔗 ربط الشيتات» عشان تربطها بشيت أو تستورد/تصدّر.</p>' });
    const [coll, title] = m;
    if (coll === 'assets') {
      return UI.modal({ title: '🔗 ' + title + ' ↔ شيت الجرد', body: `<p>الأجهزة مربوطة بشيت الجرد: <b>${X.tw && X.tw() ? 'في الاتجاهين — أي تعديل هنا أو في الشيت بيوصل للتاني' : 'قراءة من الشيت'}</b>.</p>
        <p class="small"><a href="https://docs.google.com/spreadsheets/d/${esc(S().sheetId || '')}" target="_blank" rel="noopener">📄 فتح شيت الجرد</a> · آخر مزامنة: ${esc(S().lastSync ? X.ago(S().lastSync) : '—')} · إعدادات الاتجاهين من <a href="#/itsettings">الربط والأتمتة</a></p>`,
        extraButtons: '<button class="btn primary" data-s="sync">🔄 زامن دلوقتي</button><button class="btn" data-s="exp">⬇ تصدير الأجهزة</button>',
        onOpen: md => { md.el.querySelector('[data-s=sync]').onclick = () => X.sync(true).then(() => R.render()); md.el.querySelector('[data-s=exp]').onclick = () => exportColl('assets', title); } });
    }
    const l = links()[coll] || {};
    UI.modal({ title: '🔗 ربط «' + title + '» بشيت', wide: true, saveLabel: 'حفظ الربط', body: `<div class="grid2">
        ${UI.field({ label: 'لينك شيت Google', name: 'url', value: l.url || '', attrs: 'dir="ltr" placeholder="https://docs.google.com/spreadsheets/d/…"', full: true })}
        ${UI.field({ label: 'اسم التاب', name: 'tab', value: l.tab || '', placeholder: 'فاضي = أول تاب' })}
        ${UI.field({ label: 'اقرا منه تلقائي مع كل مزامنة', name: 'auto', type: 'checkbox', value: l.auto !== false })}</div>
        <p class="muted small">الشيت لازم يبقى «أي حد معاه اللينك يقدر يشوف». النظام بيقرا منه بس (مش بيكتب فيه). أسماء الأعمدة: نزّل «قالب الشيت» وابدأ منه، أو صدّر البيانات وعدّل عليها.</p>
        ${l.lastPull ? `<p class="small">آخر قراءة: ${esc(X.ago(l.lastPull))} · +${(l.lastRes || {}).added || 0} جديد · ${(l.lastRes || {}).updated || 0} اتحدّث</p>` : ''}
        <div class="actions" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="btn" data-s="pull">⬇ استيراد دلوقتي من اللينك</button><label class="btn">⬇ استيراد من ملف CSV<input type="file" accept=".csv,text/csv" data-s="file" hidden></label>
        <button type="button" class="btn" data-s="exp">⬆ تصدير ${esc(title)} (${(DB[coll] || []).length})</button><button type="button" class="btn ghost" data-s="tpl">📄 قالب الشيت</button>${l.url ? '<button type="button" class="btn ghost danger" data-s="unlink">فك الربط</button>' : ''}</div>
        ${overview}`,
      onOpen: md => {
        const save = () => { const d = UI.form(md.el), id = sheetIdOf(d.url); if (!id) throw new Error('اللينك مش لينك شيت Google'); links()[coll] = Object.assign({}, links()[coll] || {}, { url: d.url.trim(), id, tab: (d.tab || '').trim(), auto: !!d.auto, title }); global.Store.save(); };
        md.el.querySelector('[data-s=pull]').onclick = async () => { try { save(); const r = await pullLink(coll); UI.toast('✓ اتقرا: +' + (r.added || 0) + ' جديد · ' + (r.updated || 0) + ' اتحدّث' + (r.errors ? ' · ' + r.errors + ' أخطاء (صفحة أخطاء المزامنة)' : '')); md.close(); R.render(); } catch (e) { UI.toast(e.message, 'err'); } };
        md.el.querySelector('[data-s=exp]').onclick = () => exportColl(coll, title);
        md.el.querySelector('[data-s=tpl]').onclick = () => exportColl(coll, title, true);
        const un = md.el.querySelector('[data-s=unlink]'); if (un) un.onclick = () => { delete links()[coll]; global.Store.save(); md.close(); UI.toast('اتفك الربط'); };
        const f = md.el.querySelector('[data-s=file]'); f.onchange = () => { const file = f.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { try { const r = importText(coll, rd.result); UI.toast('✓ اتستورد: +' + (r.added || 0) + ' جديد · ' + (r.updated || 0) + ' اتحدّث'); md.close(); R.render(); } catch (e) { UI.toast(e.message, 'err'); } }; rd.readAsText(file, 'utf-8'); };
      },
      onSave: md => { const d = UI.form(md.el); const id = sheetIdOf(d.url); if (!d.url) return; if (!id) throw new Error('اللينك مش لينك شيت Google'); links()[coll] = Object.assign({}, links()[coll] || {}, { url: d.url.trim(), id, tab: (d.tab || '').trim(), auto: !!d.auto, title }); global.Store.save(); UI.toast('اتحفظ الربط — هيتقري مع كل مزامنة'); } });
  }
  X.openSheetLinks = open;

  // الزرار في كل صفحة (جنب أزرار الصفحة)
  const baseRender = R.render;
  R.render = function () {
    baseRender.apply(this, arguments);
    const h = document.querySelector('#main .page-head'); if (!h || h.querySelector('[data-sheetlink]')) return;
    const m = MAP[R.current().page], linked = m && (m[0] === 'assets' || links()[m[0]]);
    const btn = `<button class="btn ghost" data-sheetlink title="ربط الصفحة دي بشيت Google · استيراد وتصدير">🔗 ربط الشيتات${linked ? ' <span class="badge b-good">✓</span>' : ''}</button>`;
    let a = h.querySelector('.actions'); if (!a) { h.insertAdjacentHTML('beforeend', '<div class="actions"></div>'); a = h.querySelector('.actions'); }
    a.insertAdjacentHTML('afterbegin', btn);
    a.querySelector('[data-sheetlink]').addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); open(); });
  };
})(window);
