/* =========================================================
   tp-data.js — أكواد Three Pillars (siwar / sakkbah)
   • الأجهزة: الشركة-النوع-الرقم  (siwar-CMP-001 · sakkbah-CMP-006 · siwar-LTP-001 · siwar-Mobile-001)
     الترقيم لكل نوع على مستوى المجموعة كلها (CMP-006 لسكبة وCMP-007 لسوار)
   • الأرقام السعودي: Siw-KSA-001 … · الإيميلات: Siw-EML-001 …
   بيتطبق مرة واحدة على البيانات (flag: tpCodesV1) — من غير ما يكسر الروابط (العهد، الإقرارات، الإخلاء…)
   ========================================================= */
(function (global) {
  'use strict';
  // قايمة الأجهزة الفعلية (الكود · النوع · الشركة)
  const DEVICES = `siwar-CMP-001 CMP siwar
siwar-CMP-002 CMP siwar
siwar-CMP-003 CMP siwar
siwar-CMP-004 CMP siwar
siwar-CMP-005 CMP siwar
sakkbah-CMP-006 CMP sakkbah
siwar-CMP-007 CMP siwar
sakkbah-CMP-008 CMP sakkbah
sakkbah-CMP-009 CMP sakkbah
siwar-CMP-010 CMP siwar
siwar-LTP-001 LTP siwar
siwar-LTP-002 LTP siwar
siwar-LTP-003 LTP siwar
siwar-CMP-011 CMP siwar
siwar-CMP-012 CMP siwar
siwar-LTP-004 LTP siwar
siwar-LTP-005 LTP siwar
sakkbah-CMP-013 CMP sakkbah
siwar-LTP-006 LTP siwar
siwar-LTP-007 LTP siwar
siwar-Mobile-001 Mobile siwar
siwar-Mobile-002 Mobile siwar
siwar-Mobile-003 Mobile siwar
siwar-Mobile-004 Mobile siwar
siwar-Mobile-005 Mobile siwar
siwar-LTP-008 LTP siwar
siwar-LTP-009 LTP siwar
siwar-CMP-014 CMP siwar
siwar-CMP-015 CMP siwar
siwar-CMP-016 CMP siwar`.split('\n').map(l => l.trim().split(/\s+/)).map(([code, t, co]) => ({ code, t, co }));
  const SA_LINES = ['Siw-KSA-001', 'Siw-KSA-002', 'Siw-KSA-003', 'Siw-KSA-004', 'Siw-KSA-005', 'Siw-KSA-006', 'Siw-KSA-007'];
  const T2TYPE = { CMP: 'desktop', LTP: 'laptop', Mobile: 'mobile' };
  const PCS = [['Dell', 'OptiPlex 7010', 'i7 · 16GB · 512GB SSD'], ['HP', 'ProDesk 400 G9', 'i5 · 16GB · 512GB SSD'], ['Lenovo', 'ThinkCentre M70q', 'i5 · 16GB · 256GB SSD'], ['Dell', 'OptiPlex 3000', 'i5 · 8GB · 256GB SSD']];

  global.TPData = {
    DEVICES, SA_LINES,
    apply(db) {
      if (db.tpCodesV1) return false;
      const U = global.U, X = global.ITX, B = global.BRAND, t = U.today();
      const coName = c => (B.companies.find(x => x.code === c) || {}).name || c;
      // الشركات: سوار + سكبة
      db.itSettings.companies = B.companies.map(c => ({ name: c.name, code: c.code, branches: c.branches.slice() }));
      const old = db.settings.companyName;
      ['team', 'assets', 'lines', 'requisitions', 'tools', 'netPackages', 'candidates'].forEach(k => (db[k] || []).forEach(x => { if (!x.company || x.company === old || x.company === 'SEG' || x.company === 'Three Pillars') x.company = coName('siwar'); }));
      const map = {}; // الكود القديم ← الجديد
      const used = new Set();
      const live = db.assets.filter(a => !['retired', 'lost'].includes(a.status));
      const busy = a => (['assigned', 'reserved', 'wipe', 'repair'].includes(a.status) ? 2 : 0) + (a.holderId ? 1 : 0);
      const pick = type => live.filter(a => a.type === type && !used.has(a.id)).sort((a, b) => busy(b) - busy(a))[0];
      const freeStaff = () => (db.team || []).filter(m => m.status === 'active' && !db.assets.some(a => a.holderId === m.id && ['desktop', 'laptop'].includes(a.type) && a.status === 'assigned'));
      let pc = 0;
      DEVICES.forEach(d => {
        const type = T2TYPE[d.t];
        let a = pick(type);
        if (!a && type === 'desktop') { // كمبيوترات مكتبية: الديمو مفيهوش كفاية — تتعمل
          const p = PCS[pc++ % PCS.length], m = freeStaff()[0];
          a = { id: U.uid(), type, brand: p[0], model: p[1], specs: p[2], serial: (p[0].slice(0, 2) + 'PC' + String(1000 + pc * 37)).toUpperCase(), cost: 3200, currency: 'SAR', purchaseDate: U.addDays(t, -(120 + pc * 45)), warrantyEnd: U.addDays(t, 600 - pc * 40), location: 'الرياض', branch: B.companies[0].branches[0], condition: 'جيد', status: m ? 'assigned' : (pc % 3 ? 'ready' : 'stock'), holderId: m ? m.id : '', assignedAt: m ? U.addDays(t, -90) : '', mdm: false, av: pc % 6 !== 2, patched: pc % 4 !== 1, createdAt: new Date().toISOString() };
          db.assets.push(a); live.push(a);
          db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'create', date: a.purchaseDate, note: p[0] + ' ' + p[1] });
          if (m) db.assetLog.push({ id: U.uid(), assetId: a.id, kind: 'assign', date: a.assignedAt, holderId: m.id, condition: 'جيد' });
        }
        if (!a) return;
        used.add(a.id); if (a.tag) map[a.tag] = d.code;
        a.oldTag = a.oldTag || a.tag; a.tag = d.code; a.company = coName(d.co);
        if (d.co === 'sakkbah' && a.holderId) { const m = db.team.find(x => x.id === a.holderId); if (m) m.company = coName('sakkbah'); }
      });
      // العدادات تكمل بعد آخر رقم في القايمة
      ['CMP', 'LTP', 'Mobile'].forEach(tc => { db.seq['c_T_' + tc] = Math.max(0, ...DEVICES.filter(d => d.t === tc).map(d => +d.code.split('-').pop())); });
      // باقي الأجهزة (شاشات، كاميرات، إكسسوارات… واللابتوبات الزيادة) بنفس الشكل
      db.assets.filter(a => !used.has(a.id)).forEach(a => { const n = X.assetCode(a.type, a.company || coName('siwar')); if (a.tag) map[a.tag] = n; a.oldTag = a.oldTag || a.tag; a.tag = n; });
      // الأرقام السعودي: Siw-KSA-001 … 007 (لو الديمو أقل تتكمل بخطوط في المخزن)
      const sa = db.lines.filter(l => l.country === 'SA').sort((a, b) => (busy(b) - busy(a)) || String(a.code).localeCompare(String(b.code)));
      while (sa.length < SA_LINES.length) { const l = { id: U.uid(), country: 'SA', number: '+9665512341' + String(10 + sa.length), carrier: 'STC', kind: 'voice', plan: 'باقة أعمال 50 جيجا', cost: 150, currency: 'SAR', cycle: 'monthly', owner: 'الشركة', status: 'stock', holderId: '', purpose: 'احتياطي', renewDate: U.addDays(t, 30 + sa.length * 3), company: coName('siwar') }; db.lines.push(l); sa.push(l); }
      sa.forEach((l, i) => { const n = i < SA_LINES.length ? SA_LINES[i] : null; if (!n) return; if (l.code) map[l.code] = n; l.code = n; });
      db.seq.c_L_SA = SA_LINES.length;
      db.seq.c_L_EG = 0;
      db.lines.filter(l => l.country === 'EG').forEach(l => { const n = X.lineCode('EG'); if (l.code) map[l.code] = n; l.code = n; });
      // الإيميلات: كود لكل إيميل
      db.seq.c_MAIL = 0;
      db.mailboxes.forEach(b => { b.code = X.mailCode(); });
      // تحديث الأكواد القديمة جوه المستندات والسيكلات والسجل والتنبيهات (من غير ما تتكسر الروابط)
      const pairs = Object.entries(map).filter(([o, n]) => o && o !== n).sort((a, b) => b[0].length - a[0].length);
      ['itDocs', 'cycles', 'itLog', 'assetLog', 'alertsSent', 'syncErrors'].forEach(k => {
        let s = JSON.stringify(db[k] || []); pairs.forEach(([o, n]) => { s = s.split(o).join(n); }); db[k] = JSON.parse(s);
      });
      db.alertsSent = []; // التنبيهات تتبعت تاني بالأكواد الجديدة
      db.tpCodesV1 = true;
      return true;
    },
  };
})(window);
