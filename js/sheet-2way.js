/* =========================================================
   sheet-2way.js — مزامنة الشيت في الاتجاهين (وضع تجربة)
   • الشغل بيتم على "نسخة تجريبية" من شيت الجرد بس — الشيت الأصلي بيفضل قراءة بس ومش بيتكتب فيه أبدًا.
   • تعديل في النسخة ← يظهر في النظام مع المزامنة (كل 5 دقايق أو "زامن دلوقتي").
   • تعديل في النظام (تسليم/استلام/قسم/سريال/ملحقات/حالة…) ← يتبعت للنسخة على طول.
   • لو نفس الصف اتعدل في الشيت بعد آخر قراءة ← "تعارض" (مش بنكتب فوقه) وانت تختار.
   • من غير نت ← التعديل بيستنى في طابور وبيتبعت أول ما النت يرجع.
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, UI = global.UI, P = global.Pages, X = global.ITX, Fin = global.Fin;
  const esc = s => U.esc(s);
  const S = () => X.settings();
  const Q = () => (DB.twQueue = DB.twQueue || []);
  const me = () => X.me().name || 'النظام';
  const render = () => global.Router && global.Router.render();

  X.tw = () => { const t = S().twoWay || {}; return t.on && t.url && t.secret ? t : null; };

  // ---------- النظام ← خانات الشيت (بنفس أسماء أعمدة الشيت) ----------
  const hdr = field => { const head = X._twHead || [], al = (X.COLS[field] || []).map(a => a.toLowerCase()); return head.find(h => al.includes(String(h).trim().toLowerCase())); };
  const statusToSheet = a => { const cur = a.sheetStatus || '';
    if (a.status === 'assigned') return 'مستخدم';
    if (a.status === 'repair') return /صيان/.test(cur) ? cur : 'تحت الصيانة';
    if (['ready', 'reserved'].includes(a.status)) return /^خال/.test(cur) ? cur : 'خالي';
    if (['stock', 'wipe'].includes(a.status)) return /^مخزن|تالف/.test(cur) ? cur : 'مخزن';
    return cur || 'تالف'; };
  X.twSet = function (a) {
    const set = {}, put = (f, v) => { const h = hdr(f); if (h) set[h] = v == null ? '' : v; };
    put('sheetStatus', statusToSheet(a)); put('holderName', a.holderId ? X.nm(a.holderId) : ''); put('dept', a.dept || '');
    put('serial', a.serial || ''); put('monitor', a.monitor || ''); put('monitorSerial', a.monitorSerial || '');
    put('device', a.type === 'mobile' ? (a.model || '') : (a.specs || ''));
    X.ACC.forEach(([k]) => { if ((a.acc || {})[k] !== undefined) put(k, !!a.acc[k]); });
    return set;
  };
  // آخر حالة شفناها: تفسير النظام (_twLast) + القيم الخام زي ما هي في الشيت (_twRaw) — الخام بيتبعت "base" لكشف التعارض
  const snapshot = () => {
    const all = X.csv2D(X._twRawTxt || ''), hd = (all[0] || []).map(h => String(h).trim()), al = (X.COLS.code || []).map(x => x.toLowerCase()), ci = hd.findIndex(h => al.includes(h.toLowerCase())), raw = {};
    if (ci >= 0) all.slice(1).forEach(r => { raw[String(r[ci] || '').trim().toUpperCase()] = r; });
    DB.assets.forEach(a => { const set = X.twSet(a), row = raw[String(a.tag || '').toUpperCase()], rv = {}; a._twLast = JSON.stringify(set); if (row) Object.keys(set).forEach(h => { const i = hd.indexOf(h); if (i >= 0) rv[h] = row[i]; }); a._twRaw = JSON.stringify(rv); });
  };

  // ---------- طابور التعديلات ----------
  // جهاز جديد اتسجل من السيستم ← صف في شيت الجرد (يملا الكود المحجوز الفاضي أو يزود صف)
  X.twAppendVals = function (a) {
    const v = X.twSet(a), put = (f, val) => { const h = hdr(f); if (h) v[h] = val == null ? '' : val; };
    const co = (S().companies || []).find(c => c.name === a.company) || (S().companies || [])[0] || {};
    put('code', a.tag); put('type', X.catCode(a)); put('company', co.code || a.company || '');
    put('device', [a.brand, a.model, a.specs].filter(Boolean).join(' / ') || '');
    if (a.type === 'monitor' && a.monitor) put('monitor', a.monitor);
    return v;
  };
  X.twQueue = function (a) {
    if (!X.tw() || !a || !a.tag) return;
    if (!a._twLast && a.source === 'system' && !a.inSheet) {
      if (!Q().some(q => q.op === 'append' && q.tag === a.tag)) Q().push({ id: U.uid(), op: 'append', tag: a.tag, set: X.twAppendVals(a), at: new Date().toISOString(), by: me(), status: 'pending' });
      else Object.assign(Q().find(q => q.op === 'append' && q.tag === a.tag), { set: X.twAppendVals(a) });
      global.Store.save(); setTimeout(() => X.twFlush(true), 30); return;
    }
    if (!a._twLast) return;
    const cur = X.twSet(a), last = JSON.parse(a._twLast), diff = {};
    Object.keys(cur).forEach(k => { if (String(cur[k]) !== String(last[k])) diff[k] = cur[k]; });
    if (!Object.keys(diff).length) return;
    const raw = JSON.parse(a._twRaw || '{}'), baseVals = {}; Object.keys(diff).forEach(k => { baseVals[k] = k in raw ? raw[k] : last[k]; });
    const ex = Q().find(q => q.tag === a.tag && q.status !== 'conflict');
    if (ex) { Object.assign(ex.set, diff); Object.keys(baseVals).forEach(k => { if (!(k in (ex.baseVals = ex.baseVals || {}))) ex.baseVals[k] = baseVals[k]; }); }
    else Q().push({ id: U.uid(), tag: a.tag, base: a.rowVersion || null, baseVals, set: diff, at: new Date().toISOString(), by: me(), status: 'pending' });
    a._twLast = JSON.stringify(cur); global.Store.save();
    setTimeout(() => X.twFlush(true), 30);
  };
  const post = async body => { const t = X.tw(); const r = await fetch(t.url, { method: 'POST', body: JSON.stringify(Object.assign({ secret: t.secret }, body)) }); return r.json(); };
  X.twFlush = async function (thenSync) {
    if (!X.tw() || X._twBusy) return; X._twBusy = true; let sent = 0;
    try {
      for (const q of Q().filter(x => x.status !== 'conflict')) {
        try {
          if (q.op === 'append') {
            const ra = await post({ action: 'append', key: q.tag, values: q.set, by: q.by }); X._twOffline = false;
            if (ra.ok) { DB.twQueue = Q().filter(x => x !== q); const a = DB.assets.find(x => x.tag === q.tag); if (a) a.inSheet = true; sent++; X.event('➕ ' + q.tag + ' اتكتب في شيت الجرد (' + (ra.mode === 'filled' ? 'في الكود المحجوز' : 'صف جديد') + ')', { kind: 'sync', ref: q.tag }); }
            else Object.assign(q, { status: 'error', error: ra.error === 'code_taken' ? 'الكود ده مستخدم في الشيت لجهاز تاني' : (ra.error || 'خطأ') });
            continue;
          }
          const res = await post({ action: 'upsert', key: q.tag, base: q.force ? null : q.base, baseVals: q.baseVals || {}, force: !!q.force, set: q.set, by: q.by });
          X._twOffline = false;
          if (res.ok) { DB.twQueue = Q().filter(x => x !== q); const a = DB.assets.find(x => x.tag === q.tag); if (a) a.rowVersion = String(res.version); sent++; X.event('اتبعت للنسخة التجريبية: ' + q.tag + ' (' + Object.keys(q.set).join('، ') + ')', { kind: 'sync', ref: q.tag }); }
          else if (res.conflict) { Object.assign(q, { status: 'conflict', current: res.current, version: res.version }); X.event('تعارض في ' + q.tag + ': الصف اتعدل في الشيت بعد آخر قراءة', { kind: 'sync', ref: q.tag }); }
          else Object.assign(q, { status: 'error', error: res.error || 'خطأ' });
        } catch (e) { q.status = 'pending'; q.error = 'Offline'; X._twOffline = true; break; }
      }
    } finally { X._twBusy = false; global.Store.save(); }
    if (sent && thenSync) X.sync(false).then(render);
    else if (thenSync) render();
  };
  X.twResolve = function (id, how) {
    const q = Q().find(x => x.id === id); if (!q) return;
    if (how === 'sheet') { DB.twQueue = Q().filter(x => x !== q); global.Store.save(); X.sync(true).then(render); }
    if (how === 'mine') { Object.assign(q, { status: 'pending', force: true }); X.twFlush(true); }
  };
  X.twStatus = function () {
    if (!X.tw()) return { k: 'off', t: 'المزامنة في الاتجاهين مقفولة — الشيت قراءة بس', c: 'muted' };
    const c = Q().filter(q => q.status === 'conflict').length, e = Q().filter(q => q.status === 'error').length, p = Q().filter(q => q.status === 'pending').length;
    if (X._twOffline) return { k: 'offline', t: 'Offline — ' + p + ' تعديل مستني النت', c: 'warn' };
    if (c) return { k: 'conflict', t: c + ' تعارض محتاج قرار', c: 'bad' };
    if (e) return { k: 'error', t: e + ' خطأ في الإرسال', c: 'bad' };
    if (p) return { k: 'pending', t: p + ' تعديل بيتبعت…', c: 'info' };
    return { k: 'ok', t: 'متزامن مع النسخة التجريبية', c: 'good' };
  };
  X.twChip = () => { const s = X.twStatus(); return s.k === 'off' ? '' : `<a href="#/itsettings" class="badge b-${s.c}" style="margin-inline-start:8px">🔁 ${esc(s.t)}</a>`; };

  // كل حفظ لجهاز من النظام ← يتبعت (لو وضع التجربة شغال)
  const baseUp = global.Core.upsert;
  global.Core.upsert = function (coll, obj) { const r = baseUp.apply(this, arguments); if (coll === 'assets' && !X._twMute) try { X.twQueue(r || obj); } catch (e) { console.error(e); } return r; };
  // بعد كل مزامنة: نحفظ آخر حالة شفناها من الشيت (عشان نبعت الفرق بس)
  const baseSync = X.sync;
  X.sync = async function () { const r = await baseSync.apply(this, arguments); if (X.tw() && r && r.assets && !r.assets.error && !r.assets.skipped) snapshot(); return r; };
  global.addEventListener('online', () => { X._twOffline = false; X.twFlush(true); });
  // وضع الاتجاهين: نقرا الشيت كل دقيقة (بدل 5) عشان تعديل الشيت يوصل بسرعة
  setInterval(() => { if (X.tw() && !X._twBusy && document.visibilityState === 'visible') X.sync(false).then(() => { const busy = document.querySelector('.modal-wrap') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)); if (!busy && (document.querySelector('[data-live]') || /#\/(assets|mobiles|asset\/|itsettings)/.test(location.hash))) render(); }).catch(() => {}); }, 60000);

  // ---------- التنبيهات على الجيميل (عن طريق نفس السكربت — بتتبعت لصاحبه بس) ----------
  const mailCfg = () => { const t = S().twoWay || {}, m = S().mailAlerts || {}; return m.on && t.url && t.secret ? Object.assign({ url: t.url, secret: t.secret }, m) : null; };
  X.mailAlerts = async function (items, test) {
    const m = mailCfg(); if (!m && !test) return null; const t = S().twoWay || {};
    const site = location.protocol === 'https:' ? location.origin + location.pathname : 'https://tp-it-assets.web.app/it.html';
    const r = await fetch(t.url, { method: 'POST', body: JSON.stringify({ secret: t.secret, action: 'mail', test: !!test, site, items: items.map(a => ({ key: a.key, title: a.title, code: a.code, sev: a.sev, link: a.link })) }) });
    return r.json();
  };
  const baseDispatch = X.dispatchAlerts;
  X.dispatchAlerts = function () {
    const before = new Set((DB.alertsSent || []).map(x => x.key)), n = baseDispatch.apply(this, arguments), m = mailCfg();
    if (n && m) {
      const fresh = X.alerts().filter(a => !before.has(a.key) && (!m.urgentOnly || a.sev === 'urgent'));
      if (fresh.length) X.mailAlerts(fresh).then(r => { if (r && r.ok && r.sent) X.event('📧 اتبعت ' + r.sent + ' تنبيه على الجيميل', { kind: 'sync' }); }).catch(() => {});
    }
    return n;
  };

  // التعبئة الأولى: النظام بيقرا الشيت الأصلي (قراءة بس) ويبعته للنسخة التجريبية
  X.twSeed = async function (force) {
    const tab = (S().sheetTabs || {}).assets; if (!S().sheetId || !tab) throw new Error('ID الشيت الأصلي مش متحدد');
    const r = await fetch(X.sheetUrl(tab, 'assets')); if (!r.ok) throw new Error('قراءة الأصلي: HTTP ' + r.status);
    const rows = X.csv2D(await r.text()); if (rows.length < 2) throw new Error('الشيت الأصلي فاضي');
    return post({ action: 'seed', rows, force: !!force, by: me() });
  };

  // ---------- الإعدادات ----------
  const baseSettings = P.itsettings;
  if (baseSettings) P.itsettings = function (el) {
    baseSettings(el);
    const t = S().twoWay || {}, st = X.twStatus(), q = Q();
    el.insertAdjacentHTML('afterbegin', `<div class="panel" style="border:2px solid var(--accent, #c94f08);margin-bottom:14px"><div class="panel-head"><div><h2>🔁 مزامنة شيت الجرد في الاتجاهين</h2>
      <p class="muted small">تعديل في الشيت ← يوصل للنظام خلال دقيقة · تعديل في النظام (تسليم/استلام/حالة/قسم/سريال/ملحقات) ← يتكتب في الشيت على طول. قبل أول كتابة بتتعمل نسخة كاملة من الشيت على الدرايف، وكل كتابة بتتسجل في شيت سجل منفصل، ولو الخانة اتغيرت في الشيت بعد ما النظام قراها ← "تعارض" وانت تختار. اقفلها ← النظام يرجع يقرا بس.</p>
      ${t.info ? `<p class="small">📄 ${esc(t.info.sheet || '')} · ${t.info.backup ? `<a href="${esc(t.info.backup)}" target="_blank" rel="noopener">🛟 النسخة الاحتياطية</a>` : ''} · ${t.info.log ? `<a href="${esc(t.info.log)}" target="_blank" rel="noopener">📜 سجل الكتابة</a>` : ''}${t.info.form ? ` · <a href="${esc(t.info.form)}" target="_blank" rel="noopener">🧑‍💼 استمارة التقديم (QR)</a>` : ''}</p>` : ''}</div><span class="badge b-${st.c}">${esc(st.t)}</span></div>
      <div class="grid2">${UI.field({ label: 'رابط الـ Web app (Apps Script)', name: 'tw_url', value: t.url || '', attrs: 'dir="ltr"', placeholder: 'https://script.google.com/macros/s/…/exec', full: true })}
        ${UI.field({ label: 'الـ Secret', name: 'tw_secret', value: t.secret || '', attrs: 'dir="ltr" autocomplete="off"' })}
        ${UI.field({ label: 'تشغيل المزامنة في الاتجاهين', name: 'tw_on', type: 'checkbox', value: !!t.on })}
        ${UI.field({ label: '📧 ابعت التنبيهات على الجيميل بتاعي (صاحب السكربت)', name: 'ml_on', type: 'checkbox', value: !!(S().mailAlerts || {}).on })}
        ${UI.field({ label: 'العاجل بس (🔴) — من غير "قريب"', name: 'ml_urgent', type: 'checkbox', value: !!(S().mailAlerts || {}).urgentOnly })}</div>
      <div class="actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn primary" data-tw="save">حفظ</button><button class="btn" data-tw="ping">🔌 اختبار الاتصال</button><button class="btn ghost" data-tw="sync">🔄 زامن دلوقتي</button><button class="btn ghost" data-tw="mailtest">📧 إيميل تجربة</button><button class="btn ghost" data-tw="seed" title="للنسخة التجريبية بس">📥 تعبئة نسخة تجريبية</button></div>
      ${q.length ? `<h3>طابور التعديلات (${q.length})</h3>${UI.table({ rows: q, columns: [
        { label: 'الكود', render: x => `<b dir="ltr" class="mono">${esc(x.tag)}</b><div class="muted small">${esc(x.by || '')} · ${X.time(x.at)}</div>` },
        { label: 'التعديل', render: x => Object.entries(x.set).map(([h, v]) => `<div class="small">${esc(h)}: <b>${esc(String(v))}</b>${x.current && x.current[h] !== undefined && String(x.current[h]) !== String(v) ? ` <span class="t-bad">(الشيت: ${esc(String(x.current[h]))})</span>` : ''}</div>`).join('') },
        { label: 'الحالة', render: x => x.status === 'conflict' ? '<span class="badge b-bad">تعارض</span>' : x.status === 'error' ? `<span class="badge b-bad">${esc(x.error || 'خطأ')}</span>` : `<span class="badge b-info">${x.error === 'Offline' ? 'مستني النت' : 'بيتبعت'}</span>` },
        { label: '', render: x => x.status === 'conflict' || x.status === 'error' ? `<button class="link" data-twr="sheet" data-id="${x.id}">خلّي اللي في الشيت</button> <button class="link danger" data-twr="mine" data-id="${x.id}">اكتب تعديلي فوقه</button>` : '' }] })}` : ''}
      <p class="muted small">سجل كل تغيير (من النظام أو من الشيت) بيتكتب في تاب "سجل_التغييرات" جوه النسخة التجريبية.</p></div>`);
    const h = async e => {
      const b = e.target.closest('[data-tw],[data-twr]'); if (!b) return; e.stopPropagation(); e.preventDefault();
      if (b.dataset.twr) return X.twResolve(b.dataset.id, b.dataset.twr);
      const d = UI.form(el), k = b.dataset.tw;
      try {
        if (k === 'save') { const it = DB.itSettings = DB.itSettings || {}; const old = it.twoWay || {}, url = (d.tw_url || '').trim(); it.twoWay = { url, secret: (d.tw_secret || '').trim(), on: !!d.tw_on, info: old.url === url ? old.info : undefined }; it.mailAlerts = { on: !!d.ml_on, urgentOnly: !!d.ml_urgent }; global.Store.save(); UI.toast(it.twoWay.on ? 'اتحفظ — المزامنة في الاتجاهين شغالة مع شيت الجرد' : 'اتحفظ — شيت الجرد قراءة بس'); X.sync(false).then(render); }
        if (k === 'ping') { const r = await fetch((d.tw_url || '').trim() + '?secret=' + encodeURIComponent((d.tw_secret || '').trim())); const j = await r.json(); UI.toast(j.ok ? '✓ متصل — ' + (j.sheet ? j.sheet + ' · ' : '') + j.rows + ' صف' + (j.backup ? ' · النسخة الاحتياطية جاهزة' : '') : '✕ ' + j.error, j.ok ? 'ok' : 'err');
          if (j.ok && (j.backup || j.sheet)) { const it = DB.itSettings = DB.itSettings || {}; it.twoWay = Object.assign({}, it.twoWay || {}, { info: { sheet: j.sheet, backup: j.backup, log: j.log, form: j.formUrl } }); if (j.formUrl) it.formUrl = j.formUrl; /* الـ QR بيفتح استمارة التقديم */ global.Store.save(); render(); } }
        if (k === 'seed') { if (!X.tw()) throw new Error('احفظ الرابط والـ Secret وشغّل الوضع الأول'); let r = await X.twSeed(false); if (!r.ok && r.error === 'not_empty') { if (!confirm('النسخة التجريبية فيها ' + r.rows + ' صف — تمسحها وتعبيها من الأصلي تاني؟')) return; r = await X.twSeed(true); } if (!r.ok) throw new Error(r.error); UI.toast('اتعبت النسخة التجريبية: ' + r.rows + ' صف (الأصلي متلمسش)'); await X.sync(true); render(); }
        if (k === 'sync') { await X.sync(true); render(); }
        if (k === 'mailtest') { if (!(S().twoWay || {}).url) throw new Error('احفظ الرابط والـ Secret الأول'); const r = await X.mailAlerts([{ key: 'test-' + Date.now(), title: 'رسالة تجربة من النظام — التنبيهات هتوصلك هنا', sev: 'soon', link: '#/alerts' }], true); if (!r || !r.ok) throw new Error((r && r.error) || 'ما اتبعتش — شغّل authorize من السكربت تاني ووافق على إرسال الإيميل'); UI.toast('✓ اتبعت إيميل تجربة على ' + (r.to || 'الجيميل بتاعك')); }
      } catch (er) { UI.toast(er.message || String(er), 'err'); }
    };
    if (el._twH) el.removeEventListener('click', el._twH, true); el._twH = h; el.addEventListener('click', h, true);
  };

  // مؤشر الحالة في صفحات الأجهزة والموبايلات
  ['assets', 'mobiles', 'asset'].forEach(pg => { const base = P[pg]; if (base) P[pg] = function (el) { base.apply(this, arguments); const hd = el.querySelector('.page-head h1'); if (hd && X.tw()) hd.insertAdjacentHTML('beforeend', X.twChip()); }; });
})(window);
