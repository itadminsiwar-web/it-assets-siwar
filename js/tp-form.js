/* =========================================================
   tp-form.js — "بيان العهد المستلمة/المسلمة من قسم تقنية المعلومات - IT"
   نفس فورم Three Pillars الورقي (تعيين جديد / إخلاء طرف) بيتملي لوحده من النظام:
   الموظف · الحاسب الآلي وملحقاته · USER والرمز · المواصفات · الموبايل · الإيميل · التليفون ·
   عهد أخرى (innocalls، بصمة الدخول، بصمة الحضور) · الإقرار والتوقيعات.
   الباسوردات (الرمز / رقم الدخول) بتتطبع بس لو خزنة الباسوردات مفتوحة واخترت تطبعها.
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, UI = global.UI, Fin = global.Fin = global.Fin || {};
  const esc = s => U.esc(s == null ? '' : s);
  const dots = (v, w) => v ? `<b>${esc(v)}</b>` : `<span class="tpf-dots" style="min-width:${w || 160}px"></span>`;
  const box = on => `<span class="tpf-box">${on ? '☑' : '☐'}</span>`;
  const COMPUTER = ['laptop', 'desktop', 'tablet'];

  const CSS = `
  .tpf { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111; direction: rtl; position: relative; padding: 0 2px; font-size: 12.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tpf-top { display: flex; justify-content: space-between; align-items: flex-start; height: 58px; margin-bottom: 2px; position: relative; }
  .tpf-top img { height: 50px; order: 2; }
  .tpf-corner { width: 280px; height: 52px; background: #1d1d1b; border-bottom-left-radius: 100% 100%; position: relative; order: 1; }
  .tpf-corner::before { content: ''; position: absolute; inset: 0 -12px -8px 0; border-bottom-left-radius: 100% 100%; border-bottom: 7px solid #e8600c; border-left: 7px solid #e8600c; }
  .tpf h1 { font-size: 16.5px; text-decoration: underline; margin: 0 0 4px; font-weight: 800; }
  .tpf-kind { display: flex; gap: 26px; font-weight: 700; margin-bottom: 2px; }
  .tpf-box { display: inline-block; font-size: 15px; margin-left: 3px; }
  .tpf-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 2px 0; } .tpf-row > span { font-weight: 700; }
  .tpf-dots { display: inline-block; border-bottom: 1.5px dotted #444; height: 1em; vertical-align: bottom; }
  .tpf h3 { font-size: 14px; text-decoration: underline; margin: 7px 0 3px; font-weight: 800; }
  .tpf table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .tpf .acc { width: 12%; }
  .tpf td, .tpf th { border: 1px solid #333; padding: 3px 6px; vertical-align: middle; height: 23px; word-wrap: break-word; }
  .tpf th { background: #dce6f1; font-weight: 800; text-align: center; }
  .tpf .lbl { background: #dce6f1; font-weight: 800; width: 128px; text-align: center; }
  .tpf .ltr { direction: ltr; unicode-bidi: embed; }
  .tpf .c { text-align: center; }
  .tpf-ack { font-weight: 700; text-align: justify; margin: 2px 0 6px; }
  .tpf-sign { display: flex; justify-content: space-between; gap: 40px; }
  .tpf-sign > div { flex: 1; } .tpf-sign h4 { margin: 0 0 4px; text-decoration: underline; font-size: 13.5px; }
  .tpf-sign p { margin: 9px 0; font-weight: 700; }
  .tpf-foot { height: 22px; display: flex; margin-top: 10px; }
  .tpf-foot div:first-child { flex: 1.6; background: #1d1d1b; } .tpf-foot div:last-child { flex: 1; background: #e8600c; color: #fff; text-align: center; line-height: 22px; font-size: 12px; }
  @media print { .tpf { page-break-inside: avoid; } }`;

  const fmtDate = iso => { const [y, m, d] = String(iso || U.today()).split('-'); return `${+d} / ${+m} / ${y} م`; };

  async function build(empId, mode, withPw) {
    const m = (DB.team || []).find(x => x.id === empId) || {};
    const as = (DB.assets || []).filter(a => a.holderId === empId && (mode === 'offboard' || a.status === 'assigned'));
    const comps = as.filter(a => COMPUTER.includes(a.type)), mobs = as.filter(a => a.type === 'mobile');
    const others = as.filter(a => !COMPUTER.includes(a.type) && a.type !== 'mobile');
    const pc = comps[0] || {};
    const mails = [].concat((DB.mailboxes || []).filter(b => b.holderId === empId && b.status !== 'deleted').map(b => b.address), m.email ? [m.email] : []).filter((v, i, arr) => v && arr.indexOf(v) === i);
    const phones = (DB.lines || []).filter(l => l.holderId === empId && l.status !== 'cancelled').map(l => (Fin.fmtPhone ? Fin.fmtPhone(l.number) : l.number));
    let sv = {}, pcPw = '';
    const V = global.Vault;
    if (withPw && V && V.allowed()) {
      sv = await V.read('staff', empId);                 // بيطلب الباسورد الرئيسي لو الخزنة مقفولة
      if (pc.id) pcPw = (await V.read('asset', pc.id)).pass || '';
    }
    const kit = String(pc.kit || '');
    const has = w => kit.includes(w);
    const company = m.company || pc.company || (mobs[0] || {}).company || '';
    const st = (global.ITX && global.ITX.settings()) || {};
    const name = a => [a.brand, a.model].filter(Boolean).join(' ');
    const spec2 = [name(pc), pc.serial && 'S/N: ' + pc.serial, (pc.monitor || pc.monitorBrand) && 'شاشة ' + [pc.monitor, pc.monitorBrand].filter(Boolean).join(' ') + (pc.monitorSerial ? ' (S/N ' + pc.monitorSerial + ')' : '')].filter(Boolean).join(' · ');
    const extraRows = [].concat(
      comps.slice(1).map(a => [a.tag, name(a) || a.specs || '', a.serial ? 'S/N ' + a.serial : '']),
      others.map(a => [a.tag, name(a) || a.specs || '', a.serial ? 'S/N ' + a.serial : '']));
    const pw = v => withPw ? esc(v || '') : '';
    const ack = mode === 'offboard'
      ? 'أقر بأنني قمت بتسليم العهد المذكورة أعلاه إلى قسم تقنية المعلومات كاملة، وأن أي نقص أو تلف بها يتم تسويته وفقًا لسياسة الشركة، كما أقر بعدم احتفاظي بأي نسخ من بيانات أو حسابات الشركة.'
      : 'أقر بأن العهد المذكورة أعلاه قد تم تسليمها لي في حالة جيدة وكاملة، وأنني أتعهد بالمحافظـة عليهـا واستخدامها بالطريقة المناسبة ، كما أقر بمسؤوليتي الكاملة عن أي أضرار أو خسائر مالية أو خلافه قد تترتب على عدم التزامي أو مخالفتي لما جاء في هذا الإقرار وتعويض الشركة عن كافة الأضرار والخسائر المترتبه على ذلك.';
    const logo = (global.BRAND || {}).logo || 'img/logo.png';

    return `<div class="tpf"><style>${CSS}</style>
      <div class="tpf-top"><div class="tpf-corner"></div><img src="${esc(logo)}" alt=""></div>
      <h1>بيان العهد المستلمة/المسلمة من قسم تقنية المعلومات IT -</h1>
      <div class="tpf-kind"><span>${box(mode !== 'offboard')} تعيين جديد</span><span>${box(mode === 'offboard')} إخـــــــلاء طرف</span></div>
      <div class="tpf-row"><span>التاريخ:</span> ${fmtDate(U.today())}</div>
      <div class="tpf-row"><span>اسم الموظف:</span> ${dots(m.name, 300)} <span>الرقم الوظيفي :</span> ${dots(m.empNo, 150)}</div>
      <div class="tpf-row"><span>الشـــــــــركة:</span> ${dots(company, 220)} <span>الادارة :</span> ${dots(m.admin, 200)}</div>
      <div class="tpf-row"><span>القسم :</span> ${dots(m.dept, 280)}</div>
      <h3>قائمة العهد:</h3>
      <table>
        <tr><td class="lbl" rowspan="2">الحاسب الآلي:</td><th style="width:150px">كود الجهاز</th><th colspan="5">الملحقات</th></tr>
        <tr><td class="c ltr"><b>${esc(pc.tag || '')}</b></td><td class="c acc">ماوس ${box(has('ماوس'))}</td><td class="c acc">كيبورد ${box(has('كيبورد'))}</td><td class="c acc">كابلات ${box(has('كابلات'))}</td><td class="c acc">سماعة ${box(has('سماعة'))}</td><td class="c acc">بادة ${box(has('باده') || has('بادة'))}</td></tr>
        <tr><td class="lbl">USER</td><td class="ltr c">${esc(sv.winUser || '')}</td><td colspan="5">الرمز: <span class="ltr">${pw(sv.winPass || pcPw)}</span></td></tr>
        <tr><td class="lbl" rowspan="2">المواصفات:</td><td colspan="6">${esc(pc.specs || '')}</td></tr>
        <tr><td colspan="6">${esc(spec2)}</td></tr>
        <tr><td class="lbl">الموبيل:</td><td colspan="2">الموديل: <b>${esc(mobs.map(a => (name(a) || a.specs || '') + ' (' + a.tag + ')').join('، '))}</b></td><td colspan="4">الملحقات: ${esc(mobs.map(a => a.kit && a.kit !== '—' ? a.kit : '').filter(Boolean).join('، '))}</td></tr>
        <tr><td class="lbl">البريد الالكتروني:</td><td colspan="2">( 1 ) <span class="ltr">${esc(mails[0] || '')}</span></td><td colspan="4">( 2 ) <span class="ltr">${esc(mails[1] || '')}</span></td></tr>
        <tr><td class="lbl">رقم الهاتف:</td><td colspan="2">( 1 ) <span class="ltr">${esc(phones[0] || '')}</span></td><td colspan="4">( 2 ) <span class="ltr">${esc(phones[1] || '')}</span></td></tr>
      </table>
      <h3>عهد أخرى:-</h3>
      <table>
        <tr><th style="width:34px">م</th><th style="width:150px">العهـــــــــــدة</th><th>اسم المستخدم</th><th>رقم الدخول</th><th>ملاحظات</th></tr>
        <tr><td class="lbl" style="width:34px">1</td><td class="c ltr">innocalls</td><td class="ltr">USER: ${esc(sv.artiqUser || '')}</td><td class="ltr c">${pw(sv.artiqNo)}</td><td></td></tr>
        <tr><td class="lbl">2</td><td class="c">بصمة الدخول</td><td class="ltr">USER: ${esc(sv.doorUser || '')}</td><td class="ltr c">${pw(sv.doorNo)}</td><td></td></tr>
        <tr><td class="lbl">3</td><td class="c">بصمة الحضور</td><td class="ltr">USER: ${esc(sv.attUser || '')}</td><td class="ltr c">${pw(sv.attNo)}</td><td></td></tr>
        ${(extraRows.length ? extraRows : [['', '', '']]).map((r, i) => `<tr><td class="lbl">${4 + i}</td><td class="c ltr">${esc(r[0])}</td><td>${esc(r[1])}</td><td></td><td class="ltr">${esc(r[2])}</td></tr>`).join('')}
      </table>
      <h3>إقرار و تعهد:</h3>
      <p class="tpf-ack">${ack}</p>
      <div class="tpf-sign">
        <div><h4>مسئول قسم تقنية المعلومات:</h4><p>الاسم: ${dots(st.itOfficerName, 210)}</p><p>المسمى الوظيفي: ${dots(st.itOfficerTitle, 170)}</p><p>التوقيع: ${dots('', 200)}</p></div>
        <div><h4>الموظف المستلم:</h4><p>الاسم: ${dots(m.name, 210)}</p><p>المسمى الوظيفي: ${dots(m.role, 170)}</p><p>التوقيع: ${dots('', 200)}</p></div>
      </div>
      <div class="tpf-foot"><div></div><div>Page <b>1</b> of <b>1</b></div></div>
    </div>`;
  }

  // نافذة الاختيار: تعيين جديد / إخلاء طرف + طباعة الباسوردات
  Fin.printTPForm = function (empId, mode) {
    const m = (DB.team || []).find(x => x.id === empId); if (!m) return UI.toast('الموظف مش موجود', 'err');
    const canPw = global.Vault && global.Vault.allowed();
    UI.modal({
      title: '🖨 بيان العهد — ' + m.name, saveLabel: 'طباعة',
      body: `<div class="grid2">${UI.field({ label: 'نوع البيان', name: 'mode', type: 'select', options: [{ value: 'onboard', label: 'تعيين جديد (استلام)' }, { value: 'offboard', label: 'إخلاء طرف (تسليم)' }], value: mode || 'onboard' })}
        ${canPw ? UI.field({ label: 'اطبع الباسوردات (الرمز ورقم الدخول)', name: 'pw', type: 'checkbox', value: global.Vault.isOpen() }) : ''}</div>
        <p class="muted small">الفورم بيتملي من بيانات الموظف وعهدته. الخانات الناقصة (الرقم الوظيفي، الإدارة، USER، innocalls، البصمة) بتتكتب من "تعديل" الموظف أو من 🔑 الباسوردات.</p>`,
      onSave: x => {
        const d = UI.form(x.el);
        build(empId, d.mode, !!d.pw).then(html => UI.print(html), e => { if (e.message !== 'cancel') UI.toast(e.message, 'err'); });
      },
    });
  };
  Fin.buildTPForm = build; // للاختبار

  /* ================= نموذج استلام عهدة (موبايلات / خطوط / عهد أخرى) — صفحتين ================= */
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const RCSS = `
  .rcp { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111; direction: rtl; font-size: 13px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rcp-page { position: relative; min-height: 262mm; display: flex; flex-direction: column; }
  .rcp-page + .rcp-page { page-break-before: always; break-before: page; }
  .rcp-body { flex: 1; position: relative; }
  .rcp-wm { position: absolute; top: 34%; left: 50%; transform: translateX(-50%); width: 170px; opacity: .08; pointer-events: none; }
  .rcp h1 { text-align: center; font-size: 19px; text-decoration: underline; margin: 6px 0 14px; font-weight: 800; }
  .rcp h2 { font-size: 16px; text-decoration: underline; margin: 4px 0 12px; font-weight: 800; }
  .rcp h4 { font-size: 14px; margin: 12px 0 4px; font-weight: 800; }
  .rcp ul { margin: 2px 26px 0 0; padding: 0; } .rcp li { margin: 3px 0; }
  .rcp .hr { border-top: 2px solid #111; margin: 12px 0 10px; }
  .rcp table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .rcp th, .rcp td { border: 1px solid #333; padding: 5px 6px; vertical-align: middle; height: 46px; word-wrap: break-word; font-size: 12px; }
  .rcp th { font-weight: 800; height: 34px; text-align: center; background: #fff; }
  .rcp .note { font-weight: 800; margin-top: 12px; text-align: justify; }
  .rcp .term h4 { margin: 12px 0 2px; } .rcp .term p { margin: 0; text-align: justify; }
  .rcp .ltr { direction: ltr; unicode-bidi: embed; }
  .rcp .sig p { font-weight: 800; margin: 14px 0; }`;

  async function buildReceipt(empId, itemIds, opt) {
    opt = opt || {};
    const m = (DB.team || []).find(x => x.id === empId) || {};
    const st = (global.ITX && global.ITX.settings()) || {};
    const fp = n => (Fin.fmtPhone ? Fin.fmtPhone(n) : n);
    const rows = [];
    const lineSec = {};
    if (opt.withPw && global.Vault && global.Vault.allowed()) for (const id of itemIds) { const l = (DB.lines || []).find(x => x.id === id); if (l) lineSec[id] = await global.Vault.read('line', id); }
    itemIds.forEach(id => {
      const a = (DB.assets || []).find(x => x.id === id);
      if (a) { const nm = [a.brand, a.model].filter(Boolean).join(' ') || a.specs || ''; rows.push({ desc: `${((Fin.TYPES || {})[a.type] || ['جهاز'])[0]} ${nm} — <span class="ltr">${esc(a.tag)}</span>${a.serial ? ' — <span class="ltr">' + (a.type === 'mobile' ? 'IMEI ' : 'S/N ') + esc(a.serial) + '</span>' : ''}`, date: a.assignedAt || '', cond: a.condition || 'جيدة', note: a.kit && a.kit !== '—' ? 'الملحقات: ' + a.kit : '' }); return; }
      const l = (DB.lines || []).find(x => x.id === id);
      if (l) { const s = lineSec[id] || {}; rows.push({ desc: `شريحة ${esc(l.carrier || '')} — <span class="ltr">${esc(fp(l.number))}</span> — <span class="ltr">${esc(l.code || '')}</span>${l.plan ? ' — ' + esc(l.plan) : ''}`, date: l.assignedAt || '', cond: 'تعمل', note: [l.iccid && 'ICCID: ' + l.iccid, s.pin && 'PIN: ' + s.pin, s.puk && 'PUK: ' + s.puk].filter(Boolean).join(' · ') }); }
    });
    while (rows.length < 3) rows.push({ desc: '', date: '', cond: '', note: '' });
    const today = U.today(), [y, mo, d] = today.split('-');
    const day = new Date(today + 'T12:00:00').toLocaleDateString('ar-EG', { weekday: 'long' });
    const logo = (global.BRAND || {}).logo || 'img/logo.png';
    const top = `<div class="tpf-top"><div class="tpf-corner"></div><img src="${esc(logo)}" alt=""></div>`;
    const foot = n => `<div class="tpf-foot"><div></div><div>Page <b>${n}</b> of <b>2</b></div></div>`;
    const party = (title, p) => `<h4>${title}</h4><ul><li>الاسم : ${dots(p.name, 260)}</li><li>المسمى الوظيفي : ${dots(p.title, 220)}</li><li>القسم : ${dots(p.dept, 270)}</li><li>التوقيع : ${dots('', 260)}</li></ul>`;
    const T = (n, t, p) => `<div class="term"><h4>${n} : ${t} .</h4><p>- ${p}</p></div>`;
    return `<div class="rcp tpf"><style>${CSS}${RCSS}</style>
      <div class="rcp-page"><div class="rcp-body">${top}<img class="rcp-wm" src="${esc(logo)}" alt="">
        <h1>نموذج استلام عهدة</h1>
        <p>* انه في يوم : <b>${esc(day)}</b> &nbsp; الموافق &nbsp; <b>${AR(+d)} / ${AR(+mo)} / ${AR(y)}</b></p>
        ${party('الطرف الأول :- ( مسؤول العهدة )', { name: st.itOfficerName, title: st.itOfficerTitle, dept: st.itOfficerDept || 'IT' })}
        ${party('الطرف الثاني :- ( مستلم العهدة )', { name: m.name, title: m.role, dept: m.dept })}
        <div class="hr"></div>
        <p style="font-weight:800;text-decoration:underline">** يقر الطرف الأول بتسليم المواد/المعدات/الأدوات المبينة في الجدول التالي إلى الطرف الثاني بموجب هذه العهدة :-</p>
        <table><tr><th style="width:52px">رقم العنصر</th><th style="width:30%">وصف العنصر</th><th style="width:52px">الكمية</th><th>تاريخ التسليم</th><th>حالة العنصر وقت التسليم</th><th>ملاحظات</th></tr>
          ${rows.map((r, i) => `<tr><td style="text-align:center;font-weight:800">- ${AR(i + 1)}</td><td>${r.desc}</td><td style="text-align:center">${r.desc ? '١' : ''}</td><td style="text-align:center" class="ltr">${esc(r.date)}</td><td style="text-align:center">${esc(r.cond)}</td><td class="ltr" style="text-align:right">${esc(r.note)}</td></tr>`).join('')}</table>
        <p class="note">** تخضع جميع العهد لجميع نصوص مواد القوانين المنظمة لها و اللائحة الداخلية للشركة و التي ينطبق على مثل هذة الحالات نص المادة رقم ( ٢ ، ١٨ ، ٢٦ ) ، و التي اذا تحققت يحق للطرف الأول اتخاذ اللازم قانوناً بما يترائى له بموجب ماتم النص علية في اللائحة أو القوانين المنظمة لهذة الحالات اذا تطلب الامر .</p>
      </div>${foot(1)}</div>
      <div class="rcp-page"><div class="rcp-body">${top}<img class="rcp-wm" src="${esc(logo)}" alt="">
        <h2>الشروط و الاحكام القانونية للعهدة :-</h2>
        ${T('أولاً', 'الغرض من العهدة', 'يقر الطرف الأول بتسليم (المواد/المعدات/الأدوات) المبينة في الجدول التالي إلى الطرف الثاني بموجب هذه العهدة ، بحيث يُمنع على الطرف الثاني استخدام العهدة لأي غرض شخصي أو خارج نطاق العمل المصرح به من قبل الطرف الأول .')}
        ${T('ثانياً', 'تسليم العهدة واستلامها', 'يقر الطرف الثاني باستلام العهدة وفقًا للبيانات المذكورة في هذا النموذج ويُعتبر مسئولًا عنها طوال مدة العهدة ، يجب على الطرف الثاني إبلاغ الطرف الأول فورًا في حال حدوث أي تغيير في حالة العهدة أو عند تلف أو فقدان أي جزء منها .')}
        ${T('ثالثاً', 'المسؤولية القانونية', 'يُسأل الطرف الثاني قانونيًا عن العهدة أثناء فترة الاستلام حتى إعادتها للطرف الأول ، و في حال تلف أو فقدان أي عنصر من العهدة نتيجة لإهمال أو سوء استخدام من الطرف الثاني، يلتزم بتعويض الطرف الأول عن الأضرار الناجمة وفقًا للوائح المنظمة المعمول بها داخل الشركة ، حيث يتعهد الطرف الثاني بالالتزام بالقوانين المحلية واللوائح التنظيمية المتعلقة باستخدام المواد والموارد خلال فترة العهدة ، و بناء علية في حال عدم الالتزام بإرجاع العهدة، يحق للطرف الأول اتخاذ الإجراءات القانونية اللازمة لاسترجاع العهدة أو تعويض القيمة المالية لها .')}
        ${T('رابعاً', 'استرجاع العهدة', `يحق للطرف الأول استرجاع العهدة في أي وقت من الطرف الثاني دون إشعار مسبق، وفي هذه الحالة يلتزم الطرف الثاني بإعادة العهدة في حالة جيدة كما تسلمها ، في حال طلب الطرف الأول إرجاع العهدة يجب على الطرف الثاني إعادتها خلال ( ${opt.returnDays ? '<b>' + esc(opt.returnDays) + '</b>' : '..............'} ) من تاريخ الطلب .`)}
        ${T('خامساً', 'الفحص والتدقيق', 'يحق للطرف الأول فحص العهدة أو إجراء تدقيق للتحقق من حالتها واستخدامها في أي وقت ، في حال اكتشاف أي استخدام غير قانوني أو مخالف للغرض المتفق عليه، يحق للطرف الأول اتخاذ الإجراءات القانونية المناسبة .')}
        ${T('سادساً', 'الإقرار والتعهد', 'يُقر الطرف الثاني بأن جميع التفاصيل الواردة في هذا النموذج صحيحة، ويقبل المسؤولية القانونية عن جميع المواد والأدوات المسلمة له ، و يتعهد الطرف الثاني بعدم نقل العهدة أو تسليمها إلى أي شخص آخر دون الحصول على إذن كتابي من الطرف الأول .')}
        ${T('سابعاً', 'الالتزامات المالية', 'في حال حدوث أي ضرر أو فقدان للعهدة بسبب إهمال الطرف الثاني، يلتزم الطرف الثاني بتحمل كافة التكاليف المتعلقة بإصلاح أو تعويض قيمة المواد المتلفة أو المفقودة .')}
        ${T('ثامناً', 'سريان بنود النموذج', 'يسري هذا النموذج من تاريخ توقيع الطرفين عليه ويظل ساريًا حتى تسليم وإعادة كافة المواد المستلمة ، و إذا نشأ أي نزاع أو خلاف متعلق بهذه العهدة، يتم حله بالطرق القانونية المعتمدة في القوانين المحلية، عن طريق الجهات القضائية المختصة .')}
        <div class="sig"><p>* اسم : ${dots(m.name, 240)}</p><p>* توقيع : ${dots('', 240)}</p></div>
      </div>${foot(2)}</div>
    </div>`;
  }

  // نافذة: اختيار العهد (الموبايلات والخطوط متعلّمين تلقائي) ← طباعة
  Fin.printReceipt = function (empId, preIds) {
    const m = (DB.team || []).find(x => x.id === empId); if (!m) return UI.toast('الموظف مش موجود', 'err');
    const fp = n => (Fin.fmtPhone ? Fin.fmtPhone(n) : n);
    const as = (DB.assets || []).filter(a => a.holderId === empId), ls = (DB.lines || []).filter(l => l.holderId === empId && l.status !== 'cancelled');
    if (!as.length && !ls.length) return UI.toast('مفيش عهد مع ' + m.name, 'warn');
    const pre = preIds && preIds.length ? preIds : as.filter(a => a.type === 'mobile').map(a => a.id).concat(ls.map(l => l.id));
    const opt = (id, label) => `<label class="chk"><input type="checkbox" data-it="${id}" ${pre.includes(id) ? 'checked' : ''}> ${label}</label>`;
    UI.modal({
      title: '🖨 نموذج استلام عهدة — ' + m.name, saveLabel: 'طباعة', wide: true,
      body: `<p class="muted small">اختار العهد اللي هتتكتب في الجدول (الموبايلات والخطوط متعلّمين تلقائي):</p>
        <div class="chk-grid wide">${as.map(a => opt(a.id, `<b dir="ltr">${esc(a.tag)}</b> ${esc([a.brand, a.model].filter(Boolean).join(' ') || a.specs || '')}`)).join('')}${ls.map(l => opt(l.id, `📞 <b dir="ltr">${esc(fp(l.number))}</b> ${esc(l.carrier || '')} <small dir="ltr">${esc(l.code || '')}</small>`)).join('')}</div>
        <div class="grid2">${UI.field({ label: 'مدة إرجاع العهدة عند الطلب', name: 'returnDays', value: '', placeholder: 'مثال: 3 أيام (فاضي = تتكتب بالإيد)' })}
        ${global.Vault && global.Vault.allowed() ? UI.field({ label: 'اكتب PIN و PUK الشرائح في الملاحظات', name: 'pw', type: 'checkbox', value: false }) : ''}</div>`,
      onSave: x => {
        const ids = Array.from(x.el.querySelectorAll('[data-it]')).filter(i => i.checked).map(i => i.dataset.it);
        if (!ids.length) throw new Error('اختار عهدة واحدة على الأقل');
        const d = UI.form(x.el);
        buildReceipt(empId, ids, { returnDays: d.returnDays, withPw: !!d.pw }).then(html => UI.print(html), e => { if (e.message !== 'cancel') UI.toast(e.message, 'err'); });
      },
    });
  };
  Fin.buildReceipt = buildReceipt; // للاختبار
})(window);
