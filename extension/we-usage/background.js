// الإضافة: بتستقبل طلب "حدّث" من صفحة النظام ← تفتح تاب WE لكل خط ورا بعض ← ترجّع النتيجة للصفحة (وتبعتها لشيت WE)
importScripts('config.js');
const D = self.TPWE_DEFAULTS;
const S = chrome.storage.session;
const getCfg = async () => { const s = await chrome.storage.local.get(['sheetUrl', 'sheetSecret', 'pw', 'lines']);
  const lines = s.lines && s.lines.length ? s.lines : D.lines; // الخطوط (اليوزرز) من نافذة الإضافة، وإلا اللي في config.js
  return Object.assign({ sheetUrl: D.sheetUrl, sheetSecret: D.sheetSecret }, s, { lines, pw: Object.assign({}, D.pw || {}, s.pw || {}) }); };
const tell = (tabId, msg) => chrome.tabs.sendMessage(tabId, msg).catch(() => {});

async function toSheet(job, r) {
  const c = await getCfg(); if (!c.sheetUrl || !c.sheetSecret) return;
  const t = new Date(), d = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  try {
    await fetch(c.sheetUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ secret: c.sheetSecret, rows: [{ code: job.code, name: 'WE ' + job.number, date: d, used: r.used, remaining: r.remaining, quota: r.quota, renewalDate: r.renewalDate, source: 'my.te.eg (الإضافة)' }] }) });
  } catch (e) { /* الشيت اختياري */ }
}

// تشغيل خط واحد: حساب WE واحد في المرة، فلو آخر دخول كان برقم تاني بنخرج منه الأول
async function startJob(item, replyTab, rest) {
  const c = await getCfg();
  // اليوزر: اللي في نافذة الإضافة له الأولوية (عشان التعديل يبقى من مكان واحد)، وإلا الرقم اللي جاي من النظام
  const number = String((c.lines.find(l => l.code === item.code) || {}).number || item.number || '').replace(/\D/g, '');
  if (!number) { tell(replyTab, { type: 'TP_WE_RESULT', code: item.code, result: { ok: false, error: 'مفيش رقم للخط ده' } }); return next(replyTab, rest); }
  // الخط مقفول مؤقتًا من WE (محاولات غلط كتير) ← منحاولش تاني لحد ما المدة تخلص (أي محاولة بتطوّل القفل)
  const { lockedUntil = {} } = await chrome.storage.local.get('lockedUntil');
  if (lockedUntil[number] && Date.now() < lockedUntil[number]) {
    const mins = Math.ceil((lockedUntil[number] - Date.now()) / 60000);
    tell(replyTab, { type: 'TP_WE_RESULT', code: item.code, number, result: { ok: false, error: 'WE قافلة الخط ده مؤقتًا (محاولات غلط كتير) — هنستنى ' + mins + ' دقيقة ومش هنحاول قبلها عشان القفل مايطولش' } });
    return next(replyTab, rest);
  }
  const { lastNumber } = await chrome.storage.local.get('lastNumber');
  // كل خط يبدأ نضيف زي Incognito: نمسح كل جلسات WE (كوكيز te.eg كلها مش my.te.eg بس) — جلسة الخط اللي قبله كانت بتخلي WE ترفض التاني
  await chrome.browsingData.remove({ origins: ['https://my.te.eg', 'https://te.eg', 'https://www.te.eg'] }, { cookies: true, localStorage: true, indexedDB: true, cacheStorage: true, serviceWorkers: true }).catch(() => {});
  try { for (const ck of await chrome.cookies.getAll({ domain: 'te.eg' })) await chrome.cookies.remove({ url: 'https://' + ck.domain.replace(/^\./, '') + ck.path, name: ck.name, storeId: ck.storeId }); } catch (e) { /* مفيش كوكيز */ }
  const ln = c.lines.find(l => l.code === item.code) || {};
  const job = { code: item.code, number, type: ln.type || 'Internet', password: (c.pw || {})[number] || '', replyTab, rest: rest || [], at: Date.now() };
  await S.set({ pending: job }); // التاب الجديد بياخده أول ما يفتح (قبل ما نعرف رقم التاب)
  const { weUrl } = await chrome.storage.local.get('weUrl'); // للاختبار بس (نسخة WE مزيفة)؛ العادي = موقع WE
  const tab = await chrome.tabs.create({ url: weUrl || 'https://my.te.eg/echannel/#/login', active: true, openerTabId: replyTab });
  await S.set({ ['job_' + tab.id]: job });
  tell(replyTab, { type: 'TP_WE_STATUS', code: item.code, text: 'فتحت موقع WE…' + (rest && rest.length ? ' (وبعده ' + rest.map(r => r.code).join('، ') + ')' : '') });
}
function next(replyTab, rest) {
  if (rest && rest.length) setTimeout(() => startJob(rest[0], replyTab, rest.slice(1)), 4000); // مهلة بين الخطوط عشان WE متطلبش كابتشا
  else tell(replyTab, { type: 'TP_WE_DONE' });
}

chrome.runtime.onMessage.addListener((m, sender, reply) => {
  (async () => {
    const tabId = sender.tab && sender.tab.id;
    if (m.type === 'refresh') {
      // كل الخطوط اللي في الإضافة (حتى اللي لسه مش في النظام — بيتضاف لما ترجع أرقامه)
      const c = await getCfg(), list = c.lines.length ? c.lines.map(l => ({ code: l.code, number: l.number })) : (m.lines && m.lines.length ? m.lines : [{ code: m.code, number: m.number }]);
      return startJob(list[0], tabId, list.slice(1));
    }
    if (m.type === 'getJob') {
      const k = 'job_' + tabId; let job = (await S.get(k))[k];
      if (!job) { const { pending } = await S.get('pending'); if (pending && Date.now() - pending.at < 60000) { job = pending; await S.set({ [k]: job }); } }
      if (job) await S.remove('pending');
      reply(job || null); return;
    }
    if (m.type === 'status' || m.type === 'result') {
      const k = 'job_' + tabId, job = (await S.get(k))[k]; if (!job) return;
      tell(job.replyTab, { type: m.type === 'result' ? 'TP_WE_RESULT' : 'TP_WE_STATUS', code: job.code, number: job.number, text: m.text, result: m.result });
      if (m.type === 'result') {
        await S.remove(k);
        if (m.result && m.result.ok) { await chrome.storage.local.set({ lastNumber: job.number }); toSheet(job, m.result); }
        if (m.result && !m.result.ok && /maximum number of incorrect attempts|try again after|قفلت الدخول|locked|9999/i.test(m.result.error || '')) {
          const { lockedUntil = {} } = await chrome.storage.local.get('lockedUntil'); lockedUntil[job.number] = Date.now() + 65 * 60000; await chrome.storage.local.set({ lockedUntil });
        }
        // نقفل تاب WE (لو فيه غلط بنسيبه شوية تشوف الرسالة) ونكمّل على الخط اللي بعده
        setTimeout(() => {
          chrome.tabs.remove(tabId).catch(() => {});
          if (!(job.rest && job.rest.length)) chrome.tabs.update(job.replyTab, { active: true }).catch(() => {});
          next(job.replyTab, job.rest);
        }, m.result && m.result.ok ? 2000 : 6000);
      }
    }
  })();
  return m.type === 'getJob'; // getJob بيرد async
});
