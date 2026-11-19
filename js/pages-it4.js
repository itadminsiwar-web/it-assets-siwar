/* =========================================================
   pages-it4.js — الداشبورد النهائي + الأصول والاتصالات والاشتراكات والتشغيل
   نظرة عامة · مركز التجديدات · التنبيهات · الأجهزة · الموبايلات · الإكسسوارات والمستهلكات
   الصيانة والضمان · الجرد والسيريالات · باقات الإنترنت · التولات والتوكنات · الدومينات وSSL والهوستنج
   الأمان · الباك أب · الموردين والمشتريات · التكلفة · سجل الحركات · أخطاء المزامنة · المزامنة والإعدادات
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {}, X = global.ITX;
  const { $, $$ } = UI;
  const today = () => U.today();
  const esc = s => U.esc(s);
  const act = (a, id, label, cls) => `<button class="link ${cls || ''}" data-act="${a}" data-id="${id || ''}">${label}</button>`;
  const nm = id => X.nm(id);
  const opts = map => Object.entries(map).map(([k, v]) => ({ value: k, label: v[0] }));
  const badge = (map, s) => { const x = map[s] || Object.values(map)[0]; return `<span class="badge b-${x[1]}"><i>•</i>${x[0]}</span>`; };
  const CYC = { monthly: ['شهري', 1], quarterly: ['ربع سنوي', 3], yearly: ['سنوي', 12] };
  const perMonth = (cost, cur, cycle) => X.sar(cost, cur) / (CYC[cycle] || CYC.monthly)[1];
  const staffOpts = empty => [{ value: '', label: empty || '— اختر —' }].concat((DB.team || []).filter(m => !X.isExited(m)).map(m => ({ value: m.id, label: m.name + (m.dept ? ' · ' + m.dept : '') })));
  const COL = { used: 'var(--c-used)', stock: 'var(--c-stock)', ready: 'var(--c-ready)', repair: 'var(--c-repair)' };
  const hbar = (pct, cls, label) => `<span class="hbar ${cls || ''}" title="${esc(label || '')}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
  const daysChip = n => `<span class="dchip ${n <= 2 ? 'bad' : n <= 7 ? 'warn' : 'info'}"><b>${n}</b><small>يوم</small></span>`;
  function donut(parts, center, sub) {
    const tot = parts.reduce((a, p) => a + p.v, 0); let acc = 0; const R = 15.915;
    const segs = tot ? parts.filter(p => p.v).map(p => { const len = p.v / tot * 100, s = `<circle r="${R}" cx="18" cy="18" fill="none" stroke="${p.c}" stroke-width="3.6" stroke-dasharray="${len} ${100 - len}" stroke-dashoffset="${25 - acc}"/>`; acc += len; return s; }).join('') : '';
    return `<svg viewBox="0 0 36 36" class="donut" role="img" aria-label="${esc(center + ' ' + sub)}"><circle r="${R}" cx="18" cy="18" fill="none" stroke="var(--surface-2)" stroke-width="3.6"/>${segs}<text x="18" y="18.6" class="d1">${center}</text><text x="18" y="23.4" class="d2">${sub}</text></svg>`;
  }
  Fin.donut = donut; Fin.hbar = hbar;
  const live = () => DB.assets.filter(a => !['retired', 'lost'].includes(a.status));
  const bucket = a => ['assigned', 'reserved'].includes(a.status) ? 'used' : a.status === 'ready' ? 'ready' : a.status === 'repair' ? 'repair' : 'stock';
  const atVendor = a => { const r = DB.assetLog.filter(l => l.assetId === a.id && l.kind === 'repair').sort((x, y) => y.date.localeCompare(x.date))[0]; return !!(r && r.vendor && !/داخل/.test(r.vendor)); };
  const COMPUTERS = ['laptop', 'desktop'];

  // ---------- التكلفة الشهرية المتكررة (تولات · باقات · شرائح · تراخيص) مقسمة على الأقسام ----------
  Fin.monthlyCost = function () {
    const byCat = { 'تولات': 0, 'باقات': 0, 'شرائح': 0, 'تراخيص': 0, 'دومينات وهوستنج': 0 }, byDept = {}, rows = [];
    const add = (cat, sar, depts, name, code) => { if (!sar) return; byCat[cat] += sar; depts = depts.length ? depts : ['عام']; depts.forEach(d => { byDept[d] = byDept[d] || { total: 0 }; byDept[d].total += sar / depts.length; byDept[d][cat] = (byDept[d][cat] || 0) + sar / depts.length; }); rows.push({ cat, name, code, sar, depts }); };
    const deptsOf = users => Array.from(new Set((users || []).map(u => X.staff(u).dept).filter(Boolean)));
    DB.tools.filter(x => x.status !== 'cancelled').forEach(x => add('تولات', perMonth(x.cost, x.currency, x.cycle), x.dept ? [x.dept] : deptsOf(x.users), x.name, x.code));
    DB.netPackages.filter(x => x.status !== 'cancelled').forEach(x => add('باقات', perMonth(x.cost, x.currency, x.cycle), [], x.name, x.code));
    DB.lines.filter(l => !['cancelled', 'suspended'].includes(l.status)).forEach(l => add('شرائح', X.sar(l.cost, l.currency), l.holderId ? [X.staff(l.holderId).dept].filter(Boolean) : [], (Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number), l.code));
    DB.subscriptions.filter(s => ['active', 'trial'].includes(s.status)).forEach(s => add('تراخيص', perMonth(s.cost, s.currency, s.cycle), deptsOf(s.users), s.name, s.code));
    DB.domains.filter(x => x.status !== 'cancelled').forEach(x => add('دومينات وهوستنج', X.sar(x.cost, x.currency) / 12, [], x.name, x.code));
    Object.keys(byCat).forEach(k => byCat[k] = U.round(byCat[k]));
    return { byCat, byDept, rows, total: U.round(Object.values(byCat).reduce((a, b) => a + b, 0)) };
  };

  // ================= نظرة عامة (الداشبورد الرئيسي — التصور النهائي) =================
  P.itdash = function (el) {
    X.ensure();
    const sc = X.scope, s = X.settings(), t = today(), cos = s.companies;
    const L = live().filter(a => X.inScope(a, 'asset')), devs = L.filter(a => a.type !== 'accessory');
    const B = { used: devs.filter(a => bucket(a) === 'used'), stock: devs.filter(a => bucket(a) === 'stock'), ready: devs.filter(a => bucket(a) === 'ready'), repair: devs.filter(a => bucket(a) === 'repair') };
    const pct = n => devs.length ? Math.round(n / devs.length * 100) : 0;
    const alerts = X.alerts();
    const errs = DB.syncErrors.filter(e => e.status !== 'fixed').length;
    // الأجهزة لكل قسم
    const depts = {}; devs.forEach(a => { const d = X.deptOf(a); depts[d] = depts[d] || { used: 0, stock: 0, ready: 0, repair: 0, n: 0 }; depts[d][bucket(a)]++; depts[d].n++; });
    const dKeys = Object.keys(depts).sort((a, b) => (a === 'المخزن العام') - (b === 'المخزن العام') || depts[b].n - depts[a].n);
    const ren = X.renewals(30).filter(r => r.days >= 0).slice(0, 7);
    const tools = DB.tools.filter(x => x.status !== 'cancelled' && X.inScope(x)).map(x => ({ x, f: X.forecast('tool', x) }));
    // رحلة الموظف
    const C2 = DB.candidates, mStart = U.startOfMonth(t);
    const funnel = [['تقديم', C2.length], ['مقابلات', C2.filter(c => (c.interviews || []).length).length], ['مقبول', C2.filter(c => c.decision && c.decision.result === 'accepted').length], ['عرض اتبعت', C2.filter(c => c.offerSentAt).length], ['مباشرة محددة', C2.filter(c => c.joiningDate).length], ['نشط الشهر ده', C2.filter(c => c.status === 'active' && (c.activeAt || '') >= mStart).length]];
    const fMax = Math.max(1, ...funnel.map(f => f[1]));
    const onb = DB.cycles.filter(c => c.type === 'onboard' && c.status === 'open' && X.inScope(X.staff(c.empId), 'emp')).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const ready5 = c => { const it = c.items.filter(i => i.stage === 5); return it.every(i => i.done || i.skipped) ? 'ready' : X.days(c.date) <= 1 ? 'late' : 'prep'; };
    const RD = { ready: ['جاهز', 'good'], prep: ['جاري التجهيز', 'warn'], late: ['متأخر', 'bad'] };
    const off = DB.cycles.filter(c => c.type === 'offboard' && c.status === 'open' && X.inScope(X.staff(c.empId), 'emp')).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const offNote = c => { const st = X.cycleStage(c), cc = X.custodyCount(c.empId).assets, w = DB.assets.filter(a => a.status === 'wipe' && a.lastHolder === c.empId).length; return st <= 2 || (st === 3 && !c.items.some(i => i.stage === 3 && i.done)) ? 'الكشف اتولّد' : st === 3 ? (cc ? 'عهد لسه ' + cc : 'مستني الإقرار') : st === 4 ? (w ? 'مستني Wipe' : 'فك التجهيز') : X.OFF_STAGES.find(x => x.n === st).t; };
    const lastDay = n => n == null ? '' : n < 0 ? 'خرج ' + (n === -1 ? 'امبارح' : 'من ' + -n + ' يوم') : n === 0 ? 'آخر يوم النهارده' : n === 1 ? 'آخر يوم بكرة' : 'بعد ' + n + ' أيام';
    // الاتصالات
    const nets = DB.netPackages.filter(x => x.status !== 'cancelled' && X.inScope(x)).map(x => ({ x, f: X.forecast('net', x) }));
    const SA = DB.lines.filter(l => l.country === 'SA' && l.status !== 'cancelled' && X.inScope(l, 'line')), EG = DB.lines.filter(l => l.country === 'EG' && l.status !== 'cancelled' && X.inScope(l, 'line'));
    const simRow = l => { const n = X.days(l.renewDate); return `<div class="row-line"><span><span dir="ltr" class="mono">${esc(l.code || '')}</span> · ${esc(l.holderId ? X.staff(l.holderId).dept || '' : l.purpose || '')} · ${l.country === 'SA' ? 'باسم ' + esc(l.owner || 'الشركة') : esc(nm(l.holderId) || '—')}</span><b class="${n != null && n <= 2 ? 't-bad' : n != null && n <= 7 ? 't-warn' : ''}">${l.country === 'EG' && n != null && n <= 1 ? 'الشحن ' : ''}${X.inDays(n)}</b></div>`; };
    const nextSims = arr => arr.filter(l => l.renewDate).sort((a, b) => a.renewDate.localeCompare(b.renewDate)).slice(0, 3);
    const mobs = L.filter(a => a.type === 'mobile'), mobDept = {}; mobs.forEach(a => { const d = X.deptOf(a); mobDept[d] = (mobDept[d] || 0) + 1; });
    const mMax = Math.max(1, ...Object.values(mobDept));
    // الجرد
    const ss = X.stocktakeStats(), lastFull = X.lastFullStocktake();
    // دورة التعيين والإخلاء (ملخص)
    const at5 = onb.filter(c => X.cycleStage(c) === 5), late5 = onb.filter(c => ready5(c) === 'late');
    const docsWaiting = DB.itDocs.filter(d => ['unified', 'returnAck', 'annex'].includes(d.kind) && ['draft', 'printed', 'signed'].includes(d.status) && X.inScope(X.staff(d.empId), 'emp')).length;
    const offEarly = off.filter(c => X.cycleStage(c) <= 4).length;
    const leftWith = (DB.team || []).filter(m => X.isExited(m) && X.custodyCount(m.id).assets).length;
    const liveAcc = (DB.team || []).filter(m => X.isExited(m) && X.liveAccounts(m.id).length).length;
    // الأمان
    const comps = devs.filter(a => COMPUTERS.includes(a.type)), crit = DB.mailboxes.filter(b => b.critical && b.status === 'active');
    const bk = DB.backups.filter(b => b.status !== 'off'), bkOk = bk.filter(X.backupOk).length;
    const sec = [['الأنتي فيروس شغال', comps.length ? Math.round(comps.filter(a => a.av).length / comps.length * 100) : 0, '%'], ['تحديثات ويندوز محدثة', comps.length ? Math.round(comps.filter(a => a.patched).length / comps.length * 100) : 0, '%'], ['MFA على الحسابات المهمة', crit.length ? Math.round(crit.filter(b => b.mfa).length / crit.length * 100) : 0, '%'], ['الموبايلات على MDM', mobs.length ? Math.round(mobs.filter(a => a.mdm).length / mobs.length * 100) : 0, '%'], ['باك أب ناجح آخر 24 ساعة', bk.length ? Math.round(bkOk / bk.length * 100) : 0, bkOk + ' من ' + bk.length]];
    // الضمان والعمر
    const yrs = U.num(s.replaceYears) || 4;
    const warr30 = devs.filter(a => a.warrantyEnd && a.warrantyEnd >= t && a.warrantyEnd <= U.addDays(t, 30)).length;
    const oldOnes = devs.filter(a => a.purchaseDate && U.daysBetween(a.purchaseDate, t) >= yrs * 365).length;
    const lost = DB.assets.filter(a => a.status === 'lost').length, retired = DB.assets.filter(a => a.status === 'retired' && a.wipeCert).length;
    // التراخيص والدومينات
    const seatUse = x => ((x.users || []).length || U.num(x.usedSeats)) / (x.seats || 1e9);
    const lic = DB.subscriptions.filter(x => x.kind === 'license' && x.status !== 'cancelled').sort((a, b) => seatUse(b) - seatUse(a)).slice(0, 3);
    const av = DB.subscriptions.find(x => x.category === 'أمن وحماية' && /anti|virus|eset|kaspersky|defender|أنتي/i.test(x.name + ' ' + (x.plan || '')) && x.status !== 'cancelled');
    const doms = DB.domains.filter(x => x.kind === 'domain' && x.status !== 'cancelled'), ssl = DB.domains.filter(x => x.kind === 'ssl' && x.status !== 'cancelled');
    const nearest = arr => { const n = arr.map(x => X.days(x.expiry)).filter(v => v != null && v >= 0).sort((a, b) => a - b)[0]; return n == null ? '—' : n; };
    // المستهلكات والتكلفة
    const cons = DB.consumables.slice().sort((a, b) => (U.num(a.qty) < U.num(a.min) ? 0 : 1) - (U.num(b.qty) < U.num(b.min) ? 0 : 1)).slice(0, 3);
    const mc = Fin.monthlyCost();
    const brs = ((cos.find(c => c.name === sc.company) || {}).branches) || [].concat(...cos.map(c => c.branches));
    el.innerHTML = `<div class="page-head itx-head" data-live><div><h1 dir="ltr" style="text-align:right">Dashboard</h1><p class="sub">آخر مزامنة مع Google Sheets: <b>${s.lastSync ? X.ago(s.lastSync) : 'لسه متعملتش'}</b> · <a href="#/syncerr" class="${errs ? 't-warn' : ''}">${errs} أخطاء مزامنة</a></p></div>
      <div class="actions itx-filters"><label class="mini ${sc.company ? 'on' : ''}"><span class="fl-ic">🏢</span>${X.hasBranches() ? 'الشركة / الفرع' : X.coLabel()} <select data-sc="company"><option value="">${X.coAll()}</option>${cos.map(c => `<option ${sc.company === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        ${X.hasBranches() ? `<select data-sc="branch"><option value="">كل الفروع</option>${brs.map(b => `<option ${sc.branch === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>` : ''}
        <label class="mini ${sc.dept ? 'on' : ''}"><span class="fl-ic">🗂️</span>القسم <select data-sc="dept"><option value="">كل الأقسام</option>${X.allDepts().concat(['المخزن العام']).map(d => `<option ${sc.dept === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label></div></div>
      ${(() => { const urg = alerts.filter(a => a.sev === 'urgent'), soon = alerts.filter(a => a.sev !== 'urgent'), shown = urg.concat(soon).slice(0, 6);
        return `<div class="panel dx-alerts"><div class="dx-al-head"><b>🔔 التنبيهات</b><span class="dx-pill urgent">🔴 عاجل <b>${urg.length}</b></span><span class="dx-pill soon">🟠 قريب <b>${soon.length}</b></span><a class="dx-all" href="#/alerts">كل التنبيهات ←</a></div>
          ${shown.length ? `<div class="dx-al-list">${shown.map(a => `<a class="dx-al ${a.sev === 'urgent' ? 'urgent' : 'soon'}" href="${a.link}" title="${esc(a.title)}"><span class="dx-al-ic">${a.sev === 'urgent' ? '🔴' : '🟠'}</span><span class="dx-al-t">${esc(a.title)}</span>${a.code ? `<span class="dx-al-c mono" dir="ltr">${esc(a.code)}</span>` : ''}</a>`).join('')}</div>` : '<div class="muted small">مفيش تنبيهات 👌 كله تمام</div>'}</div>`; })()}
      ${(() => { const parts = [['used', 'مستخدم', B.used.length, ''], ['stock', 'مخزن', B.stock.length, devs.some(a => a.status === 'wipe') ? devs.filter(a => a.status === 'wipe').length + ' مستني مسح' : ''], ['ready', 'خالي / جاهز للتسليم', B.ready.length, ''], ['repair', 'في الصيانة', B.repair.length, B.repair.filter(atVendor).length + ' عند المورد']];
        const types = {}; devs.forEach(a => { const k = X.catCode(a) || 'أخرى'; types[k] = (types[k] || 0) + 1; });
        return `<div class="panel dx-kpi"><div class="dx-donut">${donut(parts.map(p => ({ v: p[2], c: COL[p[0]] })), String(devs.length), 'جهاز')}<small class="muted">${esc(sc.company || X.coAll())}${sc.branch ? ' · ' + esc(sc.branch) : ''}</small></div>
          <div class="dx-right"><div class="dx-stack" role="img" aria-label="توزيع الأجهزة حسب الحالة">${parts.filter(p => p[2]).map(p => `<i style="width:${pct(p[2])}%;background:${COL[p[0]]}" title="${p[1]}: ${p[2]} (${pct(p[2])}%)"></i>`).join('')}</div>
            <div class="dx-tiles">${parts.map(p => `<a class="dx-tile" href="#/assets" title="${p[1]}: ${p[2]} من ${devs.length}"><span class="dx-tl"><i class="dot" style="background:${COL[p[0]]}"></i>${p[1]}</span><b>${p[2]}</b><span class="dx-bar"><i style="width:${pct(p[2])}%;background:${COL[p[0]]}"></i></span><small class="muted">${pct(p[2])}%${p[3] ? ' · ' + esc(p[3]) : ''}</small></a>`).join('')}</div>
            <div class="dx-types">${Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="dx-type"><b>${n}</b> ${X.optChip ? X.optChip('cat', k, ' dir="ltr"') : esc(k)}</span>`).join('')}</div></div></div>`; })()}
      <div class="panel"><div class="panel-head"><div><h2>الأجهزة لكل قسم</h2><p class="muted small">النسبة المئوية من إجمالي أجهزة القسم · اضغط على قسم لعرض الأجهزة</p></div><div class="legend-row"><span><i class="dot" style="background:${COL.used}"></i>مستخدم</span><span><i class="dot" style="background:${COL.stock}"></i>مخزن</span><span><i class="dot" style="background:${COL.ready}"></i>خالي</span><span><i class="dot" style="background:${COL.repair}"></i>صيانة</span></div></div>
        <div class="dgrid">${dKeys.map(d => { const x = depts[d]; return `<a class="dcard" href="#/assets/${encodeURIComponent(d)}">${donut([{ v: x.used, c: COL.used }, { v: x.stock, c: COL.stock }, { v: x.ready, c: COL.ready }, { v: x.repair, c: COL.repair }], Math.round(x.used / x.n * 100) + '%', 'مستخدم')}<b>${esc(d)}</b><small>الإجمالي ${x.n} · مخزن ${x.stock} · خالي ${x.ready} · صيانة ${x.repair}</small></a>`; }).join('') || '<div class="empty">لا توجد أجهزة</div>'}</div></div>
      <div class="dash-grid">
        <div class="panel"><div class="panel-head"><h2>التجديدات القادمة (30 يوم)</h2><a class="small" href="#/renewals">عرض الكالندر</a></div>
          ${ren.map(r => `<a class="ren-row" href="${r.link}">${daysChip(r.days)}<div><b>${esc(r.title)}</b><small>${esc(r.kind)} · ${esc(r.sub || '')} · ${r.date}</small></div><span dir="ltr" class="mono">${esc(r.code || '')}</span></a>`).join('') || '<div class="empty">لا توجد تجديدات خلال 30 يوم</div>'}</div>
        <div class="panel"><div class="panel-head"><h2>التولات · المتبقي من التوكن</h2><span class="muted small">التوقع على متوسط استهلاك آخر 7 أيام</span></div>
          ${tools.map(({ x, f }) => `<a class="tok-row" href="#/tool/${x.id}"><div class="tok-top"><span><b>${esc(x.name)}</b> <span dir="ltr" class="mono">${esc(x.code)}</span></span><b class="t-${f.cls === 'good' ? 'good' : f.cls === 'warn' ? 'warn' : 'bad'}">${f.verdict}</b></div>${hbar(f.pct, f.cls)}<small>متبقي ${f.pct}% من ${X.fmtQty(f.quota)} · التجديد ${X.inDays(f.renewIn)} · <span dir="ltr">${esc(x.account || '')}</span></small></a>`).join('') || '<div class="empty">لا توجد تولات — <a href="#/tools">أضف تول</a></div>'}</div>
      </div>
      <div class="panel"><div class="panel-head"><div><h2>رحلة الموظف: التعيين والإخلاء</h2><p class="muted small">التعيين 0 – 8 · الإخلاء X1 – X9 بالعكس · كل عهدة مربوطة بكود الموظف</p></div><a class="small" href="#/onboard">فتح السيكل</a></div>
        <div class="tri">
          <div><h3>التوظيف من التقديم للمباشرة</h3>${funnel.map(f => `<div class="fun-row"><span>${f[0]}</span>${hbar(f[1] / fMax * 100, 'used')}<b>${f[1]}</b></div>`).join('')}<a class="small" href="#/cands">المرشحين والمقابلات</a></div>
          <div><h3>مباشرات قادمة · جاهزية IT</h3>${onb.slice(0, 4).map(c => { const m = X.staff(c.empId), r = RD[ready5(c)]; return `<a class="row-line" href="#/cycle/${c.id}"><span>${esc(m.name || '')} · ${esc(m.dept || '')} · ${X.inDays(X.days(c.date))}</span><span class="badge b-${r[1]}">${r[0]}</span></a>`; }).join('') || '<div class="muted small">لا توجد مباشرات قادمة</div>'}</div>
          <div><h3>إخلاءات مفتوحة · المرحلة الحالية</h3>${off.slice(0, 4).map(c => { const m = X.staff(c.empId), st = X.cycleStage(c); return `<a class="row-line" href="#/cycle/${c.id}"><span>${esc(m.name || '')} · ${esc(m.dept || '')} · ${lastDay(X.days(c.date))}</span><span class="badge b-${st <= 3 ? 'bad' : 'info'}">X${st} · ${esc(offNote(c))}</span></a>`; }).join('') || '<div class="muted small">لا توجد إخلاءات مفتوحة</div>'}</div>
        </div></div>
      <div class="tri-grid">
        <div class="panel"><div class="panel-head"><h2>باقات الإنترنت</h2><a class="small" href="#/net">الباقات</a></div>${nets.map(({ x, f }) => `<div class="tok-row"><div class="tok-top"><b>${esc(x.name)}</b><b class="t-${f.remaining <= Math.max(10, f.quota * .1) ? 'bad' : 'good'}">${Math.round(f.remaining)} جيجا متبقي</b></div>${hbar(f.remaining / (f.quota || 1) * 100, f.remaining <= Math.max(10, f.quota * .1) ? 'bad' : 'used')}<small>${Math.round(f.used)} من ${Math.round(f.quota)} جيجا · التجديد ${X.inDays(f.renewIn)} · <span dir="ltr">${esc(x.code)}</span></small></div>`).join('') || '<div class="empty">لا توجد باقات</div>'}</div>
        <div class="panel"><div class="panel-head"><h2>الشرائح</h2><span class="muted small">السعودية: ${SA.length} · المصرية: ${EG.length}</span></div>
          <h3 class="h3s">السعودية · مواعيد التجديد</h3>${nextSims(SA).map(simRow).join('') || '<div class="muted small">—</div>'}
          <h3 class="h3s">المصرية · مواعيد الشحن</h3>${nextSims(EG).map(simRow).join('') || '<div class="muted small">—</div>'}</div>
        <div class="panel"><div class="panel-head"><h2>الموبايلات على الأقسام</h2><span class="muted small">إجمالي ${mobs.length} · على MDM ${mobs.filter(a => a.mdm).length}</span></div>
          ${Object.entries(mobDept).sort((a, b) => b[1] - a[1]).map(([d, n]) => `<div class="fun-row"><span>${esc(d)}</span>${hbar(n / mMax * 100, 'stock')}<b>${n}</b></div>`).join('') || '<div class="empty">—</div>'}</div>
      </div>
      <div class="tri-grid">
        <div class="panel"><h2>مراجعة السيريالات (الجرد)</h2><div class="stk-box">${donut([{ v: ss.reviewed, c: COL.used }, { v: ss.total - ss.reviewed, c: 'var(--surface-2)' }], ss.pct + '%', '')}<div>
          <div>اتراجع <b>${ss.reviewed}</b> من <b>${ss.total}</b> جهاز</div><div class="t-bad">${ss.mismatch} سيريال مش مطابق للشيت</div><div class="t-warn">${ss.misplaced} أجهزة مش موجودة في مكانها</div><div class="muted small">آخر جرد كامل: ${lastFull ? (lastFull.closedAt || '').slice(0, 10) : '—'}</div><a class="small" href="#/stocktake">${ss.total && ss.pct < 100 ? 'كمّل الجرد' : 'ابدأ جرد جديد'}</a></div></div></div>
        <div class="panel"><div class="panel-head"><h2>سيكل التعيين والإخلاء</h2><a class="small" href="#/offboard">فتح</a></div>
          ${[['تجهيز IT قبل المباشرة (مرحلة 5)', at5.length, 'info', '#/onboard'], ['منهم متأخر عن ميعاده', late5.length, 'bad', '#/onboard'], ['إقرارات مستنية توقيع أو مسح (7)', docsWaiting, 'warn', '#/docs'], ['إخلاء مفتوح (X1 – X4)', offEarly, 'warn', '#/offboard'], ['عهد ماراجعتش من موظفين مشيوا', leftWith, 'bad', '#/staff'], ['حسابات شغالة لموظفين Exited', liveAcc, liveAcc ? 'bad' : 'good', '#/staff']].map(r => `<a class="row-line" href="${r[3]}"><span>${r[0]}</span><span class="badge b-${r[1] ? r[2] : 'good'}">${r[1]}</span></a>`).join('')}</div>
        <div class="panel"><div class="panel-head"><h2>الأمان والباك أب</h2><a class="small" href="#/security">الأمان</a></div>
          ${sec.map(r => `<div class="sec-row"><div><span>${r[0]}</span><b>${r[2] === '%' ? r[1] + '%' : r[2]}</b></div>${hbar(r[1], r[1] >= 90 ? 'used' : r[1] >= 75 ? 'warn' : 'bad')}</div>`).join('')}</div>
      </div>
      <div class="tri-grid">
        <div class="panel"><div class="panel-head"><h2>الضمان والصيانة وعمر الأجهزة</h2><a class="small" href="#/maint">الصيانة والضمان</a></div>
          ${[['ضمان ينتهي خلال 30 يوم', warr30 + ' أجهزة', warr30], ['في الصيانة الآن', B.repair.length + ' أجهزة', B.repair.length], ['وصلت لعمر الإحلال (+' + yrs + ' سنين)', oldOnes + ' جهاز', oldOnes], ['مفقود / مسروق', lost, lost], ['مكهّن بشهادة مسح داتا', retired, 0]].map(r => `<div class="row-line"><span>${r[0]}</span><b class="${r[2] ? 't-warn' : ''}">${r[1]}</b></div>`).join('')}</div>
        <div class="panel"><div class="panel-head"><h2>التراخيص والدومينات وSSL</h2><a class="small" href="#/domains">الدومينات</a></div>
          ${lic.map(x => { const u = (x.users || []).length || U.num(x.usedSeats); return `<a class="row-line" href="#/sub/${x.id}"><span>${esc(x.name)}</span><b class="${x.seats && u >= x.seats ? 't-warn' : ''}"><span dir="ltr">${u} / ${x.seats || '∞'}</span> مستخدمة</b></a>`; }).join('')}
          ${av ? `<div class="row-line"><span>الأنتي فيروس</span><b>ينتهي ${X.inDays(X.days(av.renewalDate))}</b></div>` : ''}
          <div class="row-line"><span>الدومينات</span><b>${doms.length} · أقربها ${nearest(doms) === '—' ? '—' : 'بعد ' + nearest(doms) + ' يوم'}</b></div>
          <div class="row-line"><span>شهادات SSL</span><b class="${nearest(ssl) !== '—' && nearest(ssl) <= 14 ? 't-warn' : ''}">${ssl.length} · أقربها ${nearest(ssl) === '—' ? '—' : 'بعد ' + nearest(ssl) + ' يوم'}</b></div></div>
        <div class="panel"><div class="panel-head"><h2>المستهلكات والتكلفة الشهرية</h2><a class="small" href="#/cost">التكلفة</a></div>
          ${cons.map(x => `<div class="row-line"><span>${esc(x.name)}</span><b class="${U.num(x.qty) < U.num(x.min) ? 't-bad' : ''}">${U.num(x.qty) < U.num(x.min) ? 'تحت الحد الأدنى' : x.qty + ' في المخزن'}</b></div>`).join('')}
          <div class="cost-big"><small>إجمالي المصروف المتكرر الشهري</small><b>${U.money(X.toCur(mc.total, 'EGP'), false)} ج.م</b><small>${X.cur() === 'EGP' ? '' : '≈ ' + U.money(mc.total, false) + ' ر.س · '}تولات · باقات · شرائح · تراخيص — <a href="#/cost">مقسم على الأقسام</a></small></div></div>
      </div>
      <p class="muted small center">الأرقام من بيانات النظام والشيتات المتزامنة — الحركات (تسليم، استلام، مسح، جرد) بتتسجل من النظام بس عشان سجل الحركات.</p>`;
    el.onchange = e => { const f = e.target.closest('[data-sc]'); if (!f) return; X.setScope(f.dataset.sc, f.value); if (f.dataset.sc === 'company') X.setScope('branch', ''); global.Router.render(); };
  };

  // ================= الأجهزة / الموبايلات =================
  function assetList(el, cfg) {
    const AS = Fin.ASTATUS, T = Fin.TYPES;
    // M02: ترتيب الأعمدة المعتمد (يمين ← شمال) + سريال الجهاز والشاشة (طلبك) · الألوان في شرائح الاختيارات بس
    const tick = (a, k) => { const v = (a.acc || {})[k]; return v === true ? '<span class="acc-y" title="موجود">✓</span>' : v === false ? '<span class="acc-n" title="مش موجود">✕</span>' : '<span class="muted">·</span>'; };
    const specCols = [
      { label: 'كود الأصل', render: a => `<a href="#/asset/${a.id}"><b dir="ltr" class="mono">${esc(a.tag)}</b></a>`, text: a => a.tag },
      { label: 'الفئة', render: a => X.optChip('cat', X.catCode(a), ` title="${esc((T[a.type] || T.other)[0])}" dir="ltr"`), text: a => X.catCode(a) },
      { label: X.coLabel(), render: a => X.optChip('company', X.companyOf(a)), text: a => X.companyOf(a) },
      { label: 'مواصفات الجهاز', render: a => `<b>${esc(Fin.assetName(a))}</b>${a.specs && Fin.assetName(a) !== a.specs ? `<div class="muted small" dir="ltr">${esc(a.specs)}</div>` : ''}${a.serial ? `<div class="small mono" dir="ltr">S/N ${esc(a.serial)}</div>` : ''}`, text: a => Fin.assetName(a) + (a.specs ? ' · ' + a.specs : '') },
      { label: 'الشاشة', render: a => { const ms = X.monitorsOf(a); return ms.length ? ms.map(m => `<div><b dir="ltr">${esc(m.size || '—')}</b> ${esc(m.brand || '')}${m.serial ? ` <span class="mono small muted" dir="ltr">${esc(m.serial)}</span>` : ''}</div>`).join('') + (ms.length > 1 ? `<small class="badge b-info">${ms.length} شاشات</small>` : '') : '<span class="muted">—</span>'; }, text: a => X.monitorsOf(a).map(m => [m.size, m.brand, m.serial].filter(Boolean).join(' ')).join(' / ') },
      { label: 'الحالة', render: a => X.optChip('status', X.sheetStatusOf(a)) + (X.techCond(a) !== 'غير محدد' ? `<div class="muted small">فنيًا: ${esc(X.techCond(a))}</div>` : ''), text: a => X.sheetStatusOf(a) },
      ...X.ACC.map(([k, n]) => ({ label: n, cls: 'acc-col', render: a => tick(a, k), text: a => (a.acc || {})[k] === true ? 'TRUE' : (a.acc || {})[k] === false ? 'FALSE' : '' })),
      { label: 'اسم الموظف', render: a => a.holderId ? `<a href="#/holder/${a.holderId}">${esc(nm(a.holderId))}</a>` : a.reservedFor ? `📌 ${esc(nm(a.reservedFor))}` : '<span class="muted">—</span>', text: a => nm(a.holderId) || '' },
      { label: 'PSWD', render: a => global.Vault && global.Vault.has('asset', a.id) ? '<span class="badge b-good" title="محفوظ في الخزنة المتشفّرة">🔒 محفوظ</span>' : '<span class="muted small">غير محفوظ</span>', text: a => global.Vault && global.Vault.has('asset', a.id) ? 'محفوظ' : 'غير محفوظ' }, // مؤشر بس — عمرنا ما بنصدّر باسورد
      { label: 'القسم', render: a => esc(X.deptOf(a)), text: a => X.deptOf(a) },
      { label: '', noExport: true, render: a => (global.Vault ? global.Vault.btn('asset', a.id) : '') + (['stock', 'ready'].includes(a.status) ? act('assign', a.id, '📤 تسليم') : a.status === 'assigned' ? act('return', a.id, '📥 استلام') : a.status === 'wipe' ? act('wipe', a.id, '🧽 مسح') : '') },
    ];
    UI.listPage(el, {
      title: cfg.title, subtitle: cfg.sub, csvName: cfg.csv,
      actions: '<button class="btn primary" data-act="new">+ ' + (cfg.only === 'mobile' ? 'موبايل' : 'جهاز') + '</button>',
      filters: [
        cfg.only ? null : { key: 'type', options: [{ value: '', label: 'كل الأنواع' }].concat(Object.entries(T).filter(([k]) => !['mobile', 'accessory'].includes(k)).map(([k, v]) => ({ value: k, label: v[1] + ' ' + v[0] }))) },
        { key: 'status', options: [{ value: 'live', label: 'الأجهزة الحالية' }, { value: '', label: 'كل الحالات' }].concat(opts(AS)) },
        { key: 'sst', label: 'حالة الشيت', options: [{ value: '', label: 'حالة الشيت (السبعة)' }].concat(X.SHEET_ST) },
        { key: 'dept', options: [{ value: '', label: 'كل الأقسام' }].concat(X.allDepts(), ['المخزن العام']) },
        { key: 'company', options: [{ value: '', label: X.hasBranches() ? 'كل الشركات / الفروع' : X.coAll() }].concat(...X.settings().companies.map(c => [{ value: 'c:' + c.name, label: c.name }].concat(c.branches.map(b => ({ value: 'b:' + b, label: '— ' + b }))))) },
      ].filter(Boolean),
      initial: { status: 'live', dept: cfg.dept || '' },
      rows: s => DB.assets.filter(a => cfg.match(a) && (!s.sst || X.sheetStatusOf(a) === s.sst) && (!s.type || a.type === s.type) && (!s.dept || X.deptOf(a) === s.dept) && (!s.company || (s.company.startsWith('c:') ? X.companyOf(a) === s.company.slice(2) : X.branchOf(a) === s.company.slice(2))) && (s.status === 'live' ? !['retired', 'lost'].includes(a.status) : (!s.status || a.status === s.status))).sort((a, b) => (a.tag || '').localeCompare(b.tag || '')),
      searchText: a => [a.tag, a.brand, a.model, a.serial, a.monitorSerial, a.monitor, a.monitorBrand, nm(a.holderId), a.specs, X.deptOf(a), X.companyOf(a)].join(' '),
      summary: rows => `<div class="cards mk-cards"><div class="card"><span>العدد</span><b>${rows.length}</b></div><div class="card"><span>مستخدم</span><b>${rows.filter(a => bucket(a) === 'used').length}</b></div><div class="card"><span>خالي / جاهز</span><b class="t-good">${rows.filter(a => a.status === 'ready').length}</b></div><div class="card"><span>مستني المسح</span><b class="${rows.some(a => a.status === 'wipe') ? 't-warn' : ''}">${rows.filter(a => a.status === 'wipe').length}</b></div><div class="card"><span>على MDM</span><b>${rows.filter(a => a.mdm).length}</b></div><div class="card"><span>القيمة (${X.curSym()})</span><b>${U.money(U.sum(rows, a => X.sar(a.cost, a.currency)), false)}</b></div></div>`,
      empty: 'لا توجد أجهزة',
      columns: cfg.only !== 'mobile' ? specCols : [
        { label: 'الكود', render: a => `<a href="#/asset/${a.id}"><b dir="ltr" class="mono">${esc(a.tag)}</b></a>`, text: a => a.tag },
        { label: 'الجهاز', render: a => `${(T[a.type] || T.other)[1]} <b>${esc(Fin.assetName(a))}</b>${a.specs && Fin.assetName(a) !== a.specs ? `<div class="muted small" dir="ltr">${esc(a.specs)}</div>` : ''}`, text: a => Fin.assetName(a) + (a.specs ? ' · ' + a.specs : '') },
        { label: cfg.only === 'mobile' ? 'IMEI / السريال' : 'سريال الجهاز', render: a => a.serial ? `<span dir="ltr" class="mono small">${esc(a.serial)}</span>` : '<span class="muted">—</span>', text: a => a.serial || '' },
        ...(cfg.only === 'mobile' ? [] : [
          { label: 'الشاشة', render: a => a.monitor || a.monitorBrand ? `<b dir="ltr">${esc(a.monitor || '')}</b> ${esc(a.monitorBrand || '')}` : '<span class="muted">—</span>', text: a => [a.monitor, a.monitorBrand].filter(Boolean).join(' ') },
          { label: 'سريال الشاشة', render: a => a.monitorSerial ? `<span dir="ltr" class="mono small">${esc(a.monitorSerial)}</span>` : '<span class="muted">—</span>', text: a => a.monitorSerial || '' }]),
        { label: 'مع', render: a => a.holderId ? `<a href="#/holder/${a.holderId}">${esc(nm(a.holderId))}</a>` : a.reservedFor ? `📌 محجوز لـ <a href="#/holder/${a.reservedFor}">${esc(nm(a.reservedFor))}</a>` : '<span class="muted">—</span>', text: a => nm(a.holderId) || nm(a.reservedFor) },
        { label: 'القسم', render: a => esc(X.deptOf(a)), text: a => X.deptOf(a) },
        { label: X.hasBranches() ? 'الشركة / الفرع' : X.coLabel(), render: a => `<span class="small">${esc(X.companyOf(a))}${X.branchOf(a) ? '<div class="muted">' + esc(X.branchOf(a)) + '</div>' : ''}</span>`, text: a => X.companyOf(a) + ' ' + X.branchOf(a) },
        ...(cfg.only === 'mobile' ? [{ label: 'الشريحة', render: a => { const ls = DB.lines.filter(x => x.phoneTag === a.tag && x.status !== 'cancelled'); return ls.length ? ls.map(l => `<div><span dir="ltr" class="mono small">${esc(l.code || '')}</span> <small class="muted" dir="ltr">${esc(Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number)}</small></div>`).join('') : '—'; }, text: a => DB.lines.filter(x => x.phoneTag === a.tag).map(l => l.code).join(' ') }] : []),
        { label: 'الحالة', render: a => badge(AS, a.status), text: a => (AS[a.status] || [''])[0] },
        { label: '', noExport: true, render: a => (global.Vault ? global.Vault.btn('asset', a.id) : '') + (['stock', 'ready'].includes(a.status) ? act('assign', a.id, '📤 تسليم') : a.status === 'assigned' ? act('return', a.id, '📥 استلام') : a.status === 'wipe' ? act('wipe', a.id, '🧽 مسح') : '') },
      ],
      onAction: (k, id) => { const a = C.find('assets', id); if (k === 'vault' && global.Vault) return global.Vault.open('asset', a.id, a.tag + ' — ' + Fin.assetName(a)); if (k === 'new') Fin.editAsset(cfg.only === 'mobile' ? { type: 'mobile', status: 'stock', condition: 'جديد', location: 'القاهرة', currency: X.cur(), purchaseDate: today() } : null); if (k === 'assign') Fin.assignAsset(a); if (k === 'return') Fin.returnAsset(a); if (k === 'wipe') X.wipeAsset(a); },
    });
  }
  P.assets = (el, dept) => assetList(el, { title: 'الأجهزة', sub: 'اللابتوبات والكمبيوترات والشاشات وباقي الأجهزة — بالكود الثابت ومع مين وحالتها', csv: 'devices', dept, match: a => !['mobile', 'accessory'].includes(a.type) });
  P.mobiles = el => assetList(el, { title: 'الموبايلات', sub: 'موبايلات الشركة بالكود الثابت على الأقسام، والشريحة اللي معاها، وتسجيلها على MDM', csv: 'mobiles', only: 'mobile', match: a => a.type === 'mobile' });

  // ================= الإكسسوارات والمستهلكات =================
  Fin.editConsumable = function (x) {
    x = x || { qty: 0, min: 1, unit: 'قطعة', category: 'إكسسوارات' };
    UI.modal({ title: x.id ? 'تعديل ' + x.name : 'صنف جديد', body: `<div class="grid2">${UI.field({ label: 'الصنف', name: 'name', value: x.name, required: true, placeholder: 'أحبار الطابعات / شواحن لابتوب / ماوس وكيبورد' })}${UI.field({ label: 'الفئة', name: 'category', type: 'select', options: ['أحبار وطباعة', 'شواحن وكابلات', 'ماوس وكيبورد', 'سماعات', 'تخزين (فلاشات / هارد)', 'إكسسوارات'], value: x.category })}${UI.field({ label: 'الكمية في المخزن', name: 'qty', type: 'number', value: x.qty })}${UI.field({ label: 'الحد الأدنى', name: 'min', type: 'number', value: x.min })}${UI.field({ label: 'الوحدة', name: 'unit', value: x.unit })}${UI.field({ label: 'المكان', name: 'branch', type: 'select', options: [''].concat(...X.settings().companies.map(c => c.branches)), value: x.branch })}</div>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الصنف']]); const o = Object.assign({}, x, d); if (!o.code) o.code = X.nextCode('CON'); C.upsert('consumables', o, 'مستهلك'); global.Router.render(); } });
  };
  P.consumables = function (el) {
    const accs = live().filter(a => a.type === 'accessory');
    el.innerHTML = `<div class="page-head"><div><h1>الإكسسوارات والمستهلكات</h1><p class="sub">الإكسسوارات اللي ليها كود وبتتسلم كعهدة — والمستهلكات بالكمية والحد الأدنى (CON)</p></div><div class="actions"><button class="btn primary" data-act="newC">+ صنف مستهلك</button><button class="btn" data-act="newA">+ إكسسوار بكود</button></div></div>
      <div class="panel"><h2>المستهلكات</h2>${UI.table({ rows: DB.consumables.slice().sort((a, b) => (U.num(a.qty) < U.num(a.min) ? 0 : 1) - (U.num(b.qty) < U.num(b.min) ? 0 : 1)), empty: 'لا توجد أصناف', columns: [
        { label: 'الكود', render: x => `<span dir="ltr" class="mono">${esc(x.code || '')}</span>` }, { label: 'الصنف', render: x => `<b>${esc(x.name)}</b><div class="muted small">${esc(x.category || '')}</div>` },
        { label: 'المخزن', cls: 'num', render: x => `<b class="${U.num(x.qty) < U.num(x.min) ? 't-bad' : ''}">${x.qty}</b> <small>${esc(x.unit || '')}</small>` }, { label: 'الحد الأدنى', cls: 'num', render: x => x.min },
        { label: 'الحالة', render: x => U.num(x.qty) < U.num(x.min) ? '<span class="badge b-bad">تحت الحد الأدنى</span>' : '<span class="badge b-good">كفاية</span>' },
        { label: '', render: x => act('out', x.id, '➖ صرف') + act('in', x.id, '➕ توريد') + act('edit', x.id, 'تعديل') }] })}</div>
      <div class="panel"><h2>إكسسوارات بكود (عهدة)</h2>${UI.table({ rows: accs, empty: 'لا توجد', columns: [
        { label: 'الكود', render: a => `<a href="#/asset/${a.id}" dir="ltr" class="mono">${esc(a.tag)}</a>` }, { label: 'الصنف', render: a => esc(Fin.assetName(a)) },
        { label: 'مع', render: a => a.holderId ? `<a href="#/holder/${a.holderId}">${esc(nm(a.holderId))}</a>` : '—' }, { label: 'الحالة', render: a => badge(Fin.ASTATUS, a.status) }] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act, x = b.dataset.id && C.find('consumables', b.dataset.id);
      if (k === 'newC') Fin.editConsumable(); if (k === 'edit') Fin.editConsumable(x); if (k === 'newA') Fin.editAsset({ type: 'accessory', status: 'stock', condition: 'جديد', location: 'القاهرة', currency: X.cur(), purchaseDate: today() });
      if (k === 'out' || k === 'in') UI.modal({ title: (k === 'out' ? 'صرف ' : 'توريد ') + x.name, saveLabel: 'حفظ', body: `<div class="grid2">${UI.field({ label: 'الكمية', name: 'q', type: 'number', value: 1 })}${k === 'out' ? UI.field({ label: 'اتصرف لـ', name: 'to', type: 'select', options: staffOpts('— استخدام عام —') }) : UI.field({ label: 'المورد', name: 'to' })}</div>`,
        onSave: m => { const d = UI.form(m.el), q = U.num(d.q); if (q <= 0) throw new Error('الكمية'); if (k === 'out' && q > U.num(x.qty)) throw new Error('الكمية أكبر من المخزن'); x.qty = U.num(x.qty) + (k === 'out' ? -q : q); C.upsert('consumables', x, 'مستهلك'); X.event((k === 'out' ? 'اتصرف ' : 'اتورّد ') + q + ' ' + (x.unit || '') + ' ' + x.name + (k === 'out' && d.to ? ' لـ ' + nm(d.to) : d.to && k === 'in' ? ' من ' + d.to : ''), { ref: x.code, empId: k === 'out' ? d.to : '' }); global.Router.render(); } });
    };
  };

  // ================= مركز التجديدات (+ كالندر) =================
  P.renewals = function (el) {
    const st = P.renewals._s = P.renewals._s || { win: 30, kind: '', month: today().slice(0, 7) };
    const all = X.renewals(st.win), rows = all.filter(r => !st.kind || r.kind === st.kind);
    const kinds = Array.from(new Set(X.renewals(365).map(r => r.kind)));
    const [y, mo] = st.month.split('-').map(Number), first = new Date(y, mo - 1, 1), dim = new Date(y, mo, 0).getDate(), lead = (first.getDay() + 1) % 7; // السبت أول الأسبوع
    const evs = X.renewals(400).filter(r => r.date.startsWith(st.month) && (!st.kind || r.kind === st.kind));
    const cells = []; for (let i = 0; i < lead; i++) cells.push('<div class="cal-c empty"></div>');
    for (let d = 1; d <= dim; d++) { const ds = st.month + '-' + String(d).padStart(2, '0'), ev = evs.filter(r => r.date === ds); cells.push(`<div class="cal-c ${ds === today() ? 'today' : ''}"><span class="cal-d">${d}</span>${ev.map(r => `<a href="${r.link}" class="cal-e ${r.days < 0 ? 'bad' : r.days <= 7 ? 'warn' : ''}" title="${esc(r.title)}">${esc(r.code || r.kind)}</a>`).join('')}</div>`); }
    el.innerHTML = `<div class="page-head"><div><h1>مركز التجديدات</h1><p class="sub">كل المواعيد في مكان واحد: تولات، شرائح، باقات، ضمان، SSL، دومينات، هوستنج، تراخيص</p></div>
      <div class="actions"><select data-k="win">${[[7, '7 أيام'], [30, '30 يوم'], [90, '90 يوم'], [365, 'سنة']].map(o => `<option value="${o[0]}" ${st.win == o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select><select data-k="kind"><option value="">كل الأنواع</option>${kinds.map(k => `<option ${st.kind === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div></div>
      <div class="cards mk-cards"><div class="card"><span>متأخر</span><b class="t-bad">${rows.filter(r => r.days < 0).length}</b></div><div class="card"><span>خلال 7 أيام</span><b class="t-warn">${rows.filter(r => r.days >= 0 && r.days <= 7).length}</b></div><div class="card"><span>خلال الفترة</span><b>${rows.length}</b></div><div class="card"><span>تكلفة الفترة (${X.curSym()})</span><b>${U.money(U.sum(rows, r => r.cost || 0), false)}</b></div></div>
      <div class="dash-grid"><div class="panel"><h2>القائمة</h2>${rows.map(r => `<a class="ren-row" href="${r.link}">${r.days < 0 ? `<span class="dchip bad"><b>!</b><small>متأخر</small></span>` : daysChip(r.days)}<div><b>${esc(r.title)}</b><small>${esc(r.kind)} · ${esc(r.sub || '')} · ${r.date}${r.cost ? ' · ' + U.money(r.cost, false) + ' ' + X.curSym() : ''}</small></div><span dir="ltr" class="mono">${esc(r.code || '')}</span></a>`).join('') || '<div class="empty">لا يوجد</div>'}</div>
        <div class="panel"><div class="panel-head"><button class="btn sm ghost" data-m="1">→</button><h2>${first.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</h2><button class="btn sm ghost" data-m="-1">←</button></div>
          <div class="cal">${['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map(d => `<div class="cal-h">${d}</div>`).join('')}${cells.join('')}</div></div></div>`;
    el.onchange = e => { const k = e.target.dataset.k; if (k) { st[k] = k === 'win' ? +e.target.value : e.target.value; global.Router.render(); } };
    el.onclick = e => { const b = e.target.closest('[data-m]'); if (b) { const d = new Date(y, mo - 1 - +b.dataset.m, 1); st.month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); global.Router.render(); } };
  };

  // ================= التنبيهات =================
  P.alerts = function (el) {
    const al = X.alerts(), sent = new Set(DB.alertsSent.map(x => x.key)), s = X.settings();
    el.innerHTML = `<div class="page-head"><div><h1>التنبيهات</h1><p class="sub">التنبيه بيتبعت مرة واحدة لكل حدث: جوه النظام${s.telegramToken ? ' + Telegram' : ' (Telegram مش متوصل — من الإعدادات)'}</p></div><div class="actions"><button class="btn" data-act="send">📣 ابعت الجديد دلوقتي</button>${s.telegramToken ? '<button class="btn ghost" data-act="test">اختبار Telegram</button>' : ''}</div></div>
      <div class="panel"><h2>التنبيهات الحالية (${al.length})</h2>${UI.table({ rows: al, empty: 'مفيش تنبيهات', columns: [
        { label: '', render: a => a.sev === 'urgent' ? '<span class="badge b-bad">عاجل</span>' : '<span class="badge b-warn">قريب</span>' },
        { label: 'التنبيه', render: a => `<a href="${a.link}"><b>${esc(a.title)}</b></a>` }, { label: 'الكود', render: a => `<span dir="ltr" class="mono">${esc(a.code)}</span>` },
        { label: 'اتبعت؟', render: a => sent.has(a.key) ? '<span class="badge b-good">✓ اتبعت</span>' : '<span class="badge b-muted">لسه</span>' }] })}</div>
      <div class="panel"><h2>التنبيهات المبعوتة</h2>${UI.table({ rows: DB.alertsSent.slice(0, 80), empty: '—', columns: [
        { label: 'الوقت', render: x => ITXtime(x.at) }, { label: 'التنبيه', render: x => esc(x.title || x.key) }, { label: 'الكود', render: x => `<span dir="ltr" class="mono">${esc(x.code || '')}</span>` }, { label: 'القنوات', render: x => (x.channels || []).map(c => c === 'telegram' ? 'Telegram' : 'CRM').join(' + ') }] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'send') { const n = X.dispatchAlerts(); UI.toast(n ? 'اتبعت ' + n + ' تنبيه' : 'مفيش جديد'); global.Router.render(); } if (b.dataset.act === 'test') X.sendTelegram('✅ اختبار من نظام IT Assets').then(ok => UI.toast(ok ? 'وصلت الرسالة' : 'فشل — راجع التوكن والـ Chat ID', ok ? 'ok' : 'err')); };
  };
  const ITXtime = iso => X.time(iso);

  // ================= الصيانة والضمان =================
  P.maint = function (el) {
    const t = today(), A = live(), yrs = U.num(X.settings().replaceYears) || 4;
    const rep = A.filter(a => a.status === 'repair'), last = a => DB.assetLog.filter(l => l.assetId === a.id && l.kind === 'repair').sort((x, y) => y.date.localeCompare(x.date))[0] || {};
    const warr = A.filter(a => a.warrantyEnd && a.warrantyEnd >= t && a.warrantyEnd <= U.addDays(t, 60)).sort((a, b) => a.warrantyEnd.localeCompare(b.warrantyEnd));
    const old = A.filter(a => a.type !== 'accessory' && a.purchaseDate && U.daysBetween(a.purchaseDate, t) >= yrs * 365);
    const gone = DB.assets.filter(a => ['lost', 'retired'].includes(a.status));
    const link = a => `<a href="#/asset/${a.id}" dir="ltr" class="mono">${esc(a.tag)}</a> ${esc(Fin.assetName(a))}`;
    el.innerHTML = `<div class="page-head"><div><h1>الصيانة والضمان</h1><p class="sub">الأجهزة في الصيانة (عند المورد ولا داخلي)، الضمان اللي قرب يخلص، وعمر الإحلال (+${yrs} سنين)</p></div></div>
      <div class="cards mk-cards"><div class="card"><span>في الصيانة الآن</span><b class="t-warn">${rep.length}</b><small>${rep.filter(atVendor).length} عند المورد</small></div><div class="card"><span>ضمان ينتهي خلال 30 يوم</span><b>${warr.filter(a => a.warrantyEnd <= U.addDays(t, 30)).length}</b></div><div class="card"><span>وصلت لعمر الإحلال</span><b>${old.length}</b></div><div class="card"><span>مفقود / مسروق</span><b class="t-bad">${gone.filter(a => a.status === 'lost').length}</b></div><div class="card"><span>مكهّن بشهادة مسح</span><b>${gone.filter(a => a.status === 'retired' && a.wipeCert).length}</b></div></div>
      <div class="panel"><h2>في الصيانة</h2>${UI.table({ rows: rep, empty: 'مفيش أجهزة في الصيانة', columns: [{ label: 'الجهاز', render: link }, { label: 'العطل', render: a => esc(last(a).note || '') }, { label: 'عند', render: a => esc(last(a).vendor || 'داخلي') }, { label: 'من', render: a => a.repairSince ? U.daysBetween(a.repairSince, t) + ' يوم' : '' }, { label: 'تكلفة متوقعة', cls: 'num', render: a => last(a).cost ? U.money(last(a).cost, false) : '—' }, { label: '', render: a => act('back', a.id, '✅ رجوع') }] })}</div>
      <div class="dash-grid"><div class="panel"><h2>الضمان (60 يوم)</h2>${UI.table({ rows: warr, empty: '—', columns: [{ label: 'الجهاز', render: link }, { label: 'القسم', render: a => esc(X.deptOf(a)) }, { label: 'ينتهي', render: a => `<span class="${X.days(a.warrantyEnd) <= 7 ? 't-bad' : 't-warn'}">${X.inDays(X.days(a.warrantyEnd))}</span> <small class="muted">${a.warrantyEnd}</small>` }] })}</div>
        <div class="panel"><h2>وصلت لعمر الإحلال</h2>${UI.table({ rows: old, empty: '—', columns: [{ label: 'الجهاز', render: link }, { label: 'العمر', render: a => (U.daysBetween(a.purchaseDate, t) / 365).toFixed(1) + ' سنة' }, { label: 'مع', render: a => esc(nm(a.holderId) || '—') }] })}</div></div>
      <div class="panel"><h2>مفقود / مكهّن</h2>${UI.table({ rows: gone, empty: '—', columns: [{ label: 'الجهاز', render: link }, { label: 'الحالة', render: a => badge(Fin.ASTATUS, a.status) }, { label: 'السبب', render: a => esc(a.retireReason || '') }, { label: 'شهادة مسح الداتا', render: a => a.wipeCert ? `<button class="link" data-doc="${esc(a.wipeCert)}">${esc(a.wipeCert)}</button>` : a.status === 'retired' ? '<span class="t-bad small">مفيش شهادة!</span>' : '—' }] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act="back"]'); if (b) Fin.repairAsset(C.find('assets', b.dataset.id)); const d = e.target.closest('[data-doc]'); if (d) { const doc = DB.itDocs.find(x => x.no === d.dataset.doc); if (doc) X.printDoc(doc); } };
  };

  // ================= الجرد والسيريالات =================
  P.stocktake = function (el) {
    const cur = X.syncStocktake(DB.stocktakes.find(s => s.status === 'open')), last = X.lastStocktake(), ss = X.stocktakeStats(cur || last);
    const st = P.stocktake._s = P.stocktake._s || { type: '', place: '' };
    const T = Fin.TYPES, tc = (global.BRAND || {}).typeCodes || {};
    const all = X.stockLive().sort((a, b) => (a.tag || '').localeCompare(b.tag || ''));
    const rows = all.filter(a => (!st.type || a.type === st.type) && (!st.place || X.placeOf(a) === st.place));
    const itOf = a => cur && cur.items.find(x => x.assetId === a.id);
    const places = Array.from(new Set(all.map(X.placeOf).filter(Boolean)));
    const types = Array.from(new Set(all.map(a => a.type)));
    const cnt = (f) => all.filter(f).length;
    const lc = v => String(v || '').trim().toLowerCase();
    // ملخص الأعداد زي الشيت: لكل نوع × فرع
    const sumOf = (t, f) => ({ t, total: cnt(a => f(a)), byP: places.map(p => cnt(a => f(a) && X.placeOf(a) === p)), used: cnt(a => f(a) && a.status === 'assigned'), sn: cnt(a => f(a) && a.serial), mon: cnt(a => f(a) && a.monitorSerial) });
    const sumRows = types.map(t => sumOf(t, a => a.type === t)).concat([sumOf('__total', () => true)]);
    const result = it => !cur ? '' : !it ? '<span class="muted small">مش في الجرد</span>' : !it.seen ? '<span class="badge b-muted">لسه</span>'
      : (it.serialOk === false ? '<span class="badge b-bad">سريال الجهاز مش مطابق</span> ' : '') + (it.monOk === false ? '<span class="badge b-bad">سريال الشاشة مش مطابق</span> ' : '') + (it.placeOk === false ? '<span class="badge b-warn">مش في مكانه</span>' : '')
        + (it.serialOk !== false && it.monOk !== false && it.placeOk !== false ? '<span class="badge b-good">✓ مطابق</span>' : '');
    el.innerHTML = `<div class="page-head"><div><h1>الجرد والسيريالات</h1><p class="sub">كل الأجهزة زي شيت الجرد بالظبط: الأعداد، وسريال كل جهاز وشاشة — والجرد بيطابق اللي على الجهاز فعلًا بالمسجّل</p></div><div class="actions">${cur ? '<button class="btn" data-act="close">إقفال الجرد</button>' : '<button class="btn primary" data-act="start">ابدأ جرد جديد</button>'}<button class="btn ghost" data-act="csv">⬇ Excel</button></div></div>
      <div class="cards mk-cards"><div class="card"><span>إجمالي الأجهزة</span><b>${all.length}</b><small>زي شيت الجرد</small></div>
        ${types.map(t => `<div class="card"><span>${(T[t] || T.other)[1]} ${(T[t] || T.other)[0]} <small dir="ltr">(${esc(tc[t] || t)})</small></span><b>${cnt(a => a.type === t)}</b></div>`).join('')}
        <div class="card"><span>ليها سريال</span><b>${cnt(a => a.serial)}</b><small>من ${all.length}</small></div><div class="card"><span>سريال شاشة</span><b>${cnt(a => a.monitorSerial)}</b></div>
        ${cur ? `<div class="card hero"><span>الجرد الجاري ${esc(cur.no)}</span><b>${ss.reviewed} / ${ss.total}</b><small>${ss.pct}% · <span class="t-bad">${ss.mismatch} مش مطابق</span></small></div>` : ''}</div>
      <div class="panel"><h2>الأعداد لكل نوع و${X.coLabel()}</h2>${UI.table({ rows: sumRows, columns: [{ label: 'النوع', render: r => r.t === '__total' ? '<b>الإجمالي</b>' : `${(T[r.t] || T.other)[1]} ${(T[r.t] || T.other)[0]} <span dir="ltr" class="mono small">${esc(tc[r.t] || '')}</span>` }]
        .concat(places.map((p, i) => ({ label: p, cls: 'num', render: r => r.t === '__total' ? `<b>${r.byP[i]}</b>` : (r.byP[i] || '—') })))
        .concat([{ label: 'الإجمالي', cls: 'num', render: r => `<b>${r.total}</b>` }, { label: 'مستخدم', cls: 'num', render: r => r.used }, { label: 'خالي', cls: 'num', render: r => r.total - r.used }, { label: 'ليها سريال', cls: 'num', render: r => r.sn + ' / ' + r.total }, { label: 'سريال شاشة', cls: 'num', render: r => r.mon || '—' }]) })}</div>
      <div class="panel"><div class="panel-head"><h2>${cur ? 'جرد جاري ' + esc(cur.no) + ' — ' + esc(cur.scopeLabel || 'كامل') : 'سجل السريالات'}</h2>
        <div class="actions"><select data-f="type"><option value="">كل الأنواع</option>${types.map(t => `<option value="${t}" ${st.type === t ? 'selected' : ''}>${(T[t] || T.other)[0]}</option>`).join('')}</select><select data-f="place"><option value="">${X.coAll()}</option>${places.map(p => `<option ${st.place === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div></div>
        ${cur ? '<div class="stk-scan"><input id="stkIn" placeholder="امسح الباركود أو اكتب الكود / سريال الجهاز / سريال الشاشة ثم Enter" dir="ltr" autocomplete="off"><button class="btn primary" data-act="scan">مراجعة</button></div>' : ''}
        ${UI.table({ rows, empty: 'لا توجد أجهزة', columns: [
          { label: 'الكود', render: a => `<a href="#/asset/${a.id}" dir="ltr" class="mono">${esc(a.tag || '')}</a>` },
          { label: 'الجهاز', render: a => `${(T[a.type] || T.other)[1]} ${esc(Fin.assetName(a))}${a.specs && a.specs !== Fin.assetName(a) ? `<div class="muted small" dir="ltr">${esc(a.specs)}</div>` : ''}` },
          { label: 'سريال الجهاز', render: a => a.serial ? `<span dir="ltr" class="mono small">${esc(a.serial)}</span>` : '<span class="muted">—</span>' },
          { label: 'الشاشة', render: a => a.monitor || a.monitorBrand ? `<b dir="ltr">${esc(a.monitor || '')}</b> ${esc(a.monitorBrand || '')}` : '<span class="muted">—</span>' },
          { label: 'سريال الشاشة', render: a => a.monitorSerial ? `<span dir="ltr" class="mono small">${esc(a.monitorSerial)}</span>` : '<span class="muted">—</span>' },
          { label: 'مع / المكان', render: a => (a.holderId ? `<a href="#/holder/${a.holderId}">${esc(nm(a.holderId))}</a>` : '<span class="muted">خالي</span>') + `<div class="muted small">${esc(X.placeOf(a))} · ${esc(X.deptOf(a))}</div>` },
          ...(cur ? [{ label: 'النتيجة', render: a => { const it = itOf(a); return result(it) + (it && it.seen && (it.found || it.foundMon) ? `<div class="muted small" dir="ltr">${esc([it.found, it.foundMon].filter(Boolean).join(' · '))}</div>` : ''); } },
            { label: '', render: a => itOf(a) ? `<button class="link" data-chk="${a.id}">${itOf(a).seen ? 'تعديل' : 'مراجعة'}</button>` : '' }] : [])] })}</div>
      <div class="panel"><h2>جرد سابق</h2>${UI.table({ rows: DB.stocktakes.filter(s => s.status === 'closed').slice().reverse(), empty: 'لسه مفيش جرد متقفل', columns: [
        { label: 'الرقم', render: s => esc(s.no) }, { label: 'النطاق', render: s => esc(s.scopeLabel || 'كامل') }, { label: 'بدأ', render: s => (s.startedAt || '').slice(0, 10) }, { label: 'اتقفل', render: s => (s.closedAt || '').slice(0, 10) },
        { label: 'النتيجة', render: s => { const z = X.stocktakeStats(s); return `${z.reviewed}/${z.total} · <span class="t-bad">${z.mismatch} مش مطابق</span> · <span class="t-warn">${z.misplaced} مش في مكانه</span> · ${z.missing} مش موجود`; } }] })}</div>`;
    const check = id => {
      const it = cur && cur.items.find(x => x.assetId === id), a = C.find('assets', id); if (!it || !a) return UI.toast('الجهاز مش ضمن الجرد', 'warn');
      const hasMon = !!(a.monitorSerial || a.monitor);
      UI.modal({ title: 'مراجعة ' + a.tag + ' — ' + Fin.assetName(a), saveLabel: 'حفظ', body: `<div class="grid2">${UI.field({ label: 'سريال الجهاز اللي عليه فعلًا', name: 'serial', value: it.found || a.serial || '', attrs: 'dir="ltr"' })}
          ${hasMon ? UI.field({ label: 'سريال الشاشة اللي عليها فعلًا', name: 'mon', value: it.foundMon || a.monitorSerial || '', attrs: 'dir="ltr"' }) : ''}
          ${UI.field({ label: 'لقيته في', name: 'place', type: 'select', options: [''].concat(places), value: it.place || X.placeOf(a) })}${UI.field({ label: 'ملاحظة', name: 'note', value: it.note, full: true })}</div>
          <p class="muted small">المسجّل في الشيت: الجهاز <span dir="ltr">${esc(a.serial || '—')}</span>${hasMon ? ' · الشاشة <span dir="ltr">' + esc([a.monitor, a.monitorBrand].filter(Boolean).join(' ')) + ' ' + esc(a.monitorSerial || '—') + '</span>' : ''} · ${esc(X.placeOf(a) || '—')}${a.holderId ? ' · مع ' + esc(nm(a.holderId)) : ''}</p>`,
        onSave: m => { const d = UI.form(m.el);
          Object.assign(it, { seen: true, at: new Date().toISOString(), found: d.serial, foundMon: d.mon || '', place: d.place, note: d.note,
            serialOk: !a.serial || lc(d.serial) === lc(a.serial), monOk: !hasMon || !a.monitorSerial || lc(d.mon) === lc(a.monitorSerial), placeOk: !X.placeOf(a) || !d.place || d.place === X.placeOf(a) });
          C.upsert('stocktakes', cur, 'جرد'); ITX_log(a, it); global.Router.render(); } });
    };
    el.onchange = e => { const f = e.target.closest('[data-f]'); if (f) { st[f.dataset.f] = f.value; global.Router.render(); } };
    el.onclick = e => {
      const c = e.target.closest('[data-chk]'); if (c) return check(c.dataset.chk);
      const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'csv') UI.csv('serials', ['الكود', 'النوع', 'الجهاز', 'المواصفات', 'سريال الجهاز', 'الشاشة', 'سريال الشاشة', 'مع', X.coLabel(), 'القسم'], all.map(a => [a.tag, (T[a.type] || T.other)[0], Fin.assetName(a), a.specs || '', a.serial || '', [a.monitor, a.monitorBrand].filter(Boolean).join(' '), a.monitorSerial || '', nm(a.holderId), X.placeOf(a), X.deptOf(a)]));
      if (k === 'start') UI.modal({ title: 'جرد جديد', saveLabel: 'ابدأ', body: UI.field({ label: 'النطاق', name: 'scope', type: 'select', options: [{ value: '', label: 'جرد كامل لكل الأجهزة (' + all.length + ')' }].concat(places.map(p => ({ value: p, label: X.coLabel() + ': ' + p + ' (' + all.filter(a => X.placeOf(a) === p).length + ')' }))) }),
        onSave: m => { const d = UI.form(m.el), items = all.filter(a => !d.scope || X.placeOf(a) === d.scope).map(a => ({ assetId: a.id, seen: false })); C.upsert('stocktakes', { id: U.uid(), no: X.nextCode('STK'), status: 'open', full: !d.scope, scope: d.scope || '', scopeLabel: d.scope || 'كامل', startedAt: new Date().toISOString(), by: X.me().name || '', items }, 'جرد'); X.event('بدأ جرد ' + (d.scope || 'كامل') + ' (' + items.length + ' جهاز)', { kind: 'count' }); global.Router.render(); } });
      if (k === 'close' && confirm('إقفال الجرد؟ الأجهزة اللي متراجعتش هتتسجل "مش موجودة".')) { cur.status = 'closed'; cur.closedAt = new Date().toISOString(); C.upsert('stocktakes', cur, 'إقفال جرد'); const z = X.stocktakeStats(cur); X.event('اتقفل الجرد ' + cur.no + ': ' + z.reviewed + '/' + z.total + ' · ' + z.mismatch + ' سيريال مش مطابق · ' + z.misplaced + ' مش في مكانه', { kind: 'count' }); global.Router.render(); }
      if (k === 'scan') scan();
    };
    const scan = () => { const inp = $('#stkIn', el); const q = lc(inp.value); if (!q) return; const a = all.find(x => lc(x.tag) === q || lc(x.serial) === q || lc(x.monitorSerial) === q); inp.value = ''; if (!a) return UI.toast('الكود / السريال مش موجود في الشيت', 'err'); check(a.id); };
    const inp = $('#stkIn', el); if (inp) { inp.addEventListener('keydown', e => { if (e.key === 'Enter') scan(); }); inp.focus(); }
  };
  const ITX_log = (a, it) => X.alog(a.id, 'count', { note: (it.serialOk === false ? 'سريال الجهاز مش مطابق: ' + it.found + ' · ' : '') + (it.monOk === false ? 'سريال الشاشة مش مطابق: ' + it.foundMon + ' · ' : '') + (it.placeOk === false ? 'مش في مكانه (لقيته في ' + it.place + ')' : 'مطابق') });

  // ================= باقات الإنترنت (NET) =================
  Fin.editNet = function (x) {
    x = x || { quota: 100, currency: 'EGP', cycle: 'monthly', provider: 'WE', renewalDate: U.addMonths(today(), 1), status: 'active' };
    UI.modal({ title: x.id ? 'تعديل ' + x.name : 'باقة إنترنت جديدة', body: `<div class="grid2">${UI.field({ label: 'اسم الخط', name: 'name', value: x.name, required: true, placeholder: 'خط الفرع الرئيسي' })}${UI.field({ label: 'المزود', name: 'provider', type: 'select', options: ['WE', 'فودافون', 'أورنج', 'اتصالات (e&)', 'STC', 'موبايلي', 'زين'], value: x.provider })}
      ${UI.field({ label: 'حجم الباقة (جيجا)', name: 'quota', type: 'number', value: x.quota })}${UI.field({ label: 'تاريخ التجديد', name: 'renewalDate', type: 'date', value: x.renewalDate })}${UI.field({ label: 'التكلفة الشهرية (ج.م)', name: 'cost', type: 'number', value: x.cost || '' })}
      ${UI.field({ label: 'الفرع', name: 'branch', type: 'select', options: [''].concat(...X.settings().companies.map(c => c.branches)), value: x.branch })}${UI.field({ label: 'رقم الخط الأرضي / الحساب', name: 'account', value: x.account, attrs: 'dir="ltr"' })}
      ${UI.field({ label: 'رابط حساب المزود (my.te.eg…)', name: 'portal', value: x.portal || 'https://my.te.eg', attrs: 'dir="ltr"', full: true })}
      ${UI.field({ label: '🟠 حد التحذير (جيجا متبقية) — "جهز رصيد"', name: 'warnGb', type: 'number', value: x.warnGb || '', placeholder: 'مثال: 50' })}${UI.field({ label: '🔴 الحد الحرج (جيجا متبقية) — "تجديد عاجل"', name: 'critGb', type: 'number', value: x.critGb || '', placeholder: 'مثال: 15' })}
      <h4 style="grid-column:1/-1;margin:8px 0 0">☎️ الخط الأرضي (دفع وتجديد منفصل عن الباقة)</h4>
      ${UI.field({ label: 'تكلفة الأرضي', name: 'land_cost', type: 'number', value: x.land_cost || '' })}${UI.field({ label: 'آخر دفع للأرضي', name: 'land_lastPaid', type: 'date', value: x.land_lastPaid })}
      <div class="field"><span>مدة تجديد الأرضي</span><div style="display:flex;gap:6px"><input type="number" name="land_renewDur" min="0" value="${esc(x.land_renewDur || '')}" placeholder="مثال: 3" style="flex:1"><select name="land_renewUnit">${UI.options(X.UNITS, x.land_renewUnit || 'months')}</select></div></div>
      ${UI.field({ label: 'التجديد القادم للأرضي', name: 'land_renewDate', type: 'date', value: x.land_renewDate, hint: 'بيتحسب من آخر دفع + المدة' })}</div><p class="muted small">🔒 باسورد حساب المزود مش بيتسجل هنا — في الـ Vault. الاستهلاك بيتسجل يدوي أو من تاب "الاستهلاك" في الشيت (لقطة يومية).</p>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الاسم']]); d.currency = 'EGP'; /* الباقات بالجنيه دايمًا */ if (d.land_lastPaid && U.num(d.land_renewDur)) d.land_renewDate = X.nextRenewal(d.land_lastPaid, d.land_renewDur, d.land_renewUnit); if (U.num(d.critGb) && U.num(d.warnGb) && U.num(d.critGb) > U.num(d.warnGb)) throw new Error('الحد الحرج لازم يكون أقل من حد التحذير'); const o = Object.assign({ status: 'active' }, x, d); if (!o.code) o.code = X.nextCode('NET'); C.upsert('netPackages', o, 'باقة'); global.Router.render(); } });
  };
  const reading = (refType, x, unitLabel) => UI.modal({ title: 'تسجيل قراءة — ' + x.name, saveLabel: 'حفظ', body: `<div class="grid2">${UI.field({ label: 'المستخدم حتى الآن (' + unitLabel + ')', name: 'used', type: 'number', value: x.used || 0 })}${UI.field({ label: 'التاريخ', name: 'date', type: 'date', value: today() })}</div><p class="muted small">أو المتبقي: ${UI.field({ label: 'المتبقي (' + unitLabel + ')', name: 'rem', type: 'number' })}</p>`,
    onSave: m => { const d = UI.form(m.el); const used = d.rem ? U.num(x.quota) - U.num(d.rem) : d.used; X.addSnapshot(refType, x, used, d.date, 'يدوي'); X.dispatchAlerts(); global.Router.render(); } });
  // ---------- كارت الخط: عدّاد المتبقي + منحنى المتبقي آخر 30 يوم + التجديد ----------
  function netSpark(x) {
    const q = U.num(x.quota), from = U.addDays(today(), -30);
    // قراءات شيت مراجعة الباقات مستنية تأكيد ترتيب الأعمدة ← المنحنى من قراءات WE واليدوي بس (والمستحيل > الباقة بيتشال)
    const pts = X.snapsOf('net', x.id).filter(s => s.date >= from && s.source !== 'شيت مراجعة الباقات').map(s => ({ d: s.date, r: s.remaining != null ? U.num(s.remaining) : q ? Math.max(0, q - U.num(s.used)) : null })).filter(p => p.r != null && (!q || p.r <= q * 1.02)).sort((a, b) => a.d.localeCompare(b.d)).filter((p, i, a) => !a[i + 1] || a[i + 1].d !== p.d); // بالتاريخ، وقراءة واحدة لكل يوم (الأحدث)
    // السجل اليدوي اليومي من شيت مراجعة الباقات (المتبقي كل يوم) — خط متقطع، ومش داخل في حسابات الباقة الحالية
    const dg = String(x.account || x.name || '').replace(/\D/g, '');
    const hist = (DB.usageReview || []).filter(r => r.date >= from && dg.endsWith(String(r.number))).map(r => ({ d: r.date, r: U.num(r.remaining) })).sort((a, b) => a.d.localeCompare(b.d)).filter((p, i, a) => !a[i + 1] || a[i + 1].d !== p.d);
    if (pts.length + hist.length < 2) return '<div class="net-spark-empty muted small">📈 المنحنى بيظهر من تاني قراءة (من WE أو من شيت مراجعة الباقات)</div>';
    const all = pts.concat(hist).sort((a, b) => a.d.localeCompare(b.d));
    const W = 300, H = 70, P = 4, max = Math.max(q, ...all.map(p => p.r)) || 1, t0 = new Date(all[0].d).getTime(), t1 = Math.max(t0 + 1, new Date(all[all.length - 1].d).getTime());
    const xy = p => [P + (W - 2 * P) * (1 - (new Date(p.d).getTime() - t0) / (t1 - t0)), H - P - (H - 2 * P) * (p.r / max)]; // RTL: الأحدث على الشمال
    const poly = a => a.map(p => xy(p).map(v => v.toFixed(1)).join(',')).join(' ');
    const hit = (p, src) => { const [cx, cy] = xy(p); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7" class="ns-hit"><title>${p.d}: متبقي ${Math.round(p.r)} جيجا — ${src}</title></circle>`; };
    const lastWe = pts[pts.length - 1];
    return `<svg class="net-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="المتبقي آخر 30 يوم">
      ${pts.length >= 2 ? `<polygon points="${xy(pts[0])[0].toFixed(1)},${H - P} ${poly(pts)} ${xy(lastWe)[0].toFixed(1)},${H - P}" class="ns-area"/>` : ''}
      ${hist.length >= 2 ? `<polyline points="${poly(hist)}" class="ns-hist"/>` : ''}${pts.length >= 2 ? `<polyline points="${poly(pts)}" class="ns-line"/>` : ''}
      ${hist.map(p => hit(p, 'السجل اليدوي (شيت المراجعة)')).join('')}${pts.map(p => hit(p, 'قراءة WE')).join('')}
      ${lastWe ? `<circle cx="${xy(lastWe)[0].toFixed(1)}" cy="${xy(lastWe)[1].toFixed(1)}" r="3.5" class="ns-dot"/>` : ''}</svg>
      <div class="net-spark-axis muted small"><span>${all[0].d}</span><span>المتبقي آخر 30 يوم${hist.length ? ' · <i class="ns-key ns-key-we"></i> WE <i class="ns-key ns-key-hist"></i> السجل اليدوي' : ''}</span><span>${all[all.length - 1].d}</span></div>`;
  }
  function netCard(x) {
    const has = U.num(x.quota) > 0, f = has ? X.forecast('net', x) : null, st0 = X.netState(x), rn = X.days(x.renewalDate);
    // الحالة: الحدود اللي حاططها للخط، وإلا توقع الاستهلاك (هيخلص قبل التجديد = تحذير)
    const st = st0.lvl !== 'ok' || !f ? st0 : f.cls === 'bad' ? { lvl: 'crit', txt: f.verdict } : f.cls === 'warn' ? { lvl: 'warn', txt: f.verdict } : st0;
    const color = st.lvl === 'crit' ? 'var(--bad)' : st.lvl === 'warn' ? 'var(--c-repair)' : 'var(--c-used)';
    const gauge = has ? donut([{ v: f.remaining, c: color }, { v: Math.max(0, f.quota - f.remaining), c: 'var(--surface-2)' }], (Math.round(f.remaining * 10) / 10) + '', 'جيجا متبقي') : donut([], '—', 'مستني قراءة');
    const s = X.snapsOf('net', x.id).slice(-1)[0];
    return `<div class="panel net-card ${st.lvl === 'crit' ? 'is-crit' : st.lvl === 'warn' ? 'is-warn' : ''}">
      <div class="net-top"><div><b dir="ltr" class="net-num">${esc(x.account || x.name)}</b><div class="muted small"><span dir="ltr" class="mono">${esc(x.code)}</span> · ${esc(x.provider || '')}${x.branch ? ' · ' + esc(x.branch) : ''}</div></div>
        ${has ? `<span class="badge b-${st.lvl === 'crit' ? 'bad' : st.lvl === 'warn' ? 'warn' : 'good'}">${st.lvl === 'crit' ? '🔴 ' : st.lvl === 'warn' ? '🟠 ' : '🟢 '}${esc(st.lvl === 'ok' ? f.verdict : st.txt)}</span>` : '<span class="badge b-muted">مستني قراءة</span>'}</div>
      <div class="net-mid">${gauge}<div class="net-stats">
        ${has ? `<div><small>المستهلك</small><b>${Math.round(f.used * 10) / 10} <small>من ${Math.round(f.quota)} جيجا</small></b></div>
        <div><small>الاستهلاك اليومي</small><b>${f.perDay ? Math.round(f.perDay * 10) / 10 + ' <small>جيجا/يوم</small>' : '—'}</b></div>
        <div><small>يكفي</small><b class="${f.cls === 'bad' ? 't-bad' : f.cls === 'warn' ? 't-warn' : ''}">${isFinite(f.daysLeft) ? Math.floor(f.daysLeft) + ' <small>يوم</small>' : '—'}</b></div>` : ''}
        <div><small>التجديد</small><b class="${rn != null && rn <= 3 ? 't-bad' : rn != null && rn <= 7 ? 't-warn' : ''}">${x.renewalDate ? X.inDays(rn) : '—'}</b><small class="muted">${esc(x.renewalDate || '')}</small></div></div></div>
      ${has ? netSpark(x) : ''}
      <div class="net-foot"><span class="muted small">آخر تحديث: ${x.lastFetch ? X.ago(x.lastFetch) : s ? esc(s.date) : 'لسه'}${s ? ' · ' + esc(s.source || '') : ''}${x.land_renewDate ? ' · ☎️ الأرضي ' + X.inDays(X.days(x.land_renewDate)) : ''}</span>
        <span>${act('read', x.id, '📈 قراءة')}${act('pay', x.id, '💳 تجديد')}${act('payland', x.id, '☎️ أرضي')}${act('edit', x.id, 'تعديل')}</span></div></div>`;
  }
  P.net = function (el) {
    const egp = U.sum(DB.netPackages.filter(x => x.status !== 'cancelled'), x => X.toCur(X.sar(x.cost, x.currency), 'EGP'));
    el.innerHTML = `<div class="page-head"><div><h1>باقات الإنترنت</h1><p class="sub">الجيجات المتبقية في كل خط وميعاد التجديد — بتتحدث لوحدها من سكربت WE (run_we.bat) عن طريق شيت WE</p></div><div class="actions"><button class="btn primary" data-act="we">🔄 حدّث كل الخطوط من WE</button><button class="btn ghost" data-act="new">+ باقة</button></div></div>
      ${(() => { const live = DB.netPackages.filter(x => x.status !== 'cancelled'), got = live.filter(x => U.num(x.quota) > 0), rem = U.sum(got, x => X.forecast('net', x).remaining);
        return `<div class="cards mk-cards"><div class="card"><span>الخطوط</span><b>${live.length}</b><small>WE</small></div><div class="card hero"><span>الجيجات المتبقية (كل الخطوط)</span><b>${got.length ? Math.round(rem * 10) / 10 : '—'}</b><small>${got.length ? 'جيجا' : 'مستني أول قراءة من السكربت'}</small></div><div class="card"><span>تجديد خلال 7 أيام</span><b class="t-warn">${live.filter(x => X.days(x.renewalDate) != null && X.days(x.renewalDate) <= 7).length}</b></div>${egp ? `<div class="card"><span>التكلفة الشهرية</span><b>${U.money(egp, false)}</b><small>ج.م</small></div>` : ''}</div>`; })()}
      <div class="net-grid">${DB.netPackages.filter(x => x.status !== 'cancelled').map(netCard).join('') || '<div class="empty">لا توجد باقات</div>'}</div>
      <details class="panel"><summary class="muted small" style="cursor:pointer">عرض كجدول</summary>${UI.table({ rows: DB.netPackages, empty: 'لا توجد باقات', columns: [
        { label: 'الكود', render: x => `<span dir="ltr" class="mono">${esc(x.code)}</span>` }, { label: 'الخط', render: x => `<b dir="ltr">${esc(x.account || x.name)}</b><div class="muted small">${esc(x.provider || '')}${x.branch ? ' · ' + esc(x.branch) : ''}</div>` },
        { label: 'الجيجات المتبقية', render: x => { if (!U.num(x.quota)) return '<span class="muted">مستني أول قراءة من السكربت</span>'; const f = X.forecast('net', x); const st = X.netState(x); return `${hbar(f.remaining / (f.quota || 1) * 100, st.lvl === 'crit' ? 'bad' : st.lvl === 'warn' ? 'warn' : 'used')} <b style="font-size:1.15em">${Math.round(f.remaining * 10) / 10}</b> جيجا ${st.lvl !== 'ok' ? X.chip(st.txt, st.lvl === 'crit' ? 'bad' : 'warn') : ''}<div class="muted small">مستهلك ${Math.round(f.used * 10) / 10} من ${Math.round(f.quota)} جيجا (${f.pct}% متبقي)${f.perDay ? ' · ' + Math.round(f.perDay * 10) / 10 + ' جيجا/يوم' : ''}</div>`; } },
        { label: 'ميعاد التجديد', render: x => x.renewalDate ? `<b>${x.renewalDate}</b><div class="small ${X.days(x.renewalDate) <= 3 ? 't-bad' : X.days(x.renewalDate) <= 7 ? 't-warn' : 'muted'}">${X.inDays(X.days(x.renewalDate))}</div>` : '<span class="muted">—</span>' },
        { label: 'آخر تحديث', render: x => { const s = X.snapsOf('net', x.id).slice(-1)[0]; return x.lastFetch || s ? `${x.lastFetch ? X.ago(x.lastFetch) : s.date}<div class="muted small">${esc((s && s.source) || 'السكربت')}</div>` : '<span class="muted">لسه</span>'; } },
        { label: '☎️ الأرضي', render: x => x.land_renewDate || x.land_lastPaid ? `${x.land_renewDate ? `<b>${x.land_renewDate}</b><div class="small ${X.days(x.land_renewDate) <= 3 ? 't-bad' : X.days(x.land_renewDate) <= 7 ? 't-warn' : 'muted'}">${X.inDays(X.days(x.land_renewDate))}</div>` : ''}<div class="muted small">${x.land_lastPaid ? 'آخر دفع ' + x.land_lastPaid : ''} · ${X.durLabel(x.land_renewDur, x.land_renewUnit)}</div>` : '<span class="muted">غير محدد</span>' },
        { label: '', render: x => act('read', x.id, '📈 قراءة يدوي') + act('pay', x.id, '💳 تجديد الباقة') + act('payland', x.id, '☎️ دفع الأرضي') + act('edit', x.id, 'تعديل') }] })}</details>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const x = C.find('netPackages', b.dataset.id);
      if (b.dataset.act === 'pay') X.payRenewal('netPackages', x, { coll: 'netPackages', kind: 'internet', label: 'تجديد باقة', dateField: 'renewalDate', title: x.account || x.name });
      if (b.dataset.act === 'payland') X.payRenewal('netPackages', x, { coll: 'netPackages', kind: 'landline', prefix: 'land_', label: 'دفع الأرضي', title: x.account || x.name }); if (b.dataset.act === 'new') Fin.editNet(); if (b.dataset.act === 'edit') Fin.editNet(x); if (b.dataset.act === 'read') reading('net', x, 'جيجا'); if (b.dataset.act === 'we') weRefresh(); };
  };
  // ---------- زرار واحد "حدّث الخطين من WE": بيكلّم إضافة Chrome (extension/we-usage) — الخطوط ورا بعض ----------
  function weRefresh() {
    const lines = DB.netPackages.filter(x => x.status !== 'cancelled' && x.provider === 'WE' && x.account).map(x => ({ code: x.code, number: String(x.account).replace(/\D/g, '') }));
    if (!document.documentElement.dataset.tpWe) return UI.modal({ title: '🔄 حدّث من WE — محتاج الإضافة', body: `<p>الزرار ده شغال عن طريق إضافة Chrome بتفتح موقع WE وتعمل اللوجين وترجّع الجيجات وميعاد التجديد.</p>
      <ol><li>افتح في Chrome: <b dir="ltr">chrome://extensions</b></li><li>شغّل <b>Developer mode</b> (فوق على اليمين)</li><li>دوس <b>Load unpacked</b> واختار فولدر <b dir="ltr">TP-WE-Extension</b> اللي على سطح المكتب</li><li>اضغط أيقونة الإضافة واكتب باسورد كل خط مرة واحدة (اختياري)</li><li>ارجع هنا ودوس <b>Ctrl + F5</b></li></ol>` });
    window.postMessage({ source: 'tp-it', type: 'TP_WE_REFRESH', lines }, '*');
    UI.toast('بيحدّث خطوط WE واحد ورا التاني (الخطوط اللي في نافذة الإضافة)… لو ظهرت كابتشا اكتبها هناك');
  }
  if (!global.__tpWeListen) {
    global.__tpWeListen = true;
    global.addEventListener('message', e => {
      const m = e.data; if (e.source !== global || !m || m.source !== 'tp-we-ext') return;
      if (m.type === 'TP_WE_STATUS' && m.text) UI.toast(m.code + ': ' + m.text);
      if (m.type === 'TP_WE_DONE') UI.toast('✓ خلص تحديث الخطوط من WE');
      if (m.type !== 'TP_WE_RESULT') return;
      const r = m.result || {}; let x = DB.netPackages.find(p => p.code === m.code);
      if (!r.ok) return UI.toast((m.code || '') + ': ' + (r.error || 'مفيش نتيجة'), 'err');
      if (!x && m.code && m.number && !(X.netIgnored && X.netIgnored(m.code, { account: m.number }))) { // خط جديد اتضاف من نافذة الإضافة ← يتضاف هنا كمان
        x = { id: U.uid(), code: m.code, name: 'WE ' + m.number, account: m.number, provider: 'WE', currency: 'EGP', cycle: 'monthly', status: 'active', portal: 'https://my.te.eg', quota: 0, used: 0, users: [], history: [], createdAt: new Date().toISOString() };
        DB.netPackages.push(x); X.bumpSeq(m.code);
      }
      if (!x) return;
      if (m.number && String(x.account || '').replace(/\D/g, '') !== m.number) { x.account = m.number; x.name = 'WE ' + m.number; } // اليوزر اتعدّل من الإضافة
      if (U.num(r.quota) > 0) x.quota = U.num(r.quota);
      if (r.renewalDate) x.renewalDate = r.renewalDate;
      x.lastFetch = new Date().toISOString();
      const used = r.used != null ? U.num(r.used) : U.num(x.quota) - U.num(r.remaining);
      const ex = DB.usageSnapshots.find(s => s.refId === x.id && s.date === today());
      if (ex) { ex.used = used; ex.source = 'WE (الإضافة)'; x.used = used; C.upsert('netPackages', x, 'تحديث من WE'); } else X.addSnapshot('net', x, used, today(), 'WE (الإضافة)');
      X.event(x.code + ': متبقي ' + r.remaining + ' من ' + r.quota + ' جيجا · التجديد ' + (r.renewalDate || '؟'), { kind: 'sync', by: 'إضافة WE' });
      UI.toast('✓ ' + x.code + ': متبقي ' + r.remaining + ' جيجا · التجديد ' + (r.renewalDate || '؟'));
      global.Router && global.Router.render();
    });
  }

  // ================= التولات والتوكنات (TOOL) =================
  Fin.editTool = function (x) {
    x = x || { unit: 'tokens', quota: 1000000, currency: 'USD', cycle: 'monthly', renewalDate: U.addMonths(today(), 1), status: 'active', users: [] };
    UI.modal({ title: x.id ? 'تعديل ' + x.name : 'تول جديد', wide: true, body: `<div class="grid2">${UI.field({ label: 'اسم التول', name: 'name', value: x.name, required: true })}${UI.field({ label: 'الحساب (الإيميل)', name: 'account', value: x.account, attrs: 'dir="ltr"', placeholder: 'acc1@company.com' })}
      ${UI.field({ label: 'رصيد التوكن في الدورة', name: 'quota', type: 'number', value: x.quota })}${UI.field({ label: 'الوحدة', name: 'unit', type: 'select', options: ['tokens', 'credits', 'requests', 'minutes'], value: x.unit })}
      ${UI.field({ label: '🟠 حد التحذير (رصيد متبقي) — "جهز رصيد"', name: 'warnQty', type: 'number', value: x.warnQty || '' })}${UI.field({ label: '🔴 الحد الحرج (رصيد متبقي) — "اشحن فورًا"', name: 'critQty', type: 'number', value: x.critQty || '' })}
      ${UI.field({ label: 'تاريخ التجديد', name: 'renewalDate', type: 'date', value: x.renewalDate })}${UI.field({ label: 'دورة الدفع', name: 'cycle', type: 'select', options: opts(CYC), value: x.cycle })}
      ${UI.field({ label: 'التكلفة', name: 'cost', type: 'number', value: x.cost || '' })}${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: x.currency })}
      ${UI.field({ label: 'القسم', name: 'dept', type: 'select', options: [''].concat(X.allDepts()), value: x.dept })}${UI.field({ label: 'رابط الـ Usage API / لوحة الاستهلاك', name: 'usageUrl', value: x.usageUrl, attrs: 'dir="ltr"' })}
      <div class="field full"><span>مين بيستخدمه</span><div class="chk-grid">${(DB.team || []).filter(m => !X.isExited(m)).map(m => `<label class="chk"><input type="checkbox" data-user="${m.id}" ${(x.users || []).includes(m.id) ? 'checked' : ''}> ${esc(m.name)}</label>`).join('')}</div></div></div>
      <p class="muted small">🔒 التوكن / API key مش بيتسجل هنا — مكانه الـ Vault أو السيرفر (مشفّر). هنا الاستهلاك بس.</p>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الاسم']]); if (U.num(d.critQty) && U.num(d.warnQty) && U.num(d.critQty) > U.num(d.warnQty)) throw new Error('الحد الحرج لازم يكون أقل من حد التحذير'); d.users = $$('[data-user]', m.el).filter(i => i.checked).map(i => i.dataset.user); const o = Object.assign({ status: 'active', history: [] }, x, d); if (!o.code) o.code = X.nextCode('TOOL'); C.upsert('tools', o, 'تول'); global.Router.render(); } });
  };
  P.tools = function (el) {
    const rows = DB.tools.filter(x => x.status !== 'cancelled').map(x => ({ x, f: X.forecast('tool', x) }));
    el.innerHTML = `<div class="page-head"><div><h1>التولات والتوكنات</h1><p class="sub">المتبقي من التوكن في كل حساب، والتوقع على متوسط استهلاك آخر 7 أيام: هيكفي لحد التجديد ولا لأ</p></div><div class="actions"><button class="btn primary" data-act="new">+ تول</button></div></div>
      <div class="cards mk-cards"><div class="card"><span>هيخلص قبل التجديد</span><b class="t-warn">${rows.filter(r => r.f.cls !== 'good').length}</b></div><div class="card"><span>عاجل (بكرة / خلص)</span><b class="t-bad">${rows.filter(r => r.f.cls === 'bad').length}</b></div><div class="card"><span>التكلفة الشهرية (${X.curSym()})</span><b>${U.money(U.sum(rows, r => perMonth(r.x.cost, r.x.currency, r.x.cycle)), false)}</b></div></div>
      <div class="panel">${rows.map(({ x, f }) => `<div class="tok-row big"><div class="tok-top"><span><a href="#/tool/${x.id}"><b>${esc(x.name)}</b></a> <span dir="ltr" class="mono">${esc(x.code)}</span> · <span dir="ltr" class="small">${esc(x.account || '')}</span></span>${(() => { const s = X.toolState ? X.toolState(x) : null; return s && (U.num(x.warnQty) || U.num(x.critQty)) ? `<b class="t-${s.lvl === 'crit' ? 'bad' : s.lvl === 'warn' ? 'warn' : 'good'}">${s.txt}</b>` : `<b class="t-${f.cls === 'good' ? 'good' : f.cls === 'warn' ? 'warn' : 'bad'}">${f.verdict}</b>`; })()} ${act('edit', x.id, 'تعديل')}</div>${hbar(f.pct, f.cls)}
        <small>متبقي ${f.pct}% من ${X.fmtQty(f.quota)} · استهلاك ${f.perDay ? X.fmtQty(f.perDay) + '/يوم' : '—'} · ${isFinite(f.daysLeft) ? 'يكفي ' + Math.floor(f.daysLeft) + ' يوم' : ''} · التجديد ${X.inDays(f.renewIn)} · ${esc((x.users || []).map(nm).join('، '))}</small> ${act('read', x.id, '📈 قراءة')}</div>`).join('') || '<div class="empty">لا توجد تولات</div>'}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'new') Fin.editTool(); if (b.dataset.act === 'edit') Fin.editTool(C.find('tools', b.dataset.id)); if (b.dataset.act === 'read') reading('tool', C.find('tools', b.dataset.id), 'توكن'); };
  };
  P.tool = function (el, id) {
    const x = C.find('tools', id); if (!x) { el.innerHTML = '<div class="empty">التول مش موجود</div>'; return; }
    const f = X.forecast('tool', x), sn = X.snapsOf('tool', id).slice().reverse();
    el.innerHTML = `<div class="page-head"><div><a href="#/tools" class="back">→ التولات</a><h1>${esc(x.name)} <span dir="ltr" class="mono">${esc(x.code)}</span></h1><p class="sub"><span dir="ltr">${esc(x.account || '')}</span> · ${esc(x.dept || '')}</p></div>
      <div class="actions"><button class="btn primary" data-act="read">📈 تسجيل قراءة</button><button class="btn" data-act="renew">🔁 تجديد الدورة</button>${x.usageUrl ? `<a class="btn ghost" href="${esc(x.usageUrl)}" target="_blank" rel="noopener">لوحة الاستهلاك ↗</a>` : ''}<button class="btn ghost" data-act="edit">تعديل</button><button class="btn ghost" data-act="cancel">إلغاء</button></div></div>
      <div class="cards mk-cards"><div class="card"><span>المتبقي</span><b class="t-${f.cls === 'good' ? 'good' : f.cls === 'warn' ? 'warn' : 'bad'}">${f.pct}%</b><small>${X.fmtQty(f.remaining)} من ${X.fmtQty(f.quota)}</small></div><div class="card"><span>متوسط آخر 7 أيام</span><b>${X.fmtQty(f.perDay)}</b><small>في اليوم</small></div><div class="card"><span>التوقع</span><b class="small-b">${f.verdict}</b></div><div class="card"><span>التجديد</span><b>${X.inDays(f.renewIn)}</b><small>${x.renewalDate || ''}</small></div><div class="card"><span>المستخدمين</span><b>${(x.users || []).length}</b><small>${esc((x.users || []).map(nm).join('، '))}</small></div></div>
      <div class="panel"><h2>اللقطات اليومية (usage_snapshots)</h2>${UI.table({ rows: sn, empty: 'لا توجد قراءات', columns: [{ label: 'التاريخ', render: s => s.date }, { label: 'المستخدم', cls: 'num', render: s => X.fmtQty(s.used) }, { label: 'المتبقي', cls: 'num', render: s => X.fmtQty(Math.max(0, U.num(x.quota) - U.num(s.used))) }, { label: 'المصدر', render: s => esc(s.source || '') }] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'read') reading('tool', x, 'توكن'); if (k === 'edit') Fin.editTool(x);
      if (k === 'renew' && confirm('تجديد الدورة؟ الاستهلاك هيرجع صفر والتجديد الجاي بعد دورة.')) { x.renewalDate = U.addMonths(x.renewalDate || today(), (CYC[x.cycle] || CYC.monthly)[1]); x.used = 0; DB.usageSnapshots.push({ id: U.uid(), refType: 'tool', refId: x.id, code: x.code, date: today(), used: 0, source: 'تجديد' }); x.history = (x.history || []).concat([{ date: today(), cost: x.cost, currency: x.currency }]); C.upsert('tools', x, 'تجديد تول'); X.event('اتجدد التول ' + x.code, { ref: x.code }); global.Router.render(); }
      if (k === 'cancel' && confirm('إلغاء التول؟')) { x.status = 'cancelled'; C.upsert('tools', x, 'إلغاء تول'); global.Router.go('#/tools'); } };
  };

  // ================= الدومينات و SSL والهوستنج (DOM) =================
  const DKIND = { domain: 'دومين', ssl: 'شهادة SSL', hosting: 'هوستنج' };
  Fin.editDomain = function (x) {
    x = x || { kind: 'domain', currency: X.cur(), autoRenew: true, status: 'active', expiry: U.addMonths(today(), 12) };
    UI.modal({ title: x.id ? 'تعديل ' + x.name : 'دومين / SSL / هوستنج', body: `<div class="grid2">${UI.field({ label: 'النوع', name: 'kind', type: 'select', options: Object.entries(DKIND).map(([k, v]) => ({ value: k, label: v })), value: x.kind })}${UI.field({ label: 'الاسم', name: 'name', value: x.name, required: true, placeholder: 'seg.example', attrs: 'dir="ltr"' })}
      ${UI.field({ label: 'المسجّل / المزود', name: 'registrar', value: x.registrar, placeholder: 'GoDaddy / Namecheap / Let\'s Encrypt / Hostinger' })}${UI.field({ label: 'تاريخ الانتهاء', name: 'expiry', type: 'date', value: x.expiry })}
      ${UI.field({ label: 'التكلفة السنوية', name: 'cost', type: 'number', value: x.cost || '' })}${UI.field({ label: 'العملة', name: 'currency', type: 'select', options: UI.opt.currencies(), value: x.currency })}
      ${UI.field({ label: 'تجديد تلقائي', name: 'autoRenew', type: 'checkbox', value: x.autoRenew })}${UI.field({ label: 'رابط لوحة التحكم', name: 'panel', value: x.panel, attrs: 'dir="ltr"' })}</div>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الاسم']]); const o = Object.assign({ status: 'active' }, x, d); if (!o.code) o.code = X.nextCode('DOM'); C.upsert('domains', o, DKIND[o.kind]); global.Router.render(); } });
  };
  P.domains = function (el) {
    const rows = DB.domains.filter(x => x.status !== 'cancelled').sort((a, b) => (a.expiry || '9').localeCompare(b.expiry || '9'));
    el.innerHTML = `<div class="page-head"><div><h1>الدومينات و SSL والهوستنج</h1><p class="sub">تاريخ انتهاء كل دومين وشهادة واستضافة — التنبيه قبلها بأسبوعين</p></div><div class="actions"><button class="btn primary" data-act="new">+ إضافة</button></div></div>
      <div class="cards mk-cards">${Object.entries(DKIND).map(([k, v]) => `<div class="card"><span>${v}</span><b>${rows.filter(x => x.kind === k).length}</b></div>`).join('')}<div class="card"><span>تنتهي خلال 30 يوم</span><b class="t-warn">${rows.filter(x => X.days(x.expiry) <= 30).length}</b></div></div>
      <div class="panel">${UI.table({ rows, empty: 'لا يوجد', columns: [{ label: 'الكود', render: x => `<span dir="ltr" class="mono">${esc(x.code)}</span>` }, { label: 'النوع', render: x => DKIND[x.kind] }, { label: 'الاسم', render: x => `<b dir="ltr">${esc(x.name)}</b><div class="muted small">${esc(x.registrar || '')}</div>` },
        { label: 'الانتهاء', render: x => { const n = X.days(x.expiry); return `<span class="${n < 0 ? 't-bad' : n <= 14 ? 't-warn' : ''}">${X.inDays(n)}</span><div class="muted small">${x.expiry || ''}${x.autoRenew ? ' · تلقائي' : ''}</div>`; } }, { label: 'سنويًا', cls: 'num', render: x => x.cost ? X.money(x.cost, x.currency) : '—' },
        { label: '', render: x => act('renew', x.id, '🔁 تجديد') + act('edit', x.id, 'تعديل') + act('del', x.id, 'إلغاء', 'danger') }] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const x = C.find('domains', b.dataset.id), k = b.dataset.act;
      if (k === 'new') Fin.editDomain(); if (k === 'edit') Fin.editDomain(x);
      if (k === 'renew') { x.expiry = U.addMonths(x.expiry || today(), x.kind === 'ssl' && /let/i.test(x.registrar || '') ? 3 : 12); C.upsert('domains', x, 'تجديد'); X.event('اتجدد ' + DKIND[x.kind] + ' ' + x.name + ' لحد ' + x.expiry, { ref: x.code }); global.Router.render(); }
      if (k === 'del' && confirm('إلغاء ' + x.name + '؟')) { x.status = 'cancelled'; C.upsert('domains', x, 'إلغاء'); global.Router.render(); } };
  };

  // ================= الأمان =================
  P.security = function (el) {
    const comps = live().filter(a => COMPUTERS.includes(a.type)), mobs = live().filter(a => a.type === 'mobile'), crit = DB.mailboxes.filter(b => b.status === 'active');
    const pc = (arr, f) => arr.length ? Math.round(arr.filter(f).length / arr.length * 100) : 0;
    const tog = (a, k) => `<input type="checkbox" data-tog="${k}" data-id="${a.id}" ${a[k] ? 'checked' : ''} aria-label="${k}">`;
    el.innerHTML = `<div class="page-head"><div><h1>الأمان</h1><p class="sub">الأنتي فيروس وتحديثات الويندوز والـ MDM على كل جهاز، والـ MFA على الحسابات المهمة — يتحدث يدوي أو من MDM / لوحة الأنتي فيروس</p></div></div>
      <div class="cards mk-cards"><div class="card"><span>الأنتي فيروس شغال</span><b>${pc(comps, a => a.av)}%</b></div><div class="card"><span>تحديثات ويندوز محدثة</span><b>${pc(comps, a => a.patched)}%</b></div><div class="card"><span>MFA على الحسابات المهمة</span><b>${pc(crit.filter(b => b.critical), b => b.mfa)}%</b></div><div class="card"><span>الموبايلات على MDM</span><b>${pc(mobs, a => a.mdm)}%</b></div><div class="card"><span>اللابتوبات على MDM</span><b>${pc(comps, a => a.mdm)}%</b></div></div>
      <div class="panel"><h2>الأجهزة</h2>${UI.table({ rows: comps.concat(mobs), columns: [{ label: 'الكود', render: a => `<a href="#/asset/${a.id}" dir="ltr" class="mono">${esc(a.tag)}</a>` }, { label: 'الجهاز', render: a => esc(Fin.assetName(a)) }, { label: 'مع', render: a => esc(nm(a.holderId) || X.deptOf(a)) },
        { label: 'أنتي فيروس', render: a => a.type === 'mobile' ? '—' : tog(a, 'av') }, { label: 'تحديثات', render: a => a.type === 'mobile' ? '—' : tog(a, 'patched') }, { label: 'MDM', render: a => tog(a, 'mdm') }] })}</div>
      <div class="panel"><h2>الحسابات و MFA</h2>${UI.table({ rows: crit, columns: [{ label: 'الحساب', render: b => `<b dir="ltr">${esc(b.address)}</b>` }, { label: 'لمين', render: b => esc(b.kind === 'shared' ? 'مشترك' : nm(b.holderId)) }, { label: 'مهم', render: b => `<input type="checkbox" data-mtog="critical" data-id="${b.id}" ${b.critical ? 'checked' : ''}>` }, { label: 'MFA', render: b => `<input type="checkbox" data-mtog="mfa" data-id="${b.id}" ${b.mfa ? 'checked' : ''}>` + (b.critical && !b.mfa ? ' <span class="badge b-bad">مهم ومن غير MFA</span>' : '') }] })}</div>
      <p class="muted small">🔒 مفيش باسوردات في النظام — ${X.settings().vaultUrl ? `<a href="${esc(X.settings().vaultUrl)}" target="_blank" rel="noopener">فتح الـ Vault ↗</a>` : 'رابط الـ Vault من المزامنة والإعدادات'}.</p>`;
    el.onchange = e => { const t = e.target.closest('[data-tog]'); if (t) { const a = C.find('assets', t.dataset.id); a[t.dataset.tog] = t.checked; C.upsert('assets', a, 'أمان'); return; } const m = e.target.closest('[data-mtog]'); if (m) { const b = C.find('mailboxes', m.dataset.id); b[m.dataset.mtog] = m.checked; C.upsert('mailboxes', b, 'أمان'); } };
  };

  // ================= الباك أب (BKP) =================
  Fin.editBackup = function (b) {
    b = b || { everyHours: 24, kind: 'سيرفر ملفات', status: 'on' };
    UI.modal({ title: b.id ? 'تعديل ' + b.name : 'مهمة باك أب', body: `<div class="grid2">${UI.field({ label: 'الاسم', name: 'name', value: b.name, required: true, placeholder: 'سيرفر الملفات' })}${UI.field({ label: 'النوع', name: 'kind', type: 'select', options: ['سيرفر ملفات', 'Google Workspace', 'قاعدة بيانات', 'الموقع', 'لابتوبات الإدارة', 'NAS'], value: b.kind })}${UI.field({ label: 'كل كام ساعة', name: 'everyHours', type: 'number', value: b.everyHours })}${UI.field({ label: 'الوجهة', name: 'target', value: b.target, placeholder: 'NAS / Google Drive / S3' })}${UI.field({ label: 'شغالة', name: 'on', type: 'checkbox', value: b.status !== 'off' })}</div>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الاسم']]); d.status = d.on ? 'on' : 'off'; delete d.on; const o = Object.assign({ runs: [] }, b, d); if (!o.code) o.code = X.nextCode('BKP'); C.upsert('backups', o, 'باك أب'); global.Router.render(); } });
  };
  P.backup = function (el) {
    el.innerHTML = `<div class="page-head"><div><h1>الباك أب</h1><p class="sub">آخر نسخة ناجحة لكل مهمة — لو عدّت المدة المحددة بيطلع تنبيه عاجل</p></div><div class="actions"><button class="btn primary" data-act="new">+ مهمة</button></div></div>
      <div class="panel">${UI.table({ rows: DB.backups, empty: 'لا توجد مهام', columns: [{ label: 'الكود', render: b => `<span dir="ltr" class="mono">${esc(b.code)}</span>` }, { label: 'المهمة', render: b => `<b>${esc(b.name)}</b><div class="muted small">${esc(b.kind || '')} → ${esc(b.target || '')}</div>` },
        { label: 'آخر نجاح', render: b => b.lastSuccess ? X.time(b.lastSuccess) + `<div class="muted small">${X.ago(b.lastSuccess)}</div>` : '—' }, { label: 'المدة', render: b => 'كل ' + b.everyHours + ' ساعة' },
        { label: 'الحالة', render: b => b.status === 'off' ? '<span class="badge b-muted">متوقفة</span>' : X.backupOk(b) ? '<span class="badge b-good">ناجح</span>' : `<span class="badge b-bad">متأخر ${X.backupLate(b)} ساعة</span>` },
        { label: '', render: b => act('ok', b.id, '✅ نجح دلوقتي') + act('fail', b.id, '✕ فشل') + act('edit', b.id, 'تعديل') }] })}</div>
      <div class="panel"><h2>آخر التشغيلات</h2>${UI.table({ rows: [].concat(...DB.backups.map(b => (b.runs || []).map(r => Object.assign({ b }, r)))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30), empty: '—', columns: [{ label: 'الوقت', render: r => X.time(r.at) }, { label: 'المهمة', render: r => esc(r.b.name) }, { label: 'النتيجة', render: r => r.ok ? '<span class="badge b-good">نجح</span>' : '<span class="badge b-bad">فشل</span>' }, { label: 'ملاحظة', render: r => esc(r.note || '') }] })}</div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const x = C.find('backups', b.dataset.id), k = b.dataset.act;
      if (k === 'new') Fin.editBackup(); if (k === 'edit') Fin.editBackup(x);
      if (k === 'ok' || k === 'fail') { const note = k === 'fail' ? (prompt('سبب الفشل:') || '') : ''; const at = new Date().toISOString(); x.runs = [{ at, ok: k === 'ok', note }].concat(x.runs || []).slice(0, 60); if (k === 'ok') x.lastSuccess = at; C.upsert('backups', x, 'باك أب'); X.event('باك أب ' + x.name + ': ' + (k === 'ok' ? 'نجح' : 'فشل ' + note), { ref: x.code }); global.Router.render(); } };
  };

  // ================= الموردين والمشتريات =================
  P.vendors = function (el) {
    const V = {};
    const v = n => { n = (n || '').trim(); if (!n) return null; return V[n] = V[n] || { name: n, assets: 0, buy: 0, repairs: 0, repairCost: 0, subs: 0, monthly: 0 }; };
    DB.assets.forEach(a => { const x = v(a.supplier); if (x) { x.assets++; x.buy += X.sar(a.cost, a.currency); } });
    DB.assetLog.filter(l => l.kind === 'repair' || l.kind === 'repairDone').forEach(l => { const x = v(l.vendor); if (x && l.kind === 'repair') { x.repairs++; } if (x && l.kind === 'repairDone') x.repairCost += U.num(l.cost); });
    DB.subscriptions.concat(DB.tools).filter(s => s.status !== 'cancelled').forEach(s => { const x = v(s.vendor || s.provider); if (x) { x.subs++; x.monthly += perMonth(s.cost, s.currency, s.cycle); } });
    DB.netPackages.forEach(s => { const x = v(s.provider); if (x) { x.subs++; x.monthly += perMonth(s.cost, s.currency, s.cycle); } });
    const fin = (DB.suppliers || []).map(s => s.name);
    const rows = Object.values(V).sort((a, b) => (b.buy + b.monthly * 12) - (a.buy + a.monthly * 12));
    el.innerHTML = `<div class="page-head"><div><h1>الموردين والمشتريات</h1><p class="sub">مين بنشتري منه الأجهزة، ومين بيصلّح، ومين بنجدد عنده — مربوط بالموردين في النظام المالي</p></div>${ITXrole() === 'admin' && !(global.APP_CONFIG || {}).standalone ? '<div class="actions"><a class="btn ghost" href="index.html#/suppliers">الموردين في النظام المالي ↗</a></div>' : ''}</div>
      <div class="panel">${UI.table({ rows, empty: 'لا يوجد', columns: [{ label: 'المورد', render: x => `<b>${esc(x.name)}</b>${fin.includes(x.name) ? ' <span class="badge b-info">في المالي</span>' : ''}` }, { label: 'أجهزة اتشرت', cls: 'num', render: x => x.assets || '—' }, { label: 'قيمة الشراء (' + X.curSym() + ')', cls: 'num', render: x => x.buy ? U.money(x.buy, false) : '—', sum: x => x.buy }, { label: 'صيانات', cls: 'num', render: x => x.repairs ? x.repairs + (x.repairCost ? ' · ' + U.money(x.repairCost, false) : '') : '—' }, { label: 'اشتراكات / تجديدات', cls: 'num', render: x => x.subs || '—' }, { label: 'شهريًا (' + X.curSym() + ')', cls: 'num', render: x => x.monthly ? U.money(x.monthly, false) : '—', sum: x => x.monthly }] })}</div>`;
  };
  const ITXrole = () => X.role();

  // ================= التكلفة =================
  P.cost = function (el) {
    const st = P.cost._s = P.cost._s || { cur: 'EGP' }, mc = Fin.monthlyCost(), cats = Object.keys(mc.byCat), f = v => U.money(X.toCur(v, st.cur), false);
    const depts = Object.entries(mc.byDept).sort((a, b) => b[1].total - a[1].total), max = Math.max(1, ...depts.map(d => d[1].total));
    el.innerHTML = `<div class="page-head"><div><h1>التكلفة</h1><p class="sub">المصروف المتكرر الشهري: تولات · باقات · شرائح · تراخيص — مقسم على الأقسام حسب المستخدمين</p></div><div class="actions"><select data-cur><option value="EGP" ${st.cur === 'EGP' ? 'selected' : ''}>ج.م</option><option value="SAR" ${st.cur === 'SAR' ? 'selected' : ''}>ر.س</option></select><button class="btn ghost" data-act="csv">⬇ Excel</button><button class="btn ghost" data-act="print">🖨 PDF</button></div></div>
      <div class="cards mk-cards"><div class="card hero"><span>الإجمالي الشهري</span><b>${f(mc.total)}</b><small>${st.cur === 'EGP' ? 'ج.م' : 'ر.س'} · سنويًا ${f(mc.total * 12)}</small></div>${cats.map(k => `<div class="card"><span>${k}</span><b>${f(mc.byCat[k])}</b></div>`).join('')}</div>
      <div class="panel"><h2>حسب القسم</h2>${UI.table({ rows: depts, columns: [{ label: 'القسم', render: d => `<b>${esc(d[0])}</b>` }, { label: '', render: d => hbar(d[1].total / max * 100, 'used') }].concat(cats.map(k => ({ label: k, cls: 'num', render: d => d[1][k] ? f(d[1][k]) : '—' }))).concat([{ label: 'الإجمالي', cls: 'num', render: d => `<b>${f(d[1].total)}</b>` }]) })}</div>
      <div class="panel"><h2>التفاصيل</h2>${UI.table({ rows: mc.rows.sort((a, b) => b.sar - a.sar), columns: [{ label: 'البند', render: r => esc(r.cat) }, { label: 'الاسم', render: r => esc(r.name) + ` <span dir="ltr" class="mono small">${esc(r.code || '')}</span>` }, { label: 'الأقسام', render: r => esc(r.depts.join('، ') || 'عام') }, { label: 'شهريًا', cls: 'num', render: r => f(r.sar) }] })}</div>`;
    el.onchange = e => { if (e.target.matches('[data-cur]')) { st.cur = e.target.value; global.Router.render(); } };
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'csv') UI.csv('it-monthly-cost', ['القسم'].concat(cats, ['الإجمالي']), depts.map(d => [d[0]].concat(cats.map(k => U.round(X.toCur(d[1][k] || 0, st.cur))), [U.round(X.toCur(d[1].total, st.cur))])));
      if (b.dataset.act === 'print') UI.print(UI.printHeader('تكلفة IT الشهرية لكل قسم', '', today(), 'Monthly IT Cost by Department') + $('.panel', el).outerHTML.replace(/<span class="hbar[^]*?<\/span>/g, '')); };
  };

  // ================= سجل الحركات =================
  P.itlog = function (el) {
    const L = DB.itLog.map(x => ({ at: x.at, by: x.by, text: x.text, ref: x.ref, emp: x.empId, src: 'دورة / نظام' }))
      .concat(DB.assetLog.map(x => { const a = C.find('assets', x.assetId) || DB.lines.find(l => l.id === x.assetId) || {}; return { at: x.createdAt || (x.date + 'T00:00:00'), by: '', text: ((Fin.LOGK || {})[x.kind] || x.kind) + (x.holderId ? ' — ' + nm(x.holderId) : '') + (x.note ? ' · ' + x.note : ''), ref: a.tag || a.code || '', emp: x.holderId, src: 'عهدة' }; }))
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    UI.listPage(el, { title: 'سجل الحركات', subtitle: 'كل حركة اتعملت من النظام (تسليم، استلام، مسح، حجز، إخلاء، مستندات، مزامنة) — Audit Log', csvName: 'it-audit-log',
      filters: [{ key: 'src', options: [{ value: '', label: 'كل الحركات' }, 'عهدة', 'دورة / نظام'] }],
      rows: s => L.filter(x => !s.src || x.src === s.src).slice(0, 1500), searchText: x => [x.text, x.ref, x.by, nm(x.emp)].join(' '), empty: 'لا توجد حركات',
      columns: [{ label: 'الوقت', render: x => X.time(x.at), text: x => x.at }, { label: 'الحركة', render: x => esc(x.text), text: x => x.text }, { label: 'المرجع', render: x => `<span dir="ltr" class="mono">${esc(x.ref)}</span>`, text: x => x.ref }, { label: 'بواسطة', render: x => esc(x.by || ''), text: x => x.by }] });
  };

  // ================= أخطاء المزامنة =================
  P.syncerr = function (el) {
    const s = X.settings();
    UI.listPage(el, { title: 'أخطاء المزامنة', subtitle: 'صفوف ناقصة أو مكررة أو قسم / تاريخ غلط — تتصلح في الشيت نفسه، والمزامنة الجاية بتقفلها لوحدها', csvName: 'sync-errors',
      actions: '<button class="btn primary" data-act="sync">🔄 مزامنة دلوقتي</button>' + (s.sheetId ? `<a class="btn ghost" href="https://docs.google.com/spreadsheets/d/${esc(s.sheetId)}" target="_blank" rel="noopener">فتح الشيت ↗</a>` : ''),
      filters: [{ key: 'st', options: [{ value: 'open', label: 'المفتوحة' }, { value: '', label: 'الكل' }, { value: 'fixed', label: 'اتصلحت' }] }], initial: { st: 'open' },
      rows: f => DB.syncErrors.filter(e => !f.st || (f.st === 'open' ? e.status !== 'fixed' : e.status === 'fixed')), searchText: e => [e.sheet, e.code, e.problem].join(' '), empty: 'مفيش أخطاء 👌',
      columns: [{ label: 'الشيت', render: e => esc(e.sheet), text: e => e.sheet }, { label: 'الصف', cls: 'num', render: e => e.row, text: e => e.row }, { label: 'الكود', render: e => `<span dir="ltr" class="mono">${esc(e.code || '—')}</span>`, text: e => e.code }, { label: 'المشكلة', render: e => esc(e.problem), text: e => e.problem }, { label: 'من', render: e => X.ago(e.at), text: e => e.at }, { label: 'الحالة', render: e => e.status === 'fixed' ? '<span class="badge b-good">اتصلح</span>' : '<span class="badge b-warn">مفتوح</span>', text: e => e.status }, { label: '', noExport: true, render: e => e.status !== 'fixed' ? act('fix', e.id, 'اتصلح') : '' }],
      onAction: (k, id) => { if (k === 'sync') X.sync(true).then(() => global.Router.render()); if (k === 'fix') { const e = DB.syncErrors.find(x => x.id === id); e.status = 'fixed'; e.fixedAt = new Date().toISOString(); global.Store.save(); global.Router.render(); } } });
  };

  // ================= المزامنة والإعدادات =================
  P.itsettings = function (el) {
    const s = X.settings();
    el.innerHTML = `<div class="page-head"><div><h1>المزامنة والإعدادات</h1><p class="sub">الشيتات = الداتا الأساسية · الحركات من النظام بس · الباسوردات متشفّرة في خزنة الباسوردات</p></div>${global.Vault && global.Vault.allowed() ? '<div class="actions"><button class="btn" data-act="vaultMaster">🔑 تغيير الباسورد الرئيسي للخزنة</button></div>' : ''}</div>
      <div class="dash-grid"><div class="panel"><h2>1 · Google Sheets (Sync Worker)</h2>
        <div class="grid2">${UI.field({ label: 'ID الشيت', name: 'sheetId', value: s.sheetId, attrs: 'dir="ltr"', full: true, hint: 'من رابط الشيت: docs.google.com/spreadsheets/d/<b>ID</b>/edit — والشيت لازم يكون "أي حد معاه الرابط يقدر يشوف"' })}
        ${UI.field({ label: 'ID شيت سكربت WE (الباقات والاستهلاك)', name: 'usageSheetId', value: s.usageSheetId || '', attrs: 'dir="ltr"', full: true, hint: 'اختياري — لو فاضي الباقات والاستهلاك بيتقروا من الشيت الأساسي' })}
        ${UI.field({ label: 'المزامنة كل (دقيقة)', name: 'syncEvery', type: 'number', value: s.syncEvery })}</div>
        <h3 class="h3s">أسماء التابات</h3><div class="grid2">${Object.entries(s.sheetTabs).map(([k, v]) => UI.field({ label: { assets: 'الأجهزة والموبايلات والإكسسوارات', lines: 'الشرائح السعودية والمصرية', tools: 'التولات', netPackages: 'الباقات', subscriptions: 'التراخيص', domains: 'الدومينات و SSL', consumables: 'المستهلكات', team: 'الموظفين والأقسام', usage: 'الاستهلاك اليومي (الجيجات والتوكن)' }[k] || k, name: 'tab_' + k, value: v })).join('')}</div>
        <p class="muted small">آخر مزامنة: ${s.lastSync ? X.time(s.lastSync) + ' (' + X.ago(s.lastSync) + ')' + (s.lastSyncOk ? '' : ' — <span class="t-bad">فيها أخطاء</span>') : 'لسه'}</p>
        <div class="actions"><button class="btn primary" data-act="sync">🔄 مزامنة دلوقتي</button><label class="btn ghost">⬆ استيراد CSV <input type="file" accept=".csv,text/csv" hidden data-csv></label><select data-csvcoll>${Object.keys(s.sheetTabs).map(k => `<option value="${k}">${esc(s.sheetTabs[k])}</option>`).join('')}</select><button class="btn ghost" data-act="tpl">⬇ قالب الأعمدة</button></div>
        <p class="muted small">المزامنة بتقرا الكود والقسم والتاريخ وبتراجعهم، وبتكتب البيانات الثابتة بس (الموديل، السيريال، الضمان…) — الحالة ومع مين بتتغير من النظام بس.</p></div>
      <div class="panel"><h2>2 · ${X.hasBranches() ? 'الشركات والفروع' : 'الفروع'}</h2><div class="field full"><span>${X.hasBranches() ? 'شركة في كل سطر: الاسم: فرع، فرع، …' : 'فرع في كل سطر (الكود اللي في كود الجهاز بيفضل زي ما هو)'}</span><textarea name="companies" rows="4">${esc(s.companies.map(c => c.name + ': ' + c.branches.join('، ')).join('\n'))}</textarea></div>
        <h2>3 · التنبيهات (Telegram)</h2><div class="grid2">${UI.field({ label: 'Bot Token', name: 'telegramToken', value: s.telegramToken, attrs: 'dir="ltr" autocomplete="off"' })}${UI.field({ label: 'Chat ID', name: 'telegramChat', value: s.telegramChat, attrs: 'dir="ltr"' })}</div>
        <p class="muted small">⚠️ في النسخة دي التوكن بيتحفظ في المتصفح. عند الربط بالسيرفر يتنقل هناك مشفّر (قاعدة "التوكنات مشفّرة").</p>
        <h2>4 · أخرى</h2><div class="grid2">${UI.field({ label: 'اسم مسئول IT (في بيان العهد)', name: 'itOfficerName', value: s.itOfficerName || '' })}${UI.field({ label: 'المسمى الوظيفي لمسئول IT', name: 'itOfficerTitle', value: s.itOfficerTitle || 'مسئول تقنية المعلومات' })}${UI.field({ label: 'قسم مسئول IT (نموذج استلام عهدة)', name: 'itOfficerDept', value: s.itOfficerDept || 'IT' })}${UI.field({ label: 'رابط الـ Vault (Bitwarden / 1Password)', name: 'vaultUrl', value: s.vaultUrl, attrs: 'dir="ltr"' })}${UI.field({ label: 'عمر الإحلال (سنين)', name: 'replaceYears', type: 'number', value: s.replaceYears })}${UI.field({ label: 'مدة الاحتفاظ بالإيميل بعد الإخلاء (يوم)', name: 'mailRetentionDays', type: 'number', value: s.mailRetentionDays })}${UI.field({ label: 'رابط صفحة التقديم (للـ QR)', name: 'onboardBase', value: s.onboardBase, attrs: 'dir="ltr"', placeholder: location.origin + location.pathname.replace(/[^/]*$/, '') + 'apply.html' })}</div>
        <div class="actions"><button class="btn primary" data-act="save">حفظ الإعدادات</button></div></div></div>`;
    el.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const k = b.dataset.act;
      if (k === 'vaultMaster') return global.Vault.changeMaster().catch(er => { if (er.message !== 'cancel') UI.toast(er.message, 'err'); });
      if (k === 'save' || k === 'sync') {
        const d = UI.form(el); Object.keys(s.sheetTabs).forEach(t => { s.sheetTabs[t] = d['tab_' + t] || ''; });
        ['sheetId', 'usageSheetId', 'telegramToken', 'telegramChat', 'vaultUrl', 'onboardBase', 'itOfficerName', 'itOfficerTitle', 'itOfficerDept'].forEach(f => s[f] = d[f]); ['syncEvery', 'replaceYears', 'mailRetentionDays'].forEach(f => s[f] = U.num(d[f]) || s[f]);
        const cos = String($('[name=companies]', el).value || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, br] = l.split(':'); const old = s.companies.find(c => c.name === n.trim()) || {}; return Object.assign({ name: n.trim(), branches: String(br || '').split(/[،,]/).map(x => x.trim()).filter(Boolean) }, old.code ? { code: old.code } : {}); });
        if (cos.length) s.companies = cos; global.Store.save(); X.init();
        if (k === 'save') UI.toast('اتحفظت الإعدادات'); else X.sync(true).then(() => global.Router.render());
      }
      if (k === 'tpl') { const coll = $('[data-csvcoll]', el).value, heads = { assets: ['الكود', 'النوع', 'الماركة', 'الموديل', 'السيريال', 'الشركة', 'الفرع', 'القسم', 'تاريخ الشراء', 'نهاية الضمان', 'السعر', 'العملة', 'المورد'], lines: ['الكود', 'الرقم', 'شركة الاتصالات', 'الباقة', 'التجديد', 'التكلفة', 'العملة'], tools: ['الكود', 'الاسم', 'الحساب', 'الحصة', 'التجديد', 'التكلفة', 'العملة', 'القسم'], netPackages: ['الكود', 'الاسم', 'الحصة', 'التجديد', 'التكلفة', 'العملة', 'الفرع'], subscriptions: ['الكود', 'الاسم', 'المقاعد', 'التجديد', 'التكلفة', 'العملة'], domains: ['الكود', 'الاسم', 'الصنف', 'الانتهاء', 'التكلفة', 'العملة'], consumables: ['الكود', 'الاسم', 'الكمية', 'الحد الأدنى', 'الوحدة'], team: ['كود الموظف', 'الاسم', 'الوظيفة', 'القسم', 'الإيميل', 'الشركة', 'الفرع'], usage: ['الكود', 'التاريخ', 'المستخدم'] }[coll]; UI.csv('template-' + coll, heads, []); }
    };
    el.onchange = e => { const f = e.target.closest('[data-csv]'); if (!f || !f.files[0]) return; const coll = $('[data-csvcoll]', el).value, r = new FileReader(); r.onload = () => { const res = X.importRows(coll, X.parseCSV(r.result), X.settings().sheetTabs[coll] || coll); X.event('استيراد CSV (' + coll + '): +' + res.added + ' ~' + res.updated + (res.errors ? ' · ' + res.errors + ' أخطاء' : ''), { kind: 'sync' }); UI.toast('اتضاف ' + res.added + ' · اتحدث ' + res.updated + (res.errors ? ' · ' + res.errors + ' أخطاء (شوف أخطاء المزامنة)' : ''), res.errors ? 'warn' : 'ok'); f.value = ''; }; r.readAsText(f.files[0]); };
  };
})(window);
