/* =========================================================
   core.js — البيانات، التخزين، الأدوات العامة
   كل البيانات في كائن واحد DB يُحفظ في localStorage.
   لربطه بقاعدة بيانات حقيقية (Firebase/API) غيّر Store.load / Store.save فقط.
   ========================================================= */
(function (global) {
  'use strict';

  // النسخة المستقلة (IT Assets) بتحدد مفتاح تخزين خاص بيها في config.js عشان متخلطش مع النظام المالي
  const STORAGE_KEY = (global.APP_CONFIG && global.APP_CONFIG.storageKey) || 'crm_finance_sa_v1';
  const BRAND = global.BRAND || {};

  // ---------- أدوات عامة ----------
  const U = {
    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    today() { return U.isoDate(new Date()); },
    isoDate(d) {
      const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return z.toISOString().slice(0, 10);
    },
    addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return U.isoDate(d); },
    addMonths(iso, n) {
      const d = new Date(iso + 'T00:00:00'); const day = d.getDate();
      d.setDate(1); d.setMonth(d.getMonth() + n);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last)); return U.isoDate(d);
    },
    daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); },
    monthKey(iso) { return iso.slice(0, 7); },
    startOfMonth(iso) { return iso.slice(0, 8) + '01'; },
    startOfYear(iso) { return iso.slice(0, 4) + '-01-01'; },
    round(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; },
    num(v) { const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; },
    money(n, withCur) {
      const v = U.round(n || 0);
      const s = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (withCur === false) return s;
      // withCur ممكن يكون كود عملة (EGP/USD) لعرض مبلغ بعملة خزينة أجنبية
      if (typeof withCur === 'string' && withCur !== (DB.settings.baseCurrency || 'SAR')) {
        const c = (DB.settings.currencies || []).find(x => x.code === withCur);
        return s + ' ' + (c ? c.symbol || c.code : withCur);
      }
      return s + ' ' + (DB.settings.currency || '');
    },
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    sum(arr, fn) { return U.round(arr.reduce((a, x) => a + (fn ? fn(x) : x), 0)); },
    by(key) { return (a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0); },
    clone(o) { return JSON.parse(JSON.stringify(o)); },
    inRange(date, from, to) { return (!from || date >= from) && (!to || date <= to); },
    hijri(iso) {
      try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00')); }
      catch (e) { return ''; }
    },
  };

  // ---------- دليل الحسابات الافتراضي ----------
  // type: asset | liability | equity | revenue | expense
  // دليل حسابات وكالة تسويق في المملكة العربية السعودية
  const DEFAULT_ACCOUNTS = [
    ['1000', 'الأصول', 'asset', null, true],
    ['1100', 'النقدية والبنوك', 'asset', '1000', true],
    ['1200', 'العملاء (ذمم مدينة)', 'asset', '1000', true],
    ['1300', 'ضريبة القيمة المضافة - مدخلات', 'asset', '1000', true],
    ['1400', 'سُلف وعُهد الموظفين', 'asset', '1000', false],
    ['1450', 'مصروفات مدفوعة مقدماً (إيجار، اشتراكات)', 'asset', '1000', false],
    ['1500', 'أصول ثابتة (أجهزة، معدات تصوير، أثاث)', 'asset', '1000', false],
    ['1590', 'مجمع الإهلاك', 'asset', '1000', false],
    ['2000', 'الخصوم', 'liability', null, true],
    ['2100', 'الموردين (ذمم دائنة)', 'liability', '2000', true],
    ['2200', 'ضريبة القيمة المضافة - مخرجات', 'liability', '2000', true],
    ['2300', 'دفعات مقدمة من العملاء (ميزانيات إعلانية)', 'liability', '2000', true],
    ['2400', 'ضريبة الاستقطاع المستحقة', 'liability', '2000', true],
    ['2500', 'مخصص مكافأة نهاية الخدمة', 'liability', '2000', false],
    ['2600', 'رواتب مستحقة', 'liability', '2000', false],
    ['2650', 'التأمينات الاجتماعية المستحقة', 'liability', '2000', false],
    ['2700', 'مخصص الزكاة', 'liability', '2000', false],
    ['3000', 'حقوق الملكية', 'equity', null, true],
    ['3100', 'رأس المال', 'equity', '3000', true],
    ['3150', 'الاحتياطي النظامي', 'equity', '3000', false],
    ['3200', 'الأرباح المحتجزة', 'equity', '3000', true],
    ['3300', 'جاري الشركاء / المسحوبات', 'equity', '3000', false],
    ['3900', 'أرصدة افتتاحية', 'equity', '3000', true],
    ['4000', 'الإيرادات', 'revenue', null, true],
    ['4100', 'إيرادات خدمات تسويقية عامة', 'revenue', '4000', true],
    ['4110', 'إيرادات إدارة حسابات التواصل الاجتماعي', 'revenue', '4000', false],
    ['4120', 'إيرادات إدارة الحملات الإعلانية', 'revenue', '4000', false],
    ['4130', 'إيرادات إنتاج المحتوى والتصوير', 'revenue', '4000', false],
    ['4140', 'إيرادات التصميم والهوية البصرية', 'revenue', '4000', false],
    ['4150', 'إيرادات التسويق عبر المؤثرين', 'revenue', '4000', false],
    ['4160', 'إيرادات SEO وتطوير المواقع', 'revenue', '4000', false],
    ['4170', 'إيرادات تنظيم الفعاليات', 'revenue', '4000', false],
    ['4180', 'إعادة فوترة الإنفاق الإعلاني للعملاء', 'revenue', '4000', false],
    ['4200', 'إيرادات أخرى', 'revenue', '4000', false],
    ['4250', 'أرباح فروق عملة', 'revenue', '4000', true],
    ['4900', 'مردودات وخصومات المبيعات', 'revenue', '4000', true],
    ['5000', 'التكاليف المباشرة للحملات', 'expense', null, true],
    ['5100', 'تكاليف مباشرة عامة', 'expense', '5000', true],
    ['5110', 'الإنفاق الإعلاني (Meta, Google, Snap, TikTok, X)', 'expense', '5000', false],
    ['5120', 'أتعاب المؤثرين', 'expense', '5000', false],
    ['5130', 'مستقلون (فريلانسرز)', 'expense', '5000', false],
    ['5140', 'إنتاج وتصوير ومونتاج', 'expense', '5000', false],
    ['5150', 'طباعة ومواد دعائية وفعاليات', 'expense', '5000', false],
    ['6000', 'المصروفات التشغيلية والإدارية', 'expense', null, true],
    ['6100', 'رواتب وأجور', 'expense', '6000', false],
    ['6105', 'أجور فريق مصر (عن بُعد)', 'expense', '6000', false],
    ['6106', 'إيجار ومصروفات مكتب مصر', 'expense', '6000', false],
    ['6110', 'التأمينات الاجتماعية (GOSI)', 'expense', '6000', false],
    ['6120', 'رسوم الإقامات والمقابل المالي والتأشيرات', 'expense', '6000', false],
    ['6130', 'مكافأة نهاية الخدمة', 'expense', '6000', false],
    ['6140', 'التأمين الطبي والبدلات', 'expense', '6000', false],
    ['6200', 'الإيجارات', 'expense', '6000', false],
    ['6300', 'كهرباء ومياه واتصالات وإنترنت', 'expense', '6000', false],
    ['6400', 'اشتراكات البرامج والأدوات', 'expense', '6000', false],
    ['6500', 'تسويق الوكالة نفسها', 'expense', '6000', false],
    ['6600', 'عمولات المبيعات', 'expense', '6000', true],
    ['6700', 'انتقالات وسفر', 'expense', '6000', false],
    ['6800', 'مصروفات بنكية وعمولات بوابات الدفع', 'expense', '6000', true],
    ['6850', 'رسوم حكومية (سجل تجاري، غرفة، بلدية، قوى)', 'expense', '6000', false],
    ['6880', 'مصروف الإهلاك', 'expense', '6000', false],
    ['6950', 'خسائر فروق عملة', 'expense', '6000', true],
    ['6900', 'مصروفات عمومية وإدارية', 'expense', '6000', false],
    ['6990', 'الزكاة', 'expense', '6000', false],
  ];

  const ACCOUNT_TYPES = {
    asset: { label: 'أصول', normal: 'debit' },
    liability: { label: 'خصوم', normal: 'credit' },
    equity: { label: 'حقوق ملكية', normal: 'credit' },
    revenue: { label: 'إيرادات', normal: 'credit' },
    expense: { label: 'مصروفات', normal: 'debit' },
  };

  // أكواد الحسابات التي يستخدمها محرك القيود تلقائياً
  const SYS = { CASH: '1100', AR: '1200', VAT_IN: '1300', AP: '2100', VAT_OUT: '2200', ADVANCES: '2300', WHT: '2400', CAPITAL: '3100', RETAINED: '3200', OPENING: '3900', SALES: '4100', SALES_RET: '4900', COGS_ROOT: '5000', PURCHASES: '5100', AD_SPEND: '5110', COMMISSION: '6600', BANK_FEES: '6800' };

  // التحقق من الرقم الضريبي السعودي: 15 رقماً يبدأ وينتهي بـ 3
  function validVAT(v) { return /^3\d{13}3$/.test(String(v || '').trim()); }

  function emptyDB() {
    const db = {
      version: 1,
      settings: {
        companyName: BRAND.company || 'SEG', companyNameEn: BRAND.companyEn || BRAND.company || 'SEG', phone: '', email: '', taxNumber: '', commercialReg: '',
        address: '', buildingNo: '', street: '', district: '', city: 'الرياض', postalCode: '', additionalNo: '',
        currency: 'ر.س', currencyWord: 'ريال سعودي', subunitWord: 'هللة', vatRate: 15, dueDays: 30, whtRate: 5,
        baseCurrency: 'SAR',
        // rate = كم ريال تساوي وحدة واحدة من العملة (سعر افتراضي يمكن تعديله في كل حركة)
        currencies: [{ code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م', rate: 0.078 }, { code: 'USD', name: 'دولار أمريكي', symbol: '$', rate: 3.75 }],
        showHijri: true, bilingual: true, autoRecurring: true, logo: '', lockDate: '', openingDate: U.startOfYear(U.today()),
        bankDetails: '',
        invoiceTerms: 'يرجى السداد خلال مدة الاستحقاق الموضحة بالتحويل البنكي على الحساب الموضح.',
        prefixes: { invoice: 'INV-', quote: 'QT-', receipt: 'RV-', credit: 'CN-', debit: 'DN-', bill: 'BL-', payment: 'PV-', expense: 'EX-', transfer: 'TR-', journal: 'JV-' },
      },
      seq: {},
      accounts: [],
      treasuries: [], customers: [], suppliers: [], items: [], reps: [], projects: [],
      quotes: [], invoices: [], receipts: [], creditNotes: [],
      bills: [], debitNotes: [], payments: [], expenses: [], transfers: [], journals: [],
      // نظام التسويق (يشارك العملاء والمشاريع مع النظام المالي)
      campaigns: [], campaignStats: [], content: [], team: [], tasks: [], leads: [], influencers: [], influencerDeals: [],
      // نظام تقنية المعلومات (الموظفون = team المشتركة)
      assets: [], assetLog: [], subscriptions: [], lines: [], mailboxes: [], moves: [],
      // دورة الموظف (طلبات الاحتياج ← المرشحين ← التعيين 0–8 ← الإخلاء X1–X9) + المستندات + أصول IT الإضافية
      requisitions: [], candidates: [], cycles: [], itDocs: [], itLog: [], consumables: [], netPackages: [], tools: [], domains: [], backups: [], usageSnapshots: [], stocktakes: [], syncErrors: [], alertsSent: [],
      // المنصة المشتركة: الأتمتة، الماكرو، سجل التواصل، الإشعارات، التكاملات
      rules: [], macros: [], activities: [], notifications: [], autoLog: [], autoRuns: {}, integrations: {},
      visitors: [], pageviews: [], // زوار موقع الشركة (track.js)
      // المستخدمون: كلمة السر محفوظة كـ SHA-256 (مع بادئة ثابتة) وليست نصاً صريحاً
      // الحساب التجريبي: admin@example.com / Admin@123
      users: [{ id: 'u_admin', name: 'مدير النظام', email: 'admin@example.com', passHash: '48ac9feee50f195c259ba5bbf28c09f6cfa492f6e92bb98c49e2ce7e820365ec', role: 'admin' }],
      budgets: {}, // accountId -> monthly amount
      reconciled: {}, // "src:srcId:accountId" -> تاريخ التسوية البنكية
      audit: [],
    };
    const codeToId = {};
    DEFAULT_ACCOUNTS.forEach(([code, name, type, parent, system]) => {
      const id = 'acc_' + code; codeToId[code] = id;
      db.accounts.push({ id, code, name, type, parentId: parent ? 'acc_' + parent : null, system, active: true });
    });
    const cashAcc = { id: 'acc_1101', code: '1101', name: 'الصندوق الرئيسي', type: 'asset', parentId: 'acc_1100', system: false, active: true };
    db.accounts.push(cashAcc);
    db.treasuries.push({ id: U.uid(), name: 'الصندوق الرئيسي', kind: 'cash', currency: 'SAR', accountId: cashAcc.id, opening: 0, bankName: '', iban: '' });
    return db;
  }

  // ---------- التخزين ----------
  let DB = null;
  const listeners = [];

  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        DB = raw ? Object.assign(emptyDB(), JSON.parse(raw)) : emptyDB();
      } catch (e) { console.error(e); DB = emptyDB(); }
      // ضمان وجود المفاتيح الجديدة عند تحديث النسخة
      const base = emptyDB();
      Object.keys(base).forEach(k => { if (DB[k] === undefined) DB[k] = base[k]; });
      DB.settings = Object.assign({}, base.settings, DB.settings);
      DB.settings.prefixes = Object.assign({}, base.settings.prefixes, DB.settings.prefixes);
      // اسم الشركة الجديد بدل اسم البيانات التجريبية القديم
      if (DB.settings.companyName === 'وكالة أثر للتسويق الرقمي') { DB.settings.companyName = 'SEG'; DB.settings.companyNameEn = 'SEG'; }
      // لوجو SEG الافتراضي في الفواتير (مرة واحدة؛ لو المستخدم شاله ما يرجعش)
      if (!DB.settings.logoInit) { if (!DB.settings.logo) DB.settings.logo = BRAND.logo || 'img/seg-logo.png'; DB.settings.logoInit = true; }
      global.DB = DB;
      return DB;
    },
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); }
      catch (e) { alert('تعذر الحفظ: ' + e.message); }
      listeners.forEach(fn => fn());
    },
    onChange(fn) { listeners.push(fn); },
    replace(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); Store.load(); Store.save(); },
    reset() { localStorage.removeItem(STORAGE_KEY); Store.load(); Store.save(); },
    exportJSON() { return JSON.stringify(DB, null, 2); },
  };

  // ---------- الترقيم التلقائي ----------
  function nextNo(kind) {
    DB.seq[kind] = (DB.seq[kind] || 0) + 1;
    return (DB.settings.prefixes[kind] || '') + String(DB.seq[kind]).padStart(5, '0');
  }
  function peekNo(kind) {
    return (DB.settings.prefixes[kind] || '') + String((DB.seq[kind] || 0) + 1).padStart(5, '0');
  }

  // ---------- سجل التدقيق ----------
  function audit(action, entity, ref, detail) {
    DB.audit.unshift({ at: new Date().toISOString(), action, entity, ref: ref || '', detail: detail || '' });
    if (DB.audit.length > 2000) DB.audit.length = 2000;
  }

  // ---------- إقفال الفترة ----------
  function isLocked(date) { return !!(DB.settings.lockDate && date && date <= DB.settings.lockDate); }
  function assertOpen(date) {
    if (isLocked(date)) throw new Error('الفترة حتى ' + DB.settings.lockDate + ' مقفلة. لا يمكن إضافة أو تعديل حركات بتاريخ ' + date);
  }

  // ---------- عمليات CRUD عامة ----------
  function find(coll, id) { return DB[coll].find(x => x.id === id); }
  function upsert(coll, obj, label) {
    const i = DB[coll].findIndex(x => x.id === obj.id);
    if (i >= 0) { DB[coll][i] = obj; audit('تعديل', label || coll, obj.no || obj.name || obj.id); }
    else { if (!obj.id) obj.id = U.uid(); obj.createdAt = obj.createdAt || new Date().toISOString(); DB[coll].push(obj); audit('إضافة', label || coll, obj.no || obj.name || obj.id); }
    Store.save();
    return obj;
  }
  function remove(coll, id, label) {
    const o = find(coll, id);
    DB[coll] = DB[coll].filter(x => x.id !== id);
    audit('حذف', label || coll, o ? (o.no || o.name || id) : id);
    Store.save();
  }

  function accByCode(code) { return DB.accounts.find(a => a.code === code); }
  function accId(code) { const a = accByCode(code); return a ? a.id : null; }

  global.U = U;
  global.Store = Store;
  global.Core = { STORAGE_KEY, ACCOUNT_TYPES, SYS, validVAT, emptyDB, nextNo, peekNo, audit, isLocked, assertOpen, find, upsert, remove, accByCode, accId };
})(typeof window !== 'undefined' ? window : globalThis);
