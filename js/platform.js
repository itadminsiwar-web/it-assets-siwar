/* =========================================================
   platform.js — المحرك المشترك لكل الأنظمة (على فكرة Zoho CRM)
   • الأحداث: أي حفظ عبر Core.upsert يطلق حدث (إضافة / تعديل) لمحرك الأتمتة
   • الأتمتة (Workflows): "لما يحصل كذا ← اعمل كذا" + فحص دوري للحالات الزمنية
   • الماكرو: مجموعة إجراءات تتنفذ بضغطة على سجل
   • الإشعارات الفورية: جرس في كل نظام + تحديث لحظي بين التبويبات المفتوحة
   • سجل التواصل متعدد القنوات (مكالمة، واتساب، إيميل، سوشيال، شات، اجتماع)
   • الذكاء: تقييم فرص العملاء المحتملين مع الأسباب، تحليل نبرة الرسائل، أسئلة عن البيانات
   • التكاملات: Google Calendar / واتساب / إيميل بروابط مباشرة، وWebhooks لـ Zapier وMake وn8n
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, C = global.Core;
  const today = () => U.today();
  const nowISO = () => new Date().toISOString();
  const coll = k => (global.DB[k] = global.DB[k] || []);

  // ================= القنوات =================
  const CHANNELS = { phone: ['مكالمة', '📞'], whatsapp: ['واتساب', '🟢'], email: ['إيميل', '✉️'], social: ['سوشيال ميديا', '💬'], chat: ['شات الموقع', '🗨️'], meeting: ['اجتماع', '🤝'] };
  const STAGE_AR = { new: 'جديد', contacted: 'تم التواصل', meeting: 'اجتماع / عرض', proposal: 'عرض سعر', won: 'تم التعاقد', lost: 'خسارة' };

  // ================= تحليل النبرة (عربي + إنجليزي) =================
  const LEX = {
    neg: ['مش راضي', 'غير راضي', 'مو راضي', 'زعلان', 'زعلانين', 'سيء', 'سيئ', 'وحش', 'متأخر', 'تأخير', 'تأخرتوا', 'مشكلة', 'شكوى', 'ألغي', 'الغي', 'إلغاء', 'استرجاع', 'مستاء', 'للأسف', 'ما حد رد', 'محدش رد', 'بطيء', 'غلط', 'خطأ', 'مافيه نتيجة', 'مفيش نتيجة', 'ضعيف', 'disappointed', 'bad', 'late', 'cancel', 'refund', 'problem', 'issue', 'angry', 'worst', 'unhappy'],
    urg: ['عاجل', 'ضروري', 'فوراً', 'فورا', 'حالاً', 'حالا', 'بسرعة', 'النهارده', 'اليوم', 'الآن', 'urgent', 'asap', 'immediately', 'now'],
    pos: ['شكراً', 'شكرا', 'ممتاز', 'رائع', 'حلو', 'جميل', 'مبدع', 'تمام', 'عجبني', 'عجبتني', 'يعطيكم العافية', 'الله يعطيكم', 'great', 'thanks', 'thank you', 'perfect', 'love', 'excellent', 'amazing', '👍', '❤️', '🔥'],
  };
  function sentiment(text) {
    const t = ' ' + String(text || '').toLowerCase() + ' ';
    const hit = arr => arr.filter(w => t.includes(w.toLowerCase())).length;
    const n = hit(LEX.neg), p = hit(LEX.pos), u = hit(LEX.urg);
    const mood = n > p ? 'negative' : p > n ? 'positive' : 'neutral';
    return { mood, urgent: u > 0, score: (n * 2 + u * 2) - p }; // الأعلى = الأولوية
  }
  const MOOD = { negative: ['غير راضٍ', 'bad', '😟'], neutral: ['محايد', 'muted', '😐'], positive: ['راضٍ', 'good', '😊'] };

  // ================= الإشعارات =================
  // to: معرف مستخدم، أو صلاحية (admin/accountant/marketing/it)
  function notify(n) {
    const x = Object.assign({ id: U.uid(), at: nowISO(), read: [], to: ['admin'] }, n);
    if (!Array.isArray(x.to)) x.to = [x.to];
    coll('notifications').unshift(x); if (DB.notifications.length > 300) DB.notifications.length = 300;
    return x;
  }
  const mineFor = u => (DB.notifications || []).filter(n => n.to.includes(u.id) || n.to.includes(u.role || 'accountant'));

  // ================= سجل التواصل =================
  function logActivity(a) {
    const x = Object.assign({ id: U.uid(), at: nowISO(), direction: 'out', status: 'done', channel: 'phone' }, a);
    if (x.direction === 'in') { const s = sentiment((x.subject || '') + ' ' + (x.body || '')); x.mood = s.mood; x.urgent = s.urgent; x.prio = s.score; x.handled = !!x.handled; }
    C.upsert('activities', x, 'تواصل'); return x;
  }
  const refName = (t, id) => { const r = t === 'lead' ? (DB.leads || []).find(x => x.id === id) : (DB.customers || []).find(x => x.id === id); return r ? (r.name + (r.company ? ' — ' + r.company : '')) : ''; };
  const refPhone = (t, id) => { const r = t === 'lead' ? (DB.leads || []).find(x => x.id === id) : (DB.customers || []).find(x => x.id === id); return (r && r.phone) || ''; };
  const refEmail = (t, id) => { const r = t === 'lead' ? (DB.leads || []).find(x => x.id === id) : (DB.customers || []).find(x => x.id === id); return (r && r.email) || ''; };
  const timeline = (t, id) => (DB.activities || []).filter(a => a.refType === t && a.refId === id).sort((a, b) => b.at.localeCompare(a.at));

  // ================= التكاملات (روابط مباشرة — تعمل بدون سيرفر) =================
  const digits = p => String(p || '').replace(/[^\d]/g, '');
  const LINKS = {
    whatsapp: (phone, text) => 'https://wa.me/' + digits(phone) + (text ? '?text=' + encodeURIComponent(text) : ''),
    email: (to, subject, body) => 'mailto:' + encodeURIComponent(to || '') + '?subject=' + encodeURIComponent(subject || '') + '&body=' + encodeURIComponent(body || ''),
    phone: phone => 'tel:' + String(phone || '').replace(/\s/g, ''),
    gcal: (title, date, details) => { const d = String(date || today()).replace(/-/g, ''); const d2 = U.addDays(date || today(), 1).replace(/-/g, ''); return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + d + '/' + d2 + '&details=' + encodeURIComponent(details || ''); },
  };
  // Webhook لـ Zapier / Make / n8n — يرسل الحدث كـ JSON (إرسال بلا انتظار رد)
  function webhook(event, payload) {
    const cfg = (DB.integrations || {}).webhook; if (!cfg || !cfg.url || !cfg.enabled) return false;
    if (cfg.events && cfg.events.length && !cfg.events.includes(event)) return false;
    try { fetch(cfg.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ event, at: nowISO(), company: DB.settings.companyName, data: payload }) }).catch(() => {}); } catch (e) { return false; }
    (DB.integrations.webhook.sent = (DB.integrations.webhook.sent || 0) + 1); return true;
  }

  // ================= الذكاء: تقييم فرص العملاء المحتملين =================
  const STAGE_F = { new: 0.45, contacted: 0.62, meeting: 0.85, proposal: 1.05 };
  function leadScore(l) {
    if (!l) return null;
    if (l.stage === 'won') return { score: 100, reasons: ['تم التعاقد'] };
    if (l.stage === 'lost') return { score: 0, reasons: ['خسارة'] };
    const leads = DB.leads || [], closed = leads.filter(x => ['won', 'lost'].includes(x.stage));
    const key = x => x.campaignId ? 'c:' + x.campaignId : 's:' + (x.source || '');
    const same = closed.filter(x => key(x) === key(l)), sw = same.filter(x => x.stage === 'won').length;
    const gw = closed.filter(x => x.stage === 'won').length;
    const rate = (sw + 2 * ((gw + 1) / (closed.length + 2))) / (same.length + 2); // نسبة نجاح المصدر مع تنعيم نحو المتوسط العام
    const reasons = [];
    const srcName = l.campaignId ? (((DB.campaigns || []).find(c => c.id === l.campaignId) || {}).name || 'الحملة') : (l.source || 'المصدر');
    if (same.length >= 2) reasons.push(`${srcName}: ${sw} تعاقد من ${same.length} مغلقة (${Math.round(sw / same.length * 100)}%)`);
    let p = rate * (STAGE_F[l.stage] || 0.6);
    reasons.push('المرحلة: ' + (STAGE_AR[l.stage] || l.stage));
    const acts = timeline('lead', l.id), last = acts[0] ? acts[0].at.slice(0, 10) : l.date;
    const recent = acts.filter(a => a.at.slice(0, 10) >= U.addDays(today(), -14)).length;
    if (recent) { p *= 1 + Math.min(3, recent) * 0.04; reasons.push(`${recent} تواصل آخر أسبوعين ↑`); }
    const idle = last ? U.daysBetween(last, today()) : 0;
    if (idle > 10) { p *= 0.65; reasons.push(`بدون تواصل منذ ${idle} يوم ↓`); } else if (idle > 5) { p *= 0.82; reasons.push(`آخر تواصل منذ ${idle} أيام ↓`); }
    if (l.nextDate && l.nextDate < today()) { p *= 0.9; reasons.push('متابعة فات موعدها ↓'); }
    if (acts.some(a => a.direction === 'in' && a.mood === 'positive')) { p *= 1.12; reasons.push('ردود إيجابية من العميل ↑'); }
    if (acts.some(a => a.direction === 'in' && a.mood === 'negative')) { p *= 0.8; reasons.push('رد سلبي من العميل ↓'); }
    return { score: Math.max(3, Math.min(92, Math.round(p * 100))), reasons, idle };
  }
  const scoreBadge = l => { const s = leadScore(l); if (!s || ['won', 'lost'].includes(l.stage)) return ''; const c = s.score >= 60 ? 'good' : s.score >= 35 ? 'warn' : 'muted'; return `<span class="badge b-${c} ai-score" title="${U.esc('تقييم المساعد الذكي: ' + s.reasons.join(' · '))}">${s.score >= 60 ? '🔥' : '✨'} ${s.score}%</span>`; };

  // ================= الأتمتة =================
  const TRIG = {
    lead_created: { label: 'عميل محتمل جديد', coll: 'leads', test: (b, a) => !b },
    lead_stage: { label: 'تغيّرت مرحلة عميل محتمل', coll: 'leads', params: ['stage'], test: (b, a, p) => b && b.stage !== a.stage && (!p.stage || a.stage === p.stage) },
    invoice_created: { label: 'فاتورة مبيعات جديدة', coll: 'invoices', test: (b, a) => (!b || b.status === 'draft') && a.status !== 'draft' && a.status !== 'void' },
    content_changes: { label: 'العميل طلب تعديل منشور', coll: 'content', test: (b, a) => a.clientAction === 'changes' && (!b || b.clientAction !== 'changes' || b.clientNote !== a.clientNote) },
    content_approved: { label: 'العميل وافق على منشور', coll: 'content', test: (b, a) => a.clientAction === 'approved' && (!b || b.clientAction !== 'approved') },
    incoming_msg: { label: 'رسالة واردة من عميل', coll: 'activities', test: (b, a) => !b && a.direction === 'in' },
    customer_created: { label: 'عميل جديد', coll: 'customers', test: (b, a) => !b },
    lead_idle: { label: 'عميل محتمل بدون تواصل', scan: true, params: ['days'] },
    invoice_overdue: { label: 'فاتورة متأخرة السداد', scan: true, params: ['days'] },
    sub_renewal: { label: 'اشتراك قرب موعد تجديده', scan: true, params: ['days'] },
    task_overdue: { label: 'مهمة فات موعدها', scan: true },
  };
  const COND_FIELDS = {
    lead_created: [['source', 'المصدر'], ['value', 'القيمة'], ['forCustomerId', 'لصالح عميل (معرف)'], ['city', 'المدينة']],
    lead_stage: [['source', 'المصدر'], ['value', 'القيمة']], lead_idle: [['stage', 'المرحلة'], ['value', 'القيمة']],
    invoice_created: [['total', 'الإجمالي']], invoice_overdue: [['outstanding', 'المتبقي']],
    incoming_msg: [['mood', 'النبرة (negative/positive/neutral)'], ['urgent', 'عاجل (true/false)'], ['channel', 'القناة']],
    content_changes: [['platform', 'المنصة']], content_approved: [['platform', 'المنصة']], customer_created: [['city', 'المدينة']],
    sub_renewal: [['category', 'الفئة']], task_overdue: [['priority', 'الأولوية']],
  };
  const ACTIONS = { task: 'إنشاء مهمة', notify: 'إرسال إشعار', message: 'تجهيز رسالة للعميل', set: 'تعديل حقل', note: 'إضافة ملاحظة', webhook: 'إرسال لـ Zapier / Make' };

  // سياق كل حدث (للقوالب والشروط)
  function ctxOf(collName, x) {
    const L = global.Ledger, cust = id => (DB.customers || []).find(c => c.id === id) || {}, team = id => (DB.team || []).find(m => m.id === id) || {};
    if (collName === 'leads') return { refType: 'lead', refId: x.id, name: x.name, company: x.company || '', value: U.money(x.value || 0), stage: STAGE_AR[x.stage] || x.stage, owner: team(x.ownerId).name || '', ownerId: x.ownerId, phone: x.phone, email: x.email, customerId: x.forCustomerId || '', link: 'marketing.html#/leads', raw: x };
    if (collName === 'invoices') { const i = L ? L.invoiceInfo(x) : {}; const c = cust(x.customerId); return { refType: 'customer', refId: x.customerId, no: x.no, customer: c.name || '', name: c.name || '', amount: U.money(i.total || 0), outstanding: U.money(i.outstanding || 0), due: x.dueDate || '', phone: c.phone, email: c.email, customerId: x.customerId, link: 'index.html#/invoice/' + x.id, raw: Object.assign({}, x, { total: i.total, outstanding: i.outstanding }) }; }
    if (collName === 'content') { const c = cust(x.customerId); const m = (DB.team || []).find(t => t.name === x.assignee) || {}; return { refType: 'customer', refId: x.customerId, title: x.title, customer: c.name || '', name: c.name || '', note: x.clientNote || '', owner: x.assignee || '', ownerId: m.id || '', customerId: x.customerId, link: 'marketing.html#/content', raw: x }; }
    if (collName === 'activities') return { refType: x.refType, refId: x.refId, name: refName(x.refType, x.refId), subject: x.subject || '', body: x.body || '', channel: (CHANNELS[x.channel] || [''])[0], customerId: x.refType === 'customer' ? x.refId : '', link: 'marketing.html#/inbox', raw: x };
    if (collName === 'customers') return { refType: 'customer', refId: x.id, name: x.name, customer: x.name, phone: x.phone, email: x.email, customerId: x.id, link: 'marketing.html#/client/' + x.id, raw: x };
    if (collName === 'subscriptions') return { refType: '', refId: x.id, name: x.name, date: x.renewalDate, amount: x.cost + ' ' + (x.currency || ''), ownerId: '', link: 'it.html#/sub/' + x.id, raw: x };
    if (collName === 'tasks') return { refType: x.customerId ? 'customer' : '', refId: x.customerId, title: x.title, owner: team(x.assigneeId).name || '', ownerId: x.assigneeId, due: x.dueDate, customerId: x.customerId, link: 'marketing.html#/tasks', raw: x };
    return { raw: x };
  }
  const fill = (tpl, ctx) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => ctx[k] != null ? ctx[k] : m);
  function condOk(c, ctx) {
    if (!c || !c.field) return true;
    const v = ctx.raw[c.field], w = c.value;
    switch (c.op) {
      case 'neq': return String(v) !== String(w);
      case 'gt': return U.num(v) > U.num(w);
      case 'lt': return U.num(v) < U.num(w);
      case 'contains': return String(v || '').includes(w);
      default: return String(v) === String(w);
    }
  }
  let running = false; // الإجراءات لا تطلق قواعد جديدة (منع الحلقات)
  function runRule(rule, collName, ctx) {
    let n = 0;
    running = true;
    try {
      (rule.actions || []).forEach(a => {
        if (a.type === 'task') {
          const who = a.assignee === 'owner' ? ctx.ownerId : a.assignee;
          C.upsert('tasks', { id: U.uid(), title: fill(a.text, ctx), assigneeId: who || '', customerId: ctx.customerId || '', dueDate: U.addDays(today(), U.num(a.days) || 0), status: 'todo', priority: a.priority || 'normal', notes: '⚡ أُنشئت تلقائياً: ' + rule.name, auto: rule.id }, 'مهمة تلقائية'); n++;
        }
        if (a.type === 'notify') { notify({ to: a.to === 'owner' ? [ctx.ownerUserId || 'marketing'] : [a.to || 'admin'], title: fill(a.text, ctx), link: ctx.link, rule: rule.id, icon: '⚡' }); n++; }
        if (a.type === 'message' && ctx.refType && ctx.refId) { logActivity({ refType: ctx.refType, refId: ctx.refId, channel: a.channel || 'whatsapp', direction: 'out', status: 'queued', subject: fill(a.subject || '', ctx), body: fill(a.text, ctx), by: '⚡ ' + rule.name, auto: rule.id }); webhook('message.queued', { channel: a.channel, to: ctx.phone || ctx.email, text: fill(a.text, ctx) }); n++; }
        if (a.type === 'set' && ctx.raw && ctx.raw.id && a.field) {
          const rec = (DB[collName] || []).find(r => r.id === ctx.raw.id); if (rec) { rec[a.field] = /^\+\d+$/.test(a.value) ? U.addDays(today(), +a.value.slice(1)) : a.value; C.upsert(collName, rec, 'تعديل تلقائي'); snap(collName, rec); n++; }
        }
        if (a.type === 'note' && ctx.raw && ctx.raw.id) { const rec = (DB[collName] || []).find(r => r.id === ctx.raw.id); if (rec) { rec.notes = ((rec.notes || '') + '\n⚡ ' + fill(a.text, ctx)).trim(); C.upsert(collName, rec, 'ملاحظة تلقائية'); snap(collName, rec); n++; } }
        if (a.type === 'webhook') { if (webhook(a.event || collName + '.' + rule.trigger, Object.assign({ rule: rule.name }, ctx.raw))) n++; }
      });
    } finally { running = false; }
    rule.runs = (rule.runs || 0) + 1; rule.lastRun = nowISO();
    coll('autoLog').unshift({ id: U.uid(), at: nowISO(), ruleId: rule.id, rule: rule.name, ref: ctx.name || ctx.title || ctx.no || '', actions: n });
    if (DB.autoLog.length > 300) DB.autoLog.length = 300;
    global.Store.save();
    return n;
  }

  // لقطات السجلات لمعرفة "قبل" التعديل (حتى لو الكود عدّل الكائن قبل الحفظ)
  const SNAP = {};
  const snap = (k, x) => { (SNAP[k] = SNAP[k] || {})[x.id] = JSON.stringify(x); };
  function snapAll() { Object.keys(SNAP).forEach(k => delete SNAP[k]); ['leads', 'invoices', 'content', 'activities', 'customers'].forEach(k => (DB[k] || []).forEach(x => snap(k, x))); }
  function emit(collName, after) {
    const prev = SNAP[collName] && SNAP[collName][after.id]; const before = prev ? JSON.parse(prev) : null;
    snap(collName, after);
    if (running) return;
    (DB.rules || []).filter(r => r.active && TRIG[r.trigger] && !TRIG[r.trigger].scan && TRIG[r.trigger].coll === collName).forEach(r => {
      const ctx = ctxOf(collName, after);
      if (TRIG[r.trigger].test(before, after, r.params || {}) && condOk(r.cond, ctx)) runRule(r, collName, ctx);
    });
    if (collName === 'activities' && !before && after.direction === 'in') {
      webhook('message.incoming', after);
    }
    if (!before) webhook(collName + '.created', after);
  }
  // فحص دوري للحالات الزمنية (مرة لكل سجل لكل قاعدة)
  function scan() {
    if (!global.DB) return 0; let total = 0; const t = today(); DB.autoRuns = DB.autoRuns || {};
    const once = (r, key, collName, x) => { const k = r.id + ':' + key; if (DB.autoRuns[k]) return; const ctx = ctxOf(collName, x); if (!condOk(r.cond, ctx)) return; DB.autoRuns[k] = t; runRule(r, collName, ctx); total++; };
    (DB.rules || []).filter(r => r.active && TRIG[r.trigger] && TRIG[r.trigger].scan).forEach(r => {
      const days = U.num((r.params || {}).days);
      if (r.trigger === 'lead_idle') (DB.leads || []).filter(l => !['won', 'lost'].includes(l.stage)).forEach(l => { const s = leadScore(l); const last = (timeline('lead', l.id)[0] || {}).at; const lt = last ? last.slice(0, 10) : l.date; if (lt && U.daysBetween(lt, t) >= (days || 5)) once(r, l.id + ':' + lt, 'leads', l); });
      if (r.trigger === 'invoice_overdue' && global.Ledger) (DB.invoices || []).forEach(i => { const inf = global.Ledger.invoiceInfo(i); if (inf.status === 'overdue' && i.dueDate && U.daysBetween(i.dueDate, t) >= days) once(r, i.id, 'invoices', i); });
      if (r.trigger === 'sub_renewal') (DB.subscriptions || []).filter(s => ['active', 'trial'].includes(s.status) && s.renewalDate).forEach(s => { if (s.renewalDate >= t && U.daysBetween(t, s.renewalDate) <= (days || 3)) once(r, s.id + ':' + s.renewalDate, 'subscriptions', s); });
      if (r.trigger === 'task_overdue') (DB.tasks || []).filter(x => x.status !== 'done' && x.dueDate && x.dueDate < t).forEach(x => once(r, x.id + ':' + x.dueDate, 'tasks', x));
    });
    if (total) global.Store.save();
    return total;
  }

  // الماكرو: إجراءات على سجل بضغطة
  function runMacro(m, collName, rec) {
    const ctx = ctxOf(collName, rec); const r = { id: m.id, name: '🧩 ' + m.name, actions: m.actions || [] };
    const n = runRule(r, collName, ctx); global.Store.save(); return n;
  }

  // ربط المحرك بالحفظ
  if (C && !C.__platformHooked) {
    const orig = C.upsert;
    C.upsert = function (k, obj, label) { const res = orig.apply(this, arguments); try { if (['leads', 'invoices', 'content', 'activities', 'customers'].includes(k)) emit(k, obj); } catch (e) { console.error('automation', e); } return res; };
    C.__platformHooked = true;
  }

  // ================= الجرس والتحديث اللحظي =================
  let me = null;
  function mountBell(user) {
    me = user; const bar = document.querySelector('.topbar'); if (!bar || document.getElementById('bellBox')) return;
    const box = document.createElement('div'); box.id = 'bellBox'; box.className = 'bell-box';
    box.innerHTML = '<button class="icon-btn bell" id="bellBtn" aria-label="الإشعارات" title="الإشعارات">🔔<i class="bell-n" hidden></i></button><div class="bell-panel" hidden></div>';
    const ub = bar.querySelector('.user-box'); bar.insertBefore(box, ub || null);
    box.querySelector('#bellBtn').onclick = e => { e.stopPropagation(); const p = box.querySelector('.bell-panel'); p.hidden = !p.hidden; if (!p.hidden) drawBell(); };
    document.addEventListener('click', e => { if (!e.target.closest('#bellBox')) box.querySelector('.bell-panel').hidden = true; });
    box.addEventListener('click', e => {
      if (e.target.closest('[data-readall]')) { mineFor(me).forEach(n => { if (!n.read.includes(me.id)) n.read.push(me.id); }); global.Store.save(); drawBell(); }
      const a = e.target.closest('[data-nid]'); if (a) { const n = DB.notifications.find(x => x.id === a.dataset.nid); if (n && !n.read.includes(me.id)) { n.read.push(me.id); global.Store.save(); } }
    });
    updateBell();
  }
  const ago = iso => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'الآن' : m < 60 ? 'منذ ' + m + ' دقيقة' : m < 1440 ? 'منذ ' + Math.round(m / 60) + ' ساعة' : 'منذ ' + Math.round(m / 1440) + ' يوم'; };
  const linkFor = n => { if (!n.link) return '#'; const [page, hash] = n.link.split('#'); const here = location.pathname.split('/').pop() || 'index.html'; return (page && page !== here ? page : '') + (hash ? '#' + hash : ''); };
  function drawBell() {
    const p = document.querySelector('#bellBox .bell-panel'); if (!p || !me) return;
    const list = mineFor(me).slice(0, 25);
    p.innerHTML = `<header><b>الإشعارات</b>${list.some(n => !n.read.includes(me.id)) ? '<button class="link" data-readall>تعليم الكل كمقروء</button>' : ''}</header>
      ${list.length ? list.map(n => `<a class="bell-item ${n.read.includes(me.id) ? '' : 'unread'}" data-nid="${n.id}" href="${linkFor(n)}"><span>${n.icon || '🔔'}</span><div><b>${U.esc(n.title)}</b>${n.body ? `<small>${U.esc(n.body)}</small>` : ''}<small class="muted">${ago(n.at)}</small></div></a>`).join('') : '<div class="empty">لا توجد إشعارات</div>'}`;
    updateBell();
  }
  function updateBell() { const b = document.querySelector('#bellBox .bell-n'); if (!b || !me) return; const n = mineFor(me).filter(x => !x.read.includes(me.id)).length; b.textContent = n > 9 ? '9+' : n; b.hidden = !n; }
  // تحديث لحظي: أي تغيير من تبويب أو نظام تاني مفتوح يظهر فوراً (على السيرفر يُستبدل بـ onSnapshot)
  let lastIds = null;
  window.addEventListener('storage', e => {
    if (e.key !== C.STORAGE_KEY || !me) return;
    const before = new Set((DB.notifications || []).map(n => n.id));
    global.Store.load(); snapAll();
    const fresh = mineFor(me).filter(n => !before.has(n.id) && !n.read.includes(me.id));
    fresh.slice(0, 3).forEach(n => global.UI && global.UI.toast((n.icon || '🔔') + ' ' + n.title));
    updateBell();
    if (!document.querySelector('.modal-wrap') && global.Router) global.Router.render();
  });

  // opts.scan=false: بدون فحص دوري (منصة العملاء — الأحداث بس تشتغل لما العميل يوافق أو يطلب تعديل)
  function init(user, opts) {
    opts = opts || {};
    ['rules', 'macros', 'activities', 'notifications', 'autoLog'].forEach(coll);
    DB.integrations = DB.integrations || {}; DB.autoRuns = DB.autoRuns || {};
    snapAll(); if (opts.bell !== false) mountBell(user);
    if (global.SEGBot && opts.bot !== false) global.SEGBot.mount(user, opts.botAudience); // 🤖 مساعد SEG
    if (opts.scan === false) return;
    const n = scan(); if (n && global.UI) setTimeout(() => global.UI.toast('⚡ نفّذت الأتمتة ' + n + ' قاعدة'), 600);
    updateBell();
    clearInterval(init._t); init._t = setInterval(() => { if (scan()) updateBell(); }, 10 * 60 * 1000);
  }

  global.Platform = { CHANNELS, MOOD, STAGE_AR, TRIG, COND_FIELDS, ACTIONS, LINKS, sentiment, notify, mineFor, logActivity, timeline, refName, refPhone, refEmail, leadScore, scoreBadge, webhook, scan, runRule, runMacro, ctxOf, fill, init, updateBell, drawBell, snapAll };
})(window);
