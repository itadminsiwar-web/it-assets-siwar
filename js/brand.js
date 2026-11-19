/* =========================================================
   brand.js — هوية الشركة (الملف الوحيد اللي تغيّره عشان تغيّر الاسم واللوجو)
   ---------------------------------------------------------
   1) غيّر القيم اللي تحت.
   2) لو هتغيّر اللوجو: حط الصورة الجديدة في فولدر img بنفس الاسم
      (logo.png للخلفية الفاتحة، logo-white.png للوضع الليلي) — أو اكتب اسم ملفك هنا.
   3) افتح النظام تاني (Ctrl+F5) — الاسم الجديد بيتطبق على الشاشات والمطبوعات
      والبيانات المسجلة قبل كده بالاسم القديم.
   ========================================================= */
window.BRAND = {
  company: 'Three Pillars',             // اسم الشركة (بيظهر في الإقرارات والمطبوعات وفلتر الشركات)
  companyEn: 'Three Pillars',           // الاسم بالإنجليزي (المطبوعات ثنائية اللغة)
  systemName: 'تكنولوجيا المعلومات',      // اسم النظام (بيظهر جنب اللوجو لو nameNextToLogo = true)
  title: 'تكنولوجيا المعلومات',          // عنوان تاب المتصفح وأسفل القايمة
  titleEn: 'Information Technology',    // نفس الاسم بالإنجليزي (شاشة الدخول)
  tagline: '«كل جهاز معروف مكانه — وكل عهدة مربوطة بكود الموظف»', // جملة شاشة الدخول
  logo: 'img/logo.png',                 // اللوجو على الخلفية الفاتحة: العلامة برتقالي والكلام غامق
  logoWhite: 'img/logo-white.png',      // اللوجو الأبيض: الوضع الليلي وشاشة الدخول
  emailDomain: 'company.com',           // دومين إيميلات الشركة (name@الدومين) — غيّره لدومين Three Pillars
  branches: ['الفرع الرئيسي — الرياض', 'مكتب القاهرة', 'المخزن'], // الفروع الافتراضية (تتعدل بعد كده من المزامنة والإعدادات)
  accent: '#c94f08',                    // برتقالي Three Pillars (أغمق شوية من #F35F09 عشان الكلام الأبيض يبان على الأزرار)
  accentLight: '#F35F09',               // البرتقالي الأصلي (أيقونة وشريط المساعد)
  // شركات المجموعة: الاسم اللي بيظهر + الكود اللي بيدخل في كود الجهاز
  // Three Pillars: سوار وسكبه هما "الفروع" (الكود بيدخل في كود الجهاز: siwar-CMP-001)
  companies: [
    { name: 'Siwar', code: 'siwar', branches: [] },
    { name: 'Sakkbah', code: 'sakkbah', branches: [] },
  ],
  companiesVersion: 3,                 // زوّده لو غيّرت الشركات/الفروع عشان الداتا المحفوظة تتحدّث
  companyLabel: 'الفرع',                // اسم "الشركة" في الشاشات
  companyLabelAll: 'كل الفروع',
  baseCurrency: 'EGP',                  // كل المبالغ بالجنيه المصري (الريال بيتحوّل بسعر الصرف)
  // أكواد الأجهزة: الشركة-النوع-الرقم (siwar-LTP-001) — الترقيم لكل نوع على مستوى المجموعة
  // الفئات العشر (M02): CMP · CMPM · CMPH · LTP · AIO · PRN · MOB(=Mobile في شيت الجرد) · MAC · Hard · mon
  typeAliases: { MOB: 'mobile', MON: 'monitor' },
  typeCodes: { desktop: 'CMP', desktopDesign: 'CMPM', desktopMotion: 'CMPH', aio: 'AIO', mac: 'MAC', hdd: 'Hard', laptop: 'LTP', mobile: 'Mobile', monitor: 'mon', tablet: 'TAB', printer: 'PRN', network: 'RTR', camera: 'CAM', lens: 'LNS', lighting: 'LGT', audio: 'AUD', accessory: 'ACC', other: 'OTH' },
  lineCodes: { SA: 'Siw-KSA', EG: 'Siw-EGY' }, // الأرقام السعودي Siw-KSA-001 والمصري Siw-EGY-001
  mailCode: 'Siw-EML',                  // كود الإيميلات: Siw-EML-001
  nameNextToLogo: false,                // true لو اللوجو أيقونة بس ومحتاج الاسم جنبه في الشريط العلوي
  // شيتات جوجل (النظام بيقرا منها بس — مش بيكتب فيها):
  //   id      = شيت الجرد (الأجهزة، تاب "شيت جرد")
  //   usageId = شيت سكربت WE (تابات الباقات والاستهلاك)
  // غيّر version لو غيّرت الشيتات عشان الإعدادات المحفوظة تتحدّث
  sheet: {
    version: 1,
    mirror: true,   // النظام = نسخة من شيت الجرد: الأجهزة اللي مش في الشيت والموظفين اللي أساميهم مش فيه بيتشالوا
    id: '1V_l_xHPs7XT25M2ZlWurzEsvSoEaUr6nZii57n1IFHk',
    usageId: '1lQkUeP0CUIMIc_sf-kauQiVYY6EB16hZSIPrMn0n44U',
    tabs: { assets: 'شيت جرد', netPackages: 'الباقات', usage: 'الاستهلاك' },
  },
};

// ---- تطبيق الهوية على البيانات المحفوظة (متغيّرش الجزء ده) ----
window.applyBrand = function (DB) {
  const B = window.BRAND, s = DB.settings, old = s.companyName;
  if (B.accent && !document.getElementById('brandAccent')) { // الأزرار والروابط + شاشة الدخول
    const st = document.createElement('style'); st.id = 'brandAccent';
    st.textContent = ':root, :root[data-theme] { --accent: ' + B.accent + '; --s1: ' + B.accent + '; } .login-wrap, :root[data-theme] .login-wrap { --lg-accent: ' + B.accent + '; --lg-sq: ' + B.accent + '55; }' +
      ' .bot-btn, .bot-box header { background: linear-gradient(135deg, ' + (B.accentLight || B.accent) + ', ' + B.accent + '); }';
    document.head.appendChild(st);
  }
  if (s.brandApplied === JSON.stringify([B.company, B.companyEn, B.logo, B.emailDomain])) return false;
  s.companyName = B.company; s.companyNameEn = B.companyEn || B.company; s.logo = B.logo; s.logoInit = true;
  // تغيير الدومين: الإيميلات والدومينات المسجلة بالدومين القديم تتغير للجديد
  const oldDom = s.emailDomain;
  if (B.emailDomain && oldDom && oldDom !== B.emailDomain) {
    const fix = v => typeof v === 'string' ? v.split(oldDom).join(B.emailDomain) : v;
    (DB.mailboxes || []).forEach(b => { b.address = fix(b.address); b.aliases = fix(b.aliases); b.forwardTo = fix(b.forwardTo); });
    (DB.team || []).forEach(m => { m.email = fix(m.email); });
    (DB.users || []).forEach(u => { if (!/@example\.com$/.test(u.email || '')) u.email = fix(u.email); });
    (DB.subscriptions || []).forEach(x => { x.name = fix(x.name); x.loginEmail = fix(x.loginEmail); });
    (DB.domains || []).forEach(x => { x.name = fix(x.name); });
  }
  if (B.emailDomain) s.emailDomain = B.emailDomain;
  // الاسم القديم في سجلات الأجهزة والموظفين والشرائح وطلبات الاحتياج يتغير للجديد
  if (old && old !== B.company) {
    ['team', 'assets', 'lines', 'requisitions', 'tools', 'netPackages'].forEach(k => (DB[k] || []).forEach(x => { if (x.company === old) x.company = B.company; }));
    ((DB.itSettings || {}).companies || []).forEach(c => { if (c.name === old) c.name = B.company; });
  }
  s.brandApplied = JSON.stringify([B.company, B.companyEn, B.logo, B.emailDomain]);
  return true;
};
