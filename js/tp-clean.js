/* =========================================================
   tp-clean.js — شيل البيانات الوهمية (مرة واحدة) — Three Pillars
   بيفضل: الأجهزة (من شيت الجرد) · الموظفين (قايمة HR + أسامي الشيت) · الإيميلات (Siw-EML)
          الشرائح السعودية (Siw-KSA) · باقات الإنترنت وقراءاتها · الجرد · المالية والصلاحيات والملفات اللي اتسجلت
          · خزنة الباسوردات · الإعدادات · سجل التدقيق
   بيتشال: الحسابات التجريبية (@example.com) · التولات/الاشتراكات/الدومينات/الباك أب/المستهلكات التجريبية
          · المرشحين وطلبات الاحتياج والتعيين والإخلاء والمستندات التجريبية · الشرائح المصرية التجريبية
          · بيانات النظام المالي والتسويق التجريبية · الإشعارات والسجل القديم
   قبل المسح: نسخة كاملة من البيانات القديمة في المتصفح (<storageKey>_before_clean)
   ========================================================= */
(function (global) {
  'use strict';
  const DEMO = ['treasuries', 'customers', 'suppliers', 'items', 'reps', 'projects', 'quotes', 'invoices', 'receipts', 'creditNotes', 'bills', 'debitNotes', 'payments', 'expenses', 'transfers', 'journals',
    'campaigns', 'campaignStats', 'content', 'tasks', 'leads', 'influencers', 'influencerDeals', 'rules', 'macros', 'activities', 'notifications', 'autoLog', 'visitors', 'pageviews',
    'subscriptions', 'moves', 'requisitions', 'candidates', 'cycles', 'itDocs', 'itLog', 'consumables', 'tools', 'domains', 'backups', 'syncErrors', 'alertsSent', 'accounts', 'autoRuns', 'integrations', 'budgets', 'reconciled'];
  const demoUser = u => /@example\.com$/i.test(u.email || '') || u.role === 'client';
  function apply() {
    const DB = global.DB, C = global.Core; if (!DB) return false; let ch = false;
    if ((DB.users || []).some(demoUser)) { DB.users = DB.users.filter(u => !demoUser(u)); ch = true; } // الحسابات التجريبية بتتشال دايمًا
    if (!DB.tpRealV1) {
      try { localStorage.setItem(C.STORAGE_KEY + '_before_clean', JSON.stringify(DB)); } catch (e) { /* المساحة مش كفاية — البيانات القديمة تجريبية أصلًا */ }
      const base = C.emptyDB();
      DEMO.forEach(k => { DB[k] = base[k]; });
      DB.team = (DB.team || []).filter(t => t.hrList || t.source === 'sheet');
      const staff = new Set(DB.team.map(t => t.id));
      DB.lines = (DB.lines || []).filter(l => /^Siw-KSA/i.test(l.code || ''));
      DB.mailboxes = (DB.mailboxes || []).filter(b => /^Siw-EML/i.test(b.code || '') || staff.has(b.holderId));
      const refs = new Set(DB.assets.map(a => a.id).concat(DB.lines.map(l => l.id)));
      DB.assetLog = (DB.assetLog || []).filter(l => refs.has(l.assetId));
      const nets = new Set((DB.netPackages || []).map(n => n.id));
      DB.usageSnapshots = (DB.usageSnapshots || []).filter(s => nets.has(s.refId));
      DB.assets.forEach(a => { if (a.holderId && !staff.has(a.holderId)) a.holderId = ''; if (a.reservedFor && !staff.has(a.reservedFor)) a.reservedFor = ''; });
      DB.lines.forEach(l => { if (l.holderId && !staff.has(l.holderId)) Object.assign(l, { holderId: '', status: l.status === 'assigned' ? 'stock' : l.status }); });
      DB.settings.companyName = (global.BRAND || {}).company || DB.settings.companyName;
      DB.itInit = DB.it2Init = DB.it3Init = true; // مفيش أي تعبئة تجريبية تاني
      DB.tpRealV1 = new Date().toISOString(); ch = true;
    }
    if (ch) global.Store.save();
    return ch;
  }
  global.TPClean = { apply };
})(window);
