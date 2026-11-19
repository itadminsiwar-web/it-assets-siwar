/* =========================================================
   apply.js — الصفحة العامة للمرشح (من غير تسجيل دخول)
   • apply.html            → نموذج التقديم (QR Code في الاستقبال / Google Form) ← Candidate ID موحد
   • apply.html#/onb/TOKEN → الرابط الشخصي للـ Pre-Onboarding: مراجعة البيانات والعقد وNDA واللائحة
                             وكل تأكيد بيتسجل بالوقت وإصدار المستند (Digital Checkpoints)
   ملاحظة: في النسخة دي الصفحة بتكتب في نفس قاعدة البيانات المحلية؛ على السيرفر بتبعت لـ API.
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, UI = global.UI, X = global.ITX, $ = s => document.querySelector(s), esc = s => U.esc(s);
  global.Store.load(); X.ensure();
  const main = $('#apMain');
  const TXT = {
    personal: 'راجع بياناتك الشخصية (الاسم، رقم الهوية، العنوان، بيانات التواصل) وأكّد إنها صحيحة.',
    contract: 'العقد الوظيفي والمسمى والراتب ومدة الاختبار وساعات العمل. (النص الكامل بيتعرض هنا من نسخة HR المعتمدة.)',
    nda: 'اتفاقية عدم الإفصاح والسرية: الالتزام بعدم إفشاء أي معلومات تخص الشركة أو عملائها أثناء العمل وبعده.',
    policy: 'اللائحة الداخلية: مواعيد الحضور، الإجازات، استخدام أجهزة الشركة والإنترنت، سياسة كلمات السر، والعقوبات.',
  };
  function applyForm() {
    const reqs = DB.requisitions.filter(r => r.status === 'open' && r.approvedAt), src = /src=qr/.test(location.search) ? 'QR Code' : 'Google Form';
    main.innerHTML = `<div class="panel"><div class="grid2">${UI.field({ label: 'الاسم بالكامل', name: 'name', required: true })}${UI.field({ label: 'الموبايل', name: 'phone', required: true, attrs: 'dir="ltr" inputmode="tel"' })}
      ${UI.field({ label: 'الإيميل', name: 'email', type: 'email', attrs: 'dir="ltr"' })}${UI.field({ label: 'الوظيفة', name: 'reqId', type: 'select', options: [{ value: '', label: '— اختار —' }].concat(reqs.map(r => ({ value: r.id, label: r.title + ' · ' + (r.dept || '') }))) })}
      ${UI.field({ label: 'سنين الخبرة', name: 'years', type: 'number' })}${UI.field({ label: 'المدينة', name: 'city' })}${UI.field({ label: 'نبذة عن خبراتك', name: 'note', type: 'textarea', full: true })}</div>
      <button class="btn primary block" id="send">إرسال الطلب</button></div>`;
    $('#send').onclick = () => {
      try {
        const d = UI.form(main); UI.require(d, [['name', 'الاسم'], ['phone', 'الموبايل']]);
        if (DB.candidates.some(c => c.phone && c.phone.replace(/\D/g, '') === d.phone.replace(/\D/g, '') && !c.closedAt)) throw new Error('الرقم ده قدّم قبل كده — هنتواصل معاك');
        const r = DB.requisitions.find(x => x.id === d.reqId) || {};
        const c = { id: U.uid(), no: X.nextCode('CAN'), name: d.name, phone: d.phone, email: d.email, reqId: d.reqId, jobTitle: r.title || '', dept: r.dept || '', branch: r.branch || '', years: d.years, note: [d.city, d.note].filter(Boolean).join(' — '), source: src, appliedAt: U.today(), status: 'applied', interviews: [], checkpoints: [] };
        DB.candidates.push(c); X.event('اتسجل المرشح ' + c.no + ' · ' + c.name + ' (' + src + ')', { ref: c.no, by: 'نموذج التقديم' });
        main.innerHTML = `<div class="panel ok">✅<b>اتسجل طلبك</b><p>رقم الطلب (Candidate ID): <b dir="ltr">${esc(c.no)}</b></p><p class="muted">هنتواصل معاك على ${esc(c.phone)} لتحديد ميعاد المقابلة.</p></div>`;
      } catch (e) { UI.toast(e.message, 'err'); }
    };
  }
  function onboarding(token) {
    const c = DB.candidates.find(x => x.token && x.token === token);
    $('#apTitle').textContent = 'مستندات الانضمام'; $('#apSub').textContent = 'راجع كل مستند وعلّم على اللي اطلعت عليه ووافقت عليه';
    if (!c) { main.innerHTML = '<div class="panel ok">⚠️<b>الرابط مش صحيح أو انتهى</b><p class="muted">كلّم الموارد البشرية.</p></div>'; return; }
    const has = (k, a) => (c.checkpoints || []).find(x => x.doc === k && x.action === a);
    main.innerHTML = `<div class="panel"><p>أهلًا <b>${esc(c.name)}</b> — ${esc(c.jobTitle || '')} · <span dir="ltr">${esc(c.no)}</span></p>
      ${X.PRE_DOCS.map(d => `<div class="doc"><b>${d.t}</b> <small class="muted" dir="ltr">${d.en} · ${d.ver}</small><div class="txt">${esc(TXT[d.key])}</div>
        ${d.need.map(a => `<label><input type="checkbox" data-doc="${d.key}" data-a="${a}" ${has(d.key, a) ? 'checked disabled' : ''}> ${X.MARK[a]}${has(d.key, a) ? ` <small class="muted">(${X.time(has(d.key, a).at)})</small>` : ''}</label>`).join('')}</div>`).join('')}
      <div class="grid2">${UI.field({ label: 'رقم الهوية / البطاقة', name: 'nationalId', value: c.nationalId || '', attrs: 'dir="ltr"' })}${UI.field({ label: 'العنوان', name: 'address', value: c.address || '' })}</div>
      <button class="btn primary block" id="save">تأكيد</button>
      <p class="muted small">تأكيد القراءة وحده لا يعني توقيع العقد أو تسليم عهدة — التوقيع النهائي ورقي على الإقرار الموحد يوم المباشرة.</p></div>`;
    $('#save').onclick = () => {
      const now = new Date().toISOString(), d = UI.form(main); let n = 0;
      document.querySelectorAll('[data-doc]:checked:not([disabled])').forEach(i => { const p = X.PRE_DOCS.find(x => x.key === i.dataset.doc); c.checkpoints.push({ doc: p.key, action: i.dataset.a, ver: p.ver, at: now, by: 'candidate' }); n++; });
      if (d.nationalId) c.nationalId = d.nationalId; if (d.address) c.address = d.address;
      if (['accepted'].includes(c.status)) c.status = 'docs';
      global.Store.save(); if (n) X.event(c.no + ' أكّد ' + n + ' بند في مستندات الانضمام (Digital Checkpoints)', { ref: c.no, by: c.name });
      UI.toast(n ? 'اتسجل ' + n + ' تأكيد' : 'اتحفظت البيانات'); onboarding(token);
    };
  }
  const route = () => { const m = location.hash.match(/^#\/onb\/(.+)$/); if (m) onboarding(m[1]); else applyForm(); };
  window.addEventListener('hashchange', route); route();
})(window);
