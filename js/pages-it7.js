/* =========================================================
   pages-it7.js — M02 (الأصول) + M03 (رحلة الموظف): الأجزاء الناقصة من المواصفة
   M02: أكتر من شاشة للجهاز · الحالة الفنية · ألوان الاختيارات (الشركة/الفئة/الحالة) قابلة للتعديل
   M03: مصفوفة القرار الأربع (الفني السلبي ← أرشيف) · لوحات المقابلات/الانتظار/المقبولين/الأرشيف
        تقييم HR والفني /10 بزرار اعتماد · بيانات استمارة التقديم · مسوغات التعيين الخمسة (التجنيد للذكور بس)
        إقرار استلام العمل (طباعة) · تبويب "الملفات" في التعيينات (NDA / اللائحة / العقد بإصدارات لكل شركة)
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core, P = global.Pages, UI = global.UI, Fin = global.Fin = global.Fin || {}, X = global.ITX;
  const today = () => U.today();
  const esc = s => U.esc(s);
  const me = () => X.me().name || '';
  const arr = k => (DB[k] = DB[k] || []);
  const render = () => global.Router.render();
  const isHR = () => ['admin', 'hr'].includes(X.role());
  // ربط handler على #main من غير ما يتكرر مع كل render (الـ Router بيصفّر onclick بس)
  const capture = (el, key, fn) => { if (el['_h_' + key]) el.removeEventListener('click', el['_h_' + key], true); const h = location.hash, g = e => { if (location.hash === h) fn(e); }; el['_h_' + key] = g; el.addEventListener('click', g, true); };
  const stop = e => { e.stopPropagation(); e.preventDefault(); };

  // ================= M02: صفحة الجهاز — الشاشات والحالة =================
  const MON_SIZES = ['17"', '18.5"', '19"', '20"', '21.5"', '22"', '23"', '24"', 'IPS 23"', 'IPS 24"', '27"', 'AIO', 'LTP', 'mob', 'NO'];
  const baseAsset = P.asset;
  if (baseAsset) P.asset = function (el, id) {
    baseAsset(el, id);
    const a = DB.assets.find(x => x.id === id); if (!a) return;
    const ms = X.monitorsOf(a);
    el.insertAdjacentHTML('beforeend', `<div class="dash-grid" style="margin-top:14px">
      <div class="panel"><div class="panel-head"><h2>🖵 الشاشات (${ms.length})</h2><button class="btn sm" data-m2="addmon">+ شاشة</button></div>
        ${ms.map((m, i) => `<div class="mon-row"><b dir="ltr">${esc(m.size || '—')}</b><span>${esc(m.brand || '')}</span>${m.serial ? `<span class="mono small" dir="ltr">${esc(m.serial)}</span>` : ''}${m.tag ? `<span class="mono small" dir="ltr">${esc(m.tag)}</span>` : ''}<span class="spacer" style="flex:1"></span>${m.src === 'sheet' ? '<small class="muted">من شيت الجرد</small>' : `<button class="link danger" data-m2="delmon" data-i="${i - (ms[0] && ms[0].src === 'sheet' ? 1 : 0)}">شيل</button>`}</div>`).join('') || '<p class="muted">مفيش شاشة مربوطة</p>'}
        <p class="muted small">الجهاز ممكن يتربط بأكتر من شاشة من غير ما صفه يتكرر. الشاشة اللي في الشيت بتتعدل من الشيت بس.</p></div>
      <div class="panel"><h2>الحالة</h2><p>حالة الشيت: ${X.optChip('status', X.sheetStatusOf(a))} · الفئة: ${X.optChip('cat', X.catCode(a), ' dir="ltr"')} · ${esc(X.coLabel())}: ${X.optChip('company', X.companyOf(a))}</p>
        <p>الحالة الفنية: <b>${esc(X.techCond(a))}</b> <span class="muted small">(منفصلة عن مكان الجهاز — "مستخدم" مش معناها إنه سليم)</span></p>
        <p>الملحقات: ${X.ACC.map(([k, n]) => `<span class="opt-chip" style="color:${(a.acc || {})[k] ? '#16a34a' : '#9ca3af'};border-color:currentColor">${(a.acc || {})[k] ? '✓' : '✕'} ${n}</span>`).join(' ')}</p></div></div>`);
    capture(el, 'm2', e => {
      const b = e.target.closest('[data-m2]'); if (!b) return; stop(e);
      if (b.dataset.m2 === 'delmon' && confirm('شيل الشاشة دي من الجهاز؟')) { const i = +b.dataset.i; a.monitors = (a.monitors || []).filter((_, k) => k !== i); C.upsert('assets', a, 'شاشات الجهاز'); X.event(a.tag + ': اتشالت شاشة', { ref: a.tag }); render(); }
      if (b.dataset.m2 === 'addmon') UI.modal({ title: '🖵 ربط شاشة بـ ' + a.tag, saveLabel: 'ربط', body: `<div class="grid2">
        ${UI.field({ label: 'المقاس / النوع', name: 'size', type: 'select', options: Fin.list ? Fin.list('monSizes') : MON_SIZES })}${UI.field({ label: 'الماركة', name: 'brand' })}
        ${UI.field({ label: 'سريال الشاشة', name: 'serial', attrs: 'dir="ltr"' })}${UI.field({ label: 'كود الأصل (لو الشاشة ليها كود mon)', name: 'tag', attrs: 'dir="ltr"' })}</div>`,
        onSave: m => { const d = UI.form(m.el);
          if (d.serial) { const dup = DB.assets.find(o => o.id !== a.id && X.monitorsOf(o).some(x => x.serial && x.serial.toLowerCase() === d.serial.toLowerCase())); if (dup) throw new Error('السريال ده مربوط بالفعل بجهاز ' + dup.tag); }
          a.monitors = (a.monitors || []).concat([{ size: d.size, brand: d.brand, serial: d.serial, tag: d.tag, linkedAt: today(), by: me() }]); C.upsert('assets', a, 'شاشات الجهاز'); X.event(a.tag + ': اتربطت شاشة ' + d.size, { ref: a.tag }); render(); } });
    });
  };

  // ================= M02: ألوان الاختيارات (من الشركات والفروع والأقسام) =================
  const baseOrgs = P.orgs;
  if (baseOrgs) P.orgs = function (el) {
    baseOrgs(el);
    const cos = (X.settings().companies || []).map(c => c.name);
    const row = (f, v, label) => `<label class="mon-row"><input type="color" data-col-f="${f}" data-col-v="${esc(v)}" value="${X.optColor(f, v)}"> ${X.optChip(f, v)} <span class="muted small">${esc(label || '')}</span></label>`;
    el.insertAdjacentHTML('beforeend', `<div class="panel" style="margin-top:14px"><div class="panel-head"><h2>🎨 ألوان الاختيارات</h2><button class="btn primary sm" data-col-save>حفظ الألوان</button></div>
      <p class="muted small">اللون بيظهر على شريحة الاختيار نفسها بس (مش الصف كله)، والنص ظاهر دايمًا. أي ${esc(X.coLabel())} جديد تقدر تديله لون من هنا من غير تعديل كود.</p>
      <div class="tri-grid"><div><h3>${esc(X.coLabel())}</h3>${cos.map(c => row('company', c)).join('')}</div>
      <div><h3>الحالات السبع</h3>${X.SHEET_ST.map(s => row('status', s)).join('')}</div>
      <div><h3>الفئات العشر</h3>${X.CATS.map(c => row('cat', c[0] === 'MOB' ? ((global.BRAND || {}).typeCodes || {}).mobile || 'MOB' : c[0], c[2])).join('')}</div></div></div>`);
    capture(el, 'col', e => { if (!e.target.closest('[data-col-save]')) return; stop(e);
      const oc = DB.settings.optColors = DB.settings.optColors || {};
      el.querySelectorAll('[data-col-f]').forEach(i => { (oc[i.dataset.colF] = oc[i.dataset.colF] || {})[i.dataset.colV] = i.value; });
      global.Store.save(); UI.toast('اتحفظت الألوان'); render(); });
  };

  // ================= M03: مصفوفة القرار =================
  X.CSTATUS.waiting = ['قائمة الانتظار', 'Waiting List', 'warn'];
  const BOARDS = {
    interviews: ['🗓 المقابلات', ['applied', 'interview', 'hrEval', 'techEval', 'pending']],
    waiting: ['⏳ قائمة الانتظار', ['waiting']],
    onboarding: ['✅ المقبولين / التعيين', ['accepted', 'docs', 'joining', 'handover', 'signature', 'active']],
    archive: ['🗄 الأرشيف (غير مقبول)', ['rejected']],
  };
  // الفني × HR ← النتيجة (محسومة): الفني السلبي يمنع التعيين حتى لو HR وافقت
  Fin.decisionMatrix = (tech, hr) => tech === 'accept' ? (hr === 'accept' ? 'accepted' : 'waiting') : 'rejected';
  const RES = { accepted: ['✓ Accepted / Onboarding', 't-good'], waiting: ['⏳ Waiting List', 't-warn'], rejected: ['✕ Rejected Archive', 't-bad'] };
  const ivOf = (c, k) => (c.interviews || []).filter(i => i.kind === k && i.evaluatedAt && ['accept', 'reject'].includes(i.recommendation)).slice(-1)[0];

  function decide(c) {
    if (!isHR()) return UI.toast('القرار النهائي بتعتمده HR بس', 'warn');
    const tech = ivOf(c, 'tech'), hr = ivOf(c, 'hr');
    if (!tech || !hr) return UI.toast('لازم المقابلتين (HR والفنية) يتعتمدوا بتوصية قبول أو رفض الأول', 'warn');
    const prev = c.decision || {};
    UI.modal({ title: 'القرار النهائي (HR) — ' + c.name, saveLabel: 'اعتماد القرار', body: `
      <table class="tbl compact"><tbody><tr><td>توصية المقيّم الفني</td><td><b class="${tech.recommendation === 'accept' ? 't-good' : 't-bad'}">${tech.recommendation === 'accept' ? 'Accepted' : 'Not Accepted'}</b> · ${esc(tech.evaluator || '')} · ${esc(tech.score || '')}/10</td></tr>
      <tr><td>تقييم مقابلة HR</td><td>${hr.recommendation === 'accept' ? 'Accepted' : 'Not Accepted'} · ${esc(hr.evaluator || '')} · ${esc(hr.score || '')}/10</td></tr></tbody></table>
      <div class="grid2">${UI.field({ label: 'توصية HR النهائية', name: 'hrRec', type: 'select', options: [{ value: 'accept', label: 'Accepted' }, { value: 'reject', label: 'Not Accepted / مش مناسب للنزول دلوقتي' }], value: prev.hrRec || hr.recommendation })}
      ${UI.field({ label: 'تاريخ المراجعة (لقائمة الانتظار)', name: 'reviewDate', type: 'date', value: prev.reviewDate || U.addDays(today(), 30) })}
      ${UI.field({ label: 'سبب القرار', name: 'reason', full: true, value: '' })}</div>
      <p class="dec-out" style="font-size:1.1em"></p>
      <p class="muted small">النتيجة بتتحسب من المصفوفة المعتمدة ومينفعش تتغير يدوي: الفني قبول + HR قبول ← تعيين · الفني قبول + HR لا ← انتظار · الفني رفض ← أرشيف (حتى لو HR وافقت).</p>`,
      onOpen: m => { const upd = () => { const r = Fin.decisionMatrix(tech.recommendation, m.el.querySelector('[name=hrRec]').value); m.el.querySelector('.dec-out').innerHTML = 'النتيجة: <b class="' + RES[r][1] + '">' + RES[r][0] + '</b>'; }; m.el.querySelector('[name=hrRec]').onchange = upd; upd(); },
      onSave: m => { const d = UI.form(m.el), result = Fin.decisionMatrix(tech.recommendation, d.hrRec);
        if (!d.reason) throw new Error('اكتب سبب القرار');
        if (result === 'waiting' && !d.reviewDate) throw new Error('حدد تاريخ المراجعة');
        const hist = (prev.history || []).concat(prev.result ? [Object.assign({}, prev, { history: undefined })] : []);
        c.decision = { result, techRec: tech.recommendation, hrRec: d.hrRec, by: me(), at: today(), atISO: new Date().toISOString(), reason: d.reason, note: d.reason, reviewDate: result === 'waiting' ? d.reviewDate : '', version: (prev.version || 0) + 1, history: hist };
        c.status = result; if (result === 'rejected') { c.closedAt = today(); } else delete c.closedAt;
        C.upsert('candidates', c, 'القرار النهائي'); X.event('القرار النهائي لـ ' + c.no + ': ' + RES[result][0] + ' (v' + c.decision.version + ')', { ref: c.no }); render(); } });
  }

  // تقييم المقابلة /10 بنفس بنود الاستمارة (For Company Use Only) — مسودة ثم اعتماد
  const CRIT = { hr: [['pastExp', 'Past EXP'], ['why', 'Why'], ['strength', 'Strength'], ['weakness', 'Weakness'], ['future', 'Future plans']], tech: [['performance', 'Performance'], ['behavior', 'Behavior'], ['team', 'Team Dynamic'], ['skills', 'Skills']] };
  function evaluate(c, i) {
    const cr = CRIT[i.kind] || CRIT.hr, old = i.crit || i.draft || {};
    UI.modal({ title: (i.kind === 'hr' ? 'HR Feedback' : 'Technical Feedback') + ' — ' + c.name, saveLabel: '✔ اعتماد التقييم', extraButtons: '<button class="btn" data-draft>حفظ مسودة</button>',
      body: `<div class="grid2">${UI.field({ label: 'حضر؟', name: 'attended', type: 'select', options: [{ value: 'yes', label: 'حضر' }, { value: 'no', label: 'محضرش' }] })}${UI.field({ label: 'اسم المقيّم', name: 'evaluator', value: i.evaluator || i.interviewer || me() })}
        ${cr.map(([k, l]) => UI.field({ label: l + ' (/10)', name: 'c_' + k, type: 'number', value: old[k] != null ? old[k] : '' })).join('')}
        ${UI.field({ label: 'التوصية', name: 'recommendation', type: 'select', options: [{ value: 'accept', label: 'Accepted' }, { value: 'reject', label: 'Not Accepted' }], value: i.recommendation || (old.recommendation) })}
        ${UI.field({ label: 'Note', name: 'notes', type: 'textarea', full: true, value: i.notes || old.notes || '' })}</div><p class="muted small">التقييم مش بيتحسب مكتمل غير بعد "اعتماد" — بيتختم باسم المقيّم والتاريخ. الدرجات مش بتحدد القبول لوحدها.</p>`,
      onOpen: m => { m.el.querySelector('[data-draft]').onclick = () => { const d = UI.form(m.el), dr = { notes: d.notes, recommendation: d.recommendation }; cr.forEach(([k]) => { if (d['c_' + k] !== '') dr[k] = U.num(d['c_' + k]); }); i.draft = dr; C.upsert('candidates', c, 'مسودة تقييم'); m.close(); UI.toast('اتحفظت المسودة'); render(); }; },
      onSave: m => { const d = UI.form(m.el);
        if (d.attended === 'no') { i.attended = false; C.upsert('candidates', c, 'تقييم'); X.event(c.no + ': محضرش المقابلة', { ref: c.no }); return render(); }
        const crit = {}; cr.forEach(([k, l]) => { const v = U.num(d['c_' + k]); if (d['c_' + k] === '' || v < 0 || v > 10) throw new Error('اكتب درجة من 0 لـ 10 لـ ' + l); crit[k] = v; });
        if (!d.recommendation) throw new Error('اختار التوصية');
        Object.assign(i, { attended: true, crit, score: Math.round(U.sum(Object.values(crit), v => v) / cr.length * 10) / 10, scale: 10, recommendation: d.recommendation, evaluator: d.evaluator, notes: d.notes, evaluatedAt: today(), approvedAt: new Date().toISOString(), approvedBy: me() }); delete i.draft;
        if (!['accepted', 'waiting', 'rejected'].includes(c.status)) c.status = i.kind === 'hr' ? 'hrEval' : 'techEval';
        C.upsert('candidates', c, 'تقييم'); X.event((i.kind === 'hr' ? 'HR Feedback' : 'Technical Feedback') + ' اتعتمد · ' + c.no + ' · ' + i.score + '/10', { ref: c.no }); render(); } });
  }

  // ================= M03: استمارة التقديم (حقول F01) =================
  const MIL = ['أدى الخدمة', 'معفى', 'مؤجل', 'لم يحن موعده'];
  const baseEditCand = Fin.editCand;
  Fin.editCand = function (c) {
    if (!isHR()) return baseEditCand(c);
    const isNew = !c; c = c || { source: 'استقبال', appliedAt: today(), status: 'applied', interviews: [], checkpoints: [] };
    const F = (o) => UI.field(Object.assign({ value: c[o.name] }, o));
    UI.modal({ title: isNew ? 'مرشح جديد — استمارة التقديم' : 'تعديل ' + c.no, wide: true, body: `<div class="grid4">
      ${F({ label: 'الاسم', name: 'name', required: true })}${F({ label: 'تاريخ الطلب', name: 'appliedAt', type: 'date' })}${F({ label: 'الوظيفة المطلوبة', name: 'jobTitle' })}${F({ label: 'القسم', name: 'dept', type: 'select', options: [''].concat(X.allDepts()) })}
      ${F({ label: 'طلب الاحتياج', name: 'reqId', type: 'select', options: [{ value: '', label: '— —' }].concat(DB.requisitions.filter(r => r.status === 'open' || r.id === c.reqId).map(r => ({ value: r.id, label: r.no + ' · ' + r.title }))) })}
      ${F({ label: 'المصدر', name: 'source', type: 'select', options: Fin.list ? Fin.list('candSources') : ['QR Code', 'Google Form', 'استقبال', 'إحالة', 'LinkedIn', 'Wuzzuf / Bayt'] })}${F({ label: 'الراتب المتوقع', name: 'expectedSalary', type: 'number' })}${F({ label: 'مدة الإخطار قبل ترك العمل الحالي', name: 'noticePeriod', placeholder: 'مثال: شهر' })}
      ${F({ label: 'النوع (لقاعدة التجنيد)', name: 'gender', type: 'select', options: [{ value: '', label: '— تحدده HR —' }, { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }] })}${F({ label: 'تاريخ الميلاد', name: 'birthDate', type: 'date' })}${F({ label: 'الموقف التجنيدي', name: 'military', type: 'select', options: [''].concat(Fin.list ? Fin.list('military') : MIL) })}${F({ label: 'الحالة الاجتماعية', name: 'marital', type: 'select', options: ['', 'أعزب', 'متزوج', 'مطلق', 'أرمل'] })}
      ${F({ label: 'الرقم القومي', name: 'nationalId', attrs: 'dir="ltr"' })}${F({ label: 'الهاتف', name: 'phone', attrs: 'dir="ltr"' })}${F({ label: 'الإيميل', name: 'email', attrs: 'dir="ltr"' })}${F({ label: 'سنين الخبرة', name: 'years', type: 'number' })}
      ${F({ label: 'العنوان', name: 'address', full: true })}
      ${F({ label: 'المؤهل', name: 'qualification' })}${F({ label: 'سنة التخرج', name: 'gradYear', type: 'number' })}${F({ label: 'الراتب المتفق عليه (HR بس)', name: 'salary', type: 'number' })}${F({ label: 'كود البصمة', name: 'fingerCode', attrs: 'dir="ltr"' })}
      ${F({ label: 'الأعمال السابقة (الشركة · من/إلى · الوظيفة · الراتب · سبب المغادرة) — سطر لكل شغلانة', name: 'prevJobs', type: 'textarea', full: true })}
      ${F({ label: 'الدورات (الاسم · الفترة · المحاضر · ملاحظات)', name: 'courses', type: 'textarea', full: true })}
      ${F({ label: 'المراجع (الاسم · الوظيفة · الهاتف)', name: 'refs', type: 'textarea', full: true })}
      ${F({ label: 'ملاحظات', name: 'note', full: true })}</div><p class="muted small">🔒 الراتب والرقم القومي والمستندات الشخصية لـ HR بس. النوع بتحدده HR — مش بيتخمّن من الاسم أو الرقم القومي.</p>`,
      onSave: m => { const d = UI.form(m.el); UI.require(d, [['name', 'الاسم']]);
        if (d.reqId && !d.jobTitle) { const r = DB.requisitions.find(x => x.id === d.reqId); d.jobTitle = r.title; d.dept = d.dept || r.dept; }
        const o = Object.assign(c, d); if (!o.no) o.no = X.nextCode('CAN'); C.upsert('candidates', o, 'مرشح');
        if (isNew) { X.event('اتسجل المرشح ' + o.no + ' · ' + o.name + ' (' + o.source + ')', { ref: o.no }); global.Router.go('#/cand/' + o.id); } else render(); } });
  };

  // ================= M03: مسوغات التعيين الخمسة =================
  const HDOCS = [['nid', 'صورة بطاقة الرقم القومي (وش وضهر)'], ['birth', 'شهادة الميلاد'], ['photo', 'الصورة الشخصية'], ['qual', 'شهادة المؤهل الدراسي'], ['military', 'شهادة الموقف من التجنيد']];
  const HST = { none: ['Not Uploaded — لسه', 'muted'], uploaded: ['Uploaded — اترفع', 'info'], review: ['Under Review', 'warn'], approved: ['Approved ✓', 'good'], rejected: ['Rejected — إعادة رفع', 'bad'], na: ['غير منطبق (N/A)', 'muted'] };
  // التجنيد: إلزامي للذكور بس · للإناث غير منطبق · من غير ما HR تحدد النوع ← مش هيكتمل
  const hdocState = (c, k) => k === 'military' && c.gender === 'female' ? 'na' : ((c.hireDocs || {})[k] || {}).status || 'none';
  Fin.hireDocsComplete = c => c.gender ? HDOCS.every(([k]) => ['approved', 'na'].includes(hdocState(c, k))) : false;
  function editHDoc(c, k, label) {
    const cur = (c.hireDocs || {})[k] || {};
    UI.modal({ title: label + ' — ' + c.name, saveLabel: 'حفظ', body: `<div class="grid2">${UI.field({ label: 'الحالة', name: 'status', type: 'select', options: Object.entries(HST).filter(([s]) => s !== 'na').map(([s, v]) => ({ value: s, label: v[0] })), value: cur.status || 'none' })}
      ${UI.field({ label: 'رابط الملف على Google Drive', name: 'link', value: cur.link || '', attrs: 'dir="ltr"', placeholder: 'https://drive.google.com/…' })}${UI.field({ label: 'ملاحظة / سبب الرفض', name: 'note', full: true, value: cur.note || '' })}</div>
      <p class="muted small">الملف نفسه بيترفع على Drive (الشركة ← القسم ← الموظف ← مسوغات التعيين) — النظام بيحفظ الرابط بس، مش الصورة. مفيش "اترفع/معتمد" من غير رابط.</p>`,
      onSave: m => { const d = UI.form(m.el);
        if (['uploaded', 'review', 'approved'].includes(d.status) && !/^https?:\/\//i.test(d.link || '')) throw new Error('حط رابط الملف على Drive الأول');
        if (d.status === 'rejected' && !d.note) throw new Error('اكتب سبب الرفض');
        c.hireDocs = c.hireDocs || {}; c.hireDocs[k] = { status: d.status, link: d.link, note: d.note, by: me(), at: today(), history: (cur.history || []).concat(cur.status ? [{ status: cur.status, at: cur.at, by: cur.by }] : []) };
        C.upsert('candidates', c, 'مسوغات التعيين'); X.event(c.no + ': ' + label + ' ← ' + HST[d.status][0], { ref: c.no }); render(); } });
  }

  // ================= M03: إقرار استلام العمل (F03) — طباعة =================
  Fin.printWorkStart = function (c) {
    const emp = c.empId ? X.staff(c.empId) : {}, B = global.BRAND || {}, line = v => `<span style="display:inline-block;min-width:200px;border-bottom:1px dotted #333">${esc(v || '')}</span>`;
    const box = t => `<div style="margin:6px 0">☐ ${t}</div>`;
    UI.print(`<div dir="rtl" style="font-family:Cairo,Tahoma;font-size:14px;line-height:2.1">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:6px"><b>${esc(B.company || '')}</b><span>التاريخ: ${line(today())}</span></div>
      <h2 style="text-align:center">إقرار استلام العمل</h2>
      <div>الاسم: ${line(c.name)}</div><div>الرقم القومي: ${line(c.nationalId)}</div><div>محل الإقامة: ${line(c.address)}</div>
      <div>الشركة: ${line(emp.company || c.company || (X.settings().companies[0] || {}).name)} &nbsp; المشروع / الموقع: ${line(emp.branch || c.site || '')}</div>
      <div>الوظيفة: ${line(c.jobTitle)} &nbsp; القسم: ${line(c.dept)}</div>
      <div>تاريخ بدء العمل: ${line(c.joiningDate)} &nbsp; الراتب: ${line(c.salary ? U.money(c.salary, false) + ' ' + X.curWord() : '')}</div>
      <div>الكود الوظيفي: ${line(emp.empNo || '')} &nbsp; كود البصمة: ${line(c.fingerCode)}</div>
      <p style="margin-top:14px">أقر أنا الموقع أدناه بأنني استلمت العمل لدى الشركة المذكورة أعلاه اعتبارًا من تاريخ بدء العمل الموضح، وأن البيانات المذكورة صحيحة. وأقر بما يلي (كل بند منفصل):</p>
      ${box('قرأت ووافقت على اللائحة الداخلية للشركة')}${box('قرأت ووافقت على اتفاقية عدم الإفصاح (NDA)')}${box('اطلعت على العقد ووافقت عليه حسب الآلية المعتمدة')}${box('راجعت العهد المسلّمة لي واستلمتها')}
      <div style="display:flex;gap:40px;margin-top:30px"><div style="flex:1">اسم الموظف: ${line(c.name)}<br>التوقيع: ${line('')}</div><div style="flex:1">مسؤول الموارد البشرية: ${line('')}<br>التوقيع: ${line('')}</div></div>
      <p style="font-size:11px;color:#666;margin-top:20px">قراءة العقد أو الموافقة عليه هنا لا تعني اكتمال توقيع عقد العمل — توقيع العقد بيتسجل منفصل.</p></div>`);
  };

  // ================= M03: صفحة المرشح — إضافات =================
  const baseCand = P.cand;
  if (baseCand) P.cand = function (el, id) {
    baseCand(el, id);
    const c = DB.candidates.find(x => x.id === id); if (!c) return;
    const dec = c.decision || {}, acc = dec.result === 'accepted', priv = isHR();
    // صندوق القرار بالمصفوفة
    const decPanel = [...el.querySelectorAll('.panel h2')].find(h => /03/.test(h.textContent));
    if (decPanel) { const p = decPanel.parentElement; const t = ivOf(c, 'tech'), h = ivOf(c, 'hr');
      p.insertAdjacentHTML('beforeend', `<div class="small" style="margin-top:8px">${dec.techRec ? `الفني: <b>${dec.techRec === 'accept' ? 'Accepted' : 'Not Accepted'}</b> · HR: <b>${dec.hrRec === 'accept' ? 'Accepted' : 'Not Accepted'}</b> · v${dec.version || 1}${dec.reviewDate ? ' · مراجعة الانتظار ' + esc(dec.reviewDate) : ''}<br>السبب: ${esc(dec.reason || '')}` : ''}
        ${!t || !h ? '<div class="t-warn">⏳ القرار النهائي بيتفتح بعد اعتماد المقابلتين (HR + الفنية)</div>' : ''}</div>`); }
    let extra = '';
    if (acc || ['waiting'].includes(c.status)) {
      extra += `<div class="panel"><div class="panel-head"><h2>05 · مسوغات التعيين</h2>${Fin.hireDocsComplete(c) ? '<span class="badge b-good">✓ المسوغات مكتملة</span>' : '<span class="badge b-warn">ناقصة</span>'}</div>
        ${!acc ? '<p class="muted small">بتبدأ بعد القبول بس (مش للانتظار أو الأرشيف).</p>' : !priv ? `<p class="muted small">🔒 المستندات الشخصية لـ HR بس — الحالة: ${Fin.hireDocsComplete(c) ? 'مكتملة' : 'لسه'}</p>` : `
        ${!c.gender ? '<p class="t-warn small">⚠️ حدد النوع في بيانات المرشح (تعديل) — شهادة التجنيد إلزامية للذكور بس، والنظام مش بيخمّن.</p>' : ''}
        <table class="tbl compact"><tbody>${HDOCS.map(([k, l]) => { const s = hdocState(c, k), x = (c.hireDocs || {})[k] || {}; return `<tr><td>${l}${k === 'military' ? ' <small class="muted">(ذكور بس)</small>' : ''}</td><td><span class="badge b-${HST[s][1]}">${HST[s][0]}</span>${x.link ? ` <a href="${esc(x.link)}" target="_blank" rel="noopener" class="small">📎 فتح</a>` : ''}${x.note ? `<div class="muted small">${esc(x.note)}</div>` : ''}</td><td>${s === 'na' ? '' : `<button class="link" data-m3="hdoc" data-k="${k}">تحديث</button>`}</td></tr>`; }).join('')}</tbody></table>`}</div>`;
    }
    if (acc) extra += `<div class="panel"><h2>06 · إقرار استلام العمل</h2><p class="small">فيه 4 إقرارات منفصلة (اللائحة · NDA · العقد · العهد) + تاريخ المباشرة والتوقيع.</p>
      <button class="btn" data-m3="f03">🖨 طباعة إقرار استلام العمل</button> ${c.workStartSignedAt ? `<span class="badge b-good">اتوقّع ${esc(c.workStartSignedAt)}</span>` : '<button class="btn sm" data-m3="f03ok">✍ اتوقّع</button>'}</div>`;
    if (priv && (c.birthDate || c.qualification || c.prevJobs || c.expectedSalary)) extra += `<div class="panel"><h2>بيانات الاستمارة</h2><table class="tbl compact"><tbody>
      ${[['النوع', { male: 'ذكر', female: 'أنثى' }[c.gender] || '—'], ['تاريخ الميلاد', c.birthDate], ['الموقف التجنيدي', c.military], ['الحالة الاجتماعية', c.marital], ['العنوان', c.address], ['المؤهل', [c.qualification, c.gradYear].filter(Boolean).join(' · ')], ['الراتب المتوقع', c.expectedSalary], ['مدة الإخطار', c.noticePeriod], ['الأعمال السابقة', c.prevJobs], ['الدورات', c.courses], ['المراجع', c.refs]].filter(r => r[1]).map(r => `<tr><td>${r[0]}</td><td style="white-space:pre-line">${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>`;
    if (extra) el.insertAdjacentHTML('beforeend', `<div class="dash-grid" style="margin-top:14px">${extra}</div>`);
    capture(el, 'm3', e => {
      const ev = e.target.closest('[data-ev]'); if (ev) { stop(e); return evaluate(c, (c.interviews || []).find(i => i.id === ev.dataset.ev)); }
      const b = e.target.closest('[data-act=decide],[data-act=start],[data-m3]'); if (!b) return;
      if (b.dataset.act === 'decide') { stop(e); return decide(c); }
      if (b.dataset.act === 'start' && (c.decision || {}).result !== 'accepted') { stop(e); return UI.toast('التعيين بيبدأ بعد قرار Accepted بس', 'err'); }
      if (b.dataset.m3 === 'hdoc') { stop(e); editHDoc(c, b.dataset.k, HDOCS.find(d => d[0] === b.dataset.k)[1]); }
      if (b.dataset.m3 === 'f03') { stop(e); Fin.printWorkStart(c); }
      if (b.dataset.m3 === 'f03ok') { stop(e); c.workStartSignedAt = today(); C.upsert('candidates', c, 'إقرار استلام العمل'); X.event(c.no + ': اتوقّع إقرار استلام العمل', { ref: c.no }); render(); }
    });
  };
  // حماية: مفيش تعيين من أي مكان غير بعد Accepted
  const baseStart = Fin.startOnboard;
  if (baseStart) Fin.startOnboard = function (candId) { const c = DB.candidates.find(x => x.id === candId); if (c && (c.decision || {}).result !== 'accepted') { UI.toast('مرفوض: ' + c.no + ' مش في حالة Accepted / Onboarding', 'err'); X.event('محاولة تعيين مرفوضة لـ ' + c.no + ' (' + ((c.decision || {}).result || 'من غير قرار') + ')', { ref: c.no }); return; } return baseStart.apply(this, arguments); };

  // ================= M03: المرشحين — 4 لوحات =================
  const baseCands = P.cands;
  P.cands = function (el) {
    const st = P.cands._b = P.cands._b || { board: 'interviews' };
    baseCands(el);
    const pick = BOARDS[st.board][1];
    el.querySelector('.page-head').insertAdjacentHTML('afterend', `<div class="cand-boards">${Object.entries(BOARDS).map(([k, b]) => `<button class="btn ${k === st.board ? 'primary' : 'ghost'}" data-board="${k}">${b[0]} <b>${DB.candidates.filter(c => b[1].includes(c.status)).length}</b></button>`).join('')}</div>`);
    // الجدول حسب اللوحة (الأرشيف بيظهر المرفوضين كمان)
    const rows = DB.candidates.filter(c => pick.includes(c.status) && (st.board === 'archive' || !c.archivedAt)).sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
    const panel = el.querySelector('.panel');
    if (panel) panel.innerHTML = UI.table({ rows, empty: 'مفيش مرشحين في اللوحة دي', columns: [
      { label: 'Candidate ID', render: c => `<a href="#/cand/${c.id}" dir="ltr" class="mono"><b>${esc(c.no)}</b></a>` },
      { label: 'الاسم', render: c => `<a href="#/cand/${c.id}"><b>${esc(c.name)}</b></a><div class="muted small">${esc(c.source || '')} · ${c.appliedAt || ''}</div>` },
      { label: 'الوظيفة', render: c => esc(c.jobTitle || '') + `<div class="muted small">${esc(c.dept || '')}</div>` },
      { label: 'المقابلات', render: c => (c.interviews || []).map(i => `<span class="badge b-${i.evaluatedAt ? (i.recommendation === 'reject' ? 'bad' : 'good') : i.draft ? 'warn' : 'muted'}">${i.kind === 'hr' ? 'HR' : 'فني'}${i.score ? ' ' + i.score + '/' + (i.scale || 5) : i.draft ? ' مسودة' : ''}</span>`).join(' ') || '—' },
      { label: st.board === 'waiting' ? 'مراجعة الانتظار' : st.board === 'archive' ? 'السبب' : 'المباشرة', render: c => st.board === 'waiting' ? `${esc((c.decision || {}).reviewDate || '—')}<div class="muted small">${esc((c.decision || {}).reason || '')}</div>` : st.board === 'archive' ? esc((c.decision || {}).reason || (c.decision || {}).note || '—') : (c.joiningDate || '—') },
      { label: 'الحالة', render: c => X.cBadge(c.status) }] });
    const grid = el.querySelector('.state-grid'); if (grid) grid.style.display = 'none';
    capture(el, 'boards', e => { const b = e.target.closest('[data-board]'); if (!b) return; stop(e); st.board = b.dataset.board; render(); });
  };

  // ================= M03: تبويب "الملفات" في التعيينات (وثائق الشركة بإصدارات) =================
  const DTYPES = ['NDA', 'اللائحة الداخلية', 'عقد العمل', 'سياسة العهد', 'أخرى'];
  const DST = { none: ['غير مرفوع', 'muted'], draft: ['مسودة', 'warn'], active: ['نشط', 'good'], archived: ['مؤرشف', 'muted'] };
  const docState = d => d.archived ? 'archived' : d.activeV ? 'active' : (d.versions || []).length ? 'draft' : 'none';
  const baseOnboard = P.onboard;
  if (baseOnboard) P.onboard = function (el) {
    const tab = P.onboard._t = P.onboard._t || 'cycles';
    if (tab === 'cycles') baseOnboard(el); else el.innerHTML = '<div class="page-head"><div><h1>التعيينات</h1></div></div>';
    el.querySelector('.page-head').insertAdjacentHTML('afterend', `<div class="cand-boards"><button class="btn ${tab === 'cycles' ? 'primary' : 'ghost'}" data-otab="cycles">🟢 سيكلات التعيين</button><button class="btn ${tab === 'files' ? 'primary' : 'ghost'}" data-otab="files">📁 الملفات</button></div>`);
    if (tab === 'files') {
      const docs = arr('companyDocs'), cos = (X.settings().companies || []).map(c => c.name);
      const miss = cos.flatMap(co => ['NDA', 'اللائحة الداخلية'].filter(t => !docs.some(d => d.company === co && d.type === t && d.activeV && !d.archived)).map(t => co + ': ' + t));
      el.insertAdjacentHTML('beforeend', `<div class="panel"><div class="panel-head"><div><h2>📁 ملفات الشركة (NDA · اللائحة · العقد…)</h2><p class="muted small">لكل ${esc(X.coLabel())} نسخته وإصداراته. "تحديث" بيعمل إصدار جديد — والموظف بيفضل مربوط بالإصدار اللي وافق عليه.</p></div>${isHR() ? '<button class="btn primary sm" data-cd="new">+ نوع مستند</button>' : ''}</div>
        ${miss.length ? `<p class="t-warn small">⚠️ نقص إعداد: ${esc(miss.join(' · '))} — مسار الإقرارات مش هيكتمل لحد ما يتفعّل.</p>` : ''}
        ${UI.table({ rows: docs, empty: 'لسه مفيش ملفات', columns: [
          { label: 'نوع الملف', render: d => '<b>' + esc(d.type) + '</b>' }, { label: 'اسم الملف', render: d => esc(d.name || '') }, { label: X.coLabel(), render: d => X.optChip('company', d.company) },
          { label: 'الحالة', render: d => `<span class="badge b-${DST[docState(d)][1]}">${DST[docState(d)][0]}</span>` },
          { label: 'الإصدار', render: d => d.activeV ? 'v' + d.activeV + ((d.versions || []).length > d.activeV ? ` <small class="muted">(آخر v${d.versions.length})</small>` : '') : (d.versions || []).length ? 'v' + d.versions.length + ' <small class="muted">مسودة</small>' : '—' },
          { label: 'آخر تحديث', render: d => { const v = (d.versions || []).slice(-1)[0]; return v ? esc(v.at) + `<div class="muted small">${esc(v.by || '')}</div>` : '—'; } },
          { label: 'إلزامي في المرحلة؟', render: d => d.required ? '✓ إلزامي' : 'اختياري' },
          { label: '', render: d => { const v = (d.versions || []).slice(-1)[0]; return (v ? `<a class="link" href="${esc(v.link)}" target="_blank" rel="noopener">👁 معاينة</a> ` : '') + (isHR() && !d.archived ? `<button class="link" data-cd="ver" data-id="${d.id}">⬆ ${v ? 'تحديث (إصدار جديد)' : 'رفع ملف'}</button>` + (v && d.activeV !== d.versions.length ? `<button class="link" data-cd="act" data-id="${d.id}">✔ تفعيل v${d.versions.length}</button>` : '') + `<button class="link danger" data-cd="arch" data-id="${d.id}">أرشفة</button>` : ''); } }] })}</div>`);
    }
    capture(el, 'onb', e => {
      const t = e.target.closest('[data-otab]'); if (t) { stop(e); P.onboard._t = t.dataset.otab; return render(); }
      const b = e.target.closest('[data-cd]'); if (!b) return; stop(e); const d = arr('companyDocs').find(x => x.id === b.dataset.id);
      if (b.dataset.cd === 'new') UI.modal({ title: '+ نوع مستند للشركة', body: `<div class="grid2">${UI.field({ label: 'النوع', name: 'type', type: 'select', options: Fin.list ? Fin.list('docTypes') : DTYPES })}${UI.field({ label: 'اسم الملف', name: 'name' })}${UI.field({ label: X.coLabel(), name: 'company', type: 'select', options: (X.settings().companies || []).map(c => c.name) })}${UI.field({ label: 'إلزامي في التعيين', name: 'required', type: 'checkbox', value: true })}</div>`,
        onSave: m => { const f = UI.form(m.el); C.upsert('companyDocs', { type: f.type, name: f.name || f.type, company: f.company, required: !!f.required, versions: [], activeV: 0 }, 'ملف شركة'); render(); } });
      if (b.dataset.cd === 'ver') UI.modal({ title: '⬆ إصدار جديد — ' + d.type + ' · ' + d.company, body: `${UI.field({ label: 'رابط الملف على Google Drive (PDF)', name: 'link', attrs: 'dir="ltr"' })}${UI.field({ label: 'ملاحظة التغيير', name: 'note' })}<p class="muted small">الإصدار الجديد مش بيستبدل القديم ولا بيتعرض للموظفين غير بعد "تفعيل".</p>`,
        onSave: m => { const f = UI.form(m.el); if (!/^https?:\/\//i.test(f.link || '')) throw new Error('حط رابط الملف'); d.versions = (d.versions || []).concat([{ v: (d.versions || []).length + 1, link: f.link, note: f.note, at: today(), by: me() }]); C.upsert('companyDocs', d, 'إصدار ملف شركة'); X.event(d.type + ' (' + d.company + '): إصدار v' + d.versions.length, {}); render(); } });
      if (b.dataset.cd === 'act') { d.activeV = d.versions.length; d.activatedAt = today(); C.upsert('companyDocs', d, 'تفعيل إصدار'); X.event(d.type + ' (' + d.company + '): اتفعّل v' + d.activeV, {}); render(); }
      if (b.dataset.cd === 'arch' && confirm('أرشفة الملف؟ الإقرارات القديمة بتفضل محفوظة.')) { d.archived = true; C.upsert('companyDocs', d, 'أرشفة ملف شركة'); render(); }
    });
  };

  // ================= AI tools: حدّين للرصيد =================
  X.toolState = function (x) {
    const f = X.forecast('tool', x), r = f.remaining, w = U.num(x.warnQty), c = U.num(x.critQty);
    if (c && r <= c) return { lvl: 'crit', txt: 'اشحن فورًا', f }; if (w && r <= w) return { lvl: 'warn', txt: 'جهز رصيد', f }; return { lvl: f.cls === 'bad' ? 'crit' : f.cls === 'warn' ? 'warn' : 'ok', txt: f.verdict, f };
  };
})(window);
