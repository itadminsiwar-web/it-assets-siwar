/**
 * Code.gs — مزامنة في الاتجاهين بين نظام Three Pillars · تكنولوجيا المعلومات و"شيت جرد" الأصلي
 *
 * ضمانات الأمان:
 *   1) قبل أول كتابة: نسخة كاملة من الشيت الأصلي على الدرايف ("نسخة احتياطية قبل الربط") — ولو النسخ فشل ← مفيش كتابة.
 *   2) النظام بيكتب في أعمدة محددة بس (ALLOWED) — مفيش حذف صفوف ولا أعمدة ولا تعديل في باقي الخانات.
 *   3) التعارض: النظام بيبعت القيمة اللي كان شايفها (base)؛ لو الخانة اتغيرت في الشيت بعدها ← مفيش كتابة ويرجع "تعارض".
 *   4) كل كتابة بتتسجل في شيت منفصل "TP IT - سجل مزامنة شيت الجرد" (مش في الشيت الأصلي).
 *   5) الشيت مش لازم يبقى عام: النظام بيقراه عن طريق الـ Web app بالـ SECRET.
 */
// SECRET موجود في Secret.js (مش بيترفع على GitHub)
const SHEET_ID = '1V_l_xHPs7XT25M2ZlWurzEsvSoEaUr6nZii57n1IFHk'; // شيت الجرد الأصلي
const TAB = 'شيت جرد';
const CODE_H = ['كود الاصل', 'كود الأصل', 'الكود', 'code'];
// الأعمدة اللي النظام مسموح له يكتب فيها (بأسمائها في الشيت)
const ALLOWED = ['الحاله', 'الحالة', 'اسم الموظف', 'الموظف', 'القسم', 'سريال الجهاز', 'سيريال الجهاز', 'السيريال', 'الشاشه', 'الشاشة', 'سريال الشاشه', 'سيريال الشاشة', 'الجهاز',
  'كيبورد', 'ماوس', 'سماعة', 'سماعه', 'كابلات', 'باده', 'باد', 'بادة', 'شاحن'];

const props = () => PropertiesService.getScriptProperties();
const norm = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().replace(/ى$/, 'ي').toLowerCase();

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.secret !== SECRET) return json_({ ok: false, error: 'secret' });
  try {
    const sh = sheet_();
    if (p.action === 'csv') {
      const v = sh.getDataRange().getDisplayValues();
      return text_(v.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n'));
    }
    if (p.action === 'mails') return text_(csv_(mails_(p.id)));
    if (p.action === 'lines') return text_(csv_(lines_(p.id)));
    if (p.action === 'read') { // قراءة بس لأي شيت على حسابك (للصفحات المربوطة لو الشيت مش عام) — أعمدة الباسوردات بتتشال
      const ss = SpreadsheetApp.openById(p.id), s2 = (p.tab && ss.getSheetByName(p.tab)) || ss.getSheets()[0], v = s2.getDataRange().getDisplayValues();
      const bad = (v[0] || []).map(h => /pass|pswd|pwd|باسورد|كلمة ?(السر|المرور)|كلمه/i.test(String(h)));
      return text_(v.map(r => r.filter((_, i) => !bad[i]).map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n'));
    }
    if (p.action === 'apps') { // ردود استمارة التقديم (QR)
      const fid = props().getProperty('FORM_SS'); if (!fid) return text_('');
      const v = SpreadsheetApp.openById(fid).getSheets()[0].getDataRange().getDisplayValues();
      return text_(v.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n'));
    }
    const info = ensureSafety_(); // اختبار الاتصال = تجهيز النسخة الاحتياطية وشيت السجل
    let form = ''; try { form = setupForm_().url; } catch (x) { form = ''; }
    return json_({ ok: true, service: 'TP IT · live sheet sync', sheet: sh.getParent().getName() + ' ← ' + sh.getName(), rows: Math.max(0, sh.getLastRow() - 1), backup: info.backupUrl, log: info.logUrl, formUrl: form, at: new Date().toISOString() });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.secret !== SECRET) return json_({ ok: false, error: 'secret' });
    lock.waitLock(20000);
    if (p.action === 'upsert') return json_(upsert_(p));
    if (p.action === 'mail') return json_(mail_(p));
    if (p.action === 'append') return json_(append_(p));
    return json_({ ok: false, error: 'action' });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
  finally { try { lock.releaseLock(); } catch (x) {} }
}

// التاب: بالاسم (من غير ما المسافات أو ى/ي تفرق) — ولو مش لاقيه: أول تاب فيه عمود "كود الاصل"
function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID), all = ss.getSheets(), k = s => norm(s).replace(/ة/g, 'ه').replace(/[أإآ]/g, 'ا');
  let sh = ss.getSheetByName(TAB) || all.filter(s => k(s.getName()) === k(TAB))[0];
  if (!sh) sh = all.filter(s => { const lc = s.getLastColumn(); if (!lc) return false; const h = s.getRange(1, 1, 1, lc).getDisplayValues()[0].map(x => String(x).trim()); return CODE_H.some(c => h.indexOf(c) >= 0); })[0];
  if (!sh) throw new Error('مش لاقي تاب الجرد — التابات الموجودة: ' + all.map(s => '"' + s.getName() + '"').join('، '));
  return sh;
}

// نسخة احتياطية كاملة (مرة واحدة) + شيت السجل
function ensureSafety_() {
  const pr = props();
  let bid = pr.getProperty('BACKUP_ID'), lid = pr.getProperty('LOG_ID');
  if (!bid) {
    const src = SpreadsheetApp.openById(SHEET_ID);
    const copy = src.copy('نسخة احتياطية قبل الربط — ' + src.getName() + ' — ' + Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd HH:mm'));
    bid = copy.getId(); pr.setProperty('BACKUP_ID', bid);
  }
  if (!lid) {
    const ls = SpreadsheetApp.create('TP IT - سجل مزامنة شيت الجرد');
    const s = ls.getSheets()[0]; s.setName('السجل'); s.appendRow(['الوقت', 'المصدر', 'بواسطة', 'الكود', 'العمود', 'قبل', 'بعد', 'النتيجة']); s.setFrozenRows(1); s.setRightToLeft(true);
    lid = ls.getId(); pr.setProperty('LOG_ID', lid);
  }
  return { backupUrl: 'https://docs.google.com/spreadsheets/d/' + bid, logUrl: 'https://docs.google.com/spreadsheets/d/' + lid };
}
function log_(rows) { if (!rows.length) return; const s = SpreadsheetApp.openById(props().getProperty('LOG_ID')).getSheets()[0]; s.getRange(s.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows); }

// تعديل من النظام: خانات مسموحة بس + كشف التعارض بالقيمة
function upsert_(p) {
  ensureSafety_(); // مفيش كتابة من غير نسخة احتياطية
  const sh = sheet_(), rng = sh.getDataRange(), vals = rng.getValues(), disp = rng.getDisplayValues();
  const head = disp[0].map(h => String(h).trim()), kc = CODE_H.map(h => head.indexOf(h)).filter(i => i >= 0)[0];
  if (kc == null) return { ok: false, error: 'عمود الكود مش موجود' };
  let r = -1; for (let i = 1; i < disp.length; i++) if (String(disp[i][kc]).trim().toUpperCase() === String(p.key).trim().toUpperCase()) { r = i; break; }
  if (r < 0) return { ok: false, error: 'not_found' };
  const now = new Date().toISOString(), by = p.by || 'النظام', base = p.baseVals || {}, set = p.set || {};
  // 1) التعارض: أي خانة اتغيرت في الشيت عن اللي النظام كان شايفه
  if (!p.force) {
    const conf = Object.keys(set).filter(h => { const c = head.indexOf(String(h).trim()); return c >= 0 && h in base && norm(disp[r][c]) !== norm(base[h]) && norm(disp[r][c]) !== norm(set[h]); });
    if (conf.length) { const cur = {}; head.forEach((h, i) => { cur[h] = disp[r][i]; }); log_([[now, 'system', by, p.key, conf.join('، '), '', '', 'conflict']]); return { ok: false, conflict: true, fields: conf, current: cur }; }
  }
  // 2) الكتابة في الخانات المسموحة بس
  const logs = []; let changed = 0, skipped = [];
  Object.keys(set).forEach(h => {
    const c = head.indexOf(String(h).trim());
    if (c < 0 || c === kc || ALLOWED.indexOf(String(h).trim()) < 0) { skipped.push(h); return; }
    const old = vals[r][c], isBool = typeof old === 'boolean';
    const v = isBool ? (set[h] === true || /^true$/i.test(String(set[h]))) : String(set[h] == null ? '' : set[h]);
    if (norm(disp[r][c]) === norm(isBool ? String(v).toUpperCase() : v)) return;
    sh.getRange(r + 1, c + 1).setValue(v); changed++;
    logs.push([now, 'system', by, p.key, h, disp[r][c], String(v), p.force ? 'ok (فوق تعارض)' : 'ok']);
  });
  log_(logs);
  return { ok: true, changed: changed, skipped: skipped, version: now };
}

const csv_ = rows => rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// شيت الإيميلات: مقسوم سكاشن (iT / HR / sales / telesales) ← بيرجع القسم والاسم والإيميل بس — الباسوردات عمرها ما بتطلع من جوجل
function mails_(id) {
  const rng = SpreadsheetApp.openById(id).getSheets()[0].getDataRange(), v = rng.getDisplayValues(), bg = rng.getBackgrounds(), out = [['القسم', 'اسم الموظف', 'الإيميل', 'النوع', 'الحالة']];
  // الصف الأخضر = الإيميل خالي (مش مع حد)
  const green = h => { const m = String(h || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); if (!m) return false; const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16); return g >= 0x99 && g - Math.max(r, b) >= 0x40; };
  const dept = s => { s = String(s).trim(); return /^it$/i.test(s) ? 'IT' : /^hr$/i.test(s) ? 'HR' : /tele/i.test(s) ? 'tele sales' : /sales/i.test(s) ? 'Sales' : s; };
  let sec = '';
  v.forEach((r, ri) => {
    const cells = r.map(c => String(c).trim()), ei = cells.findIndex(c => EMAIL_RE.test(c));
    if (ei < 0) { const filled = cells.filter(Boolean); if (filled.length === 1 && cells[0] && !/^(mail|password)$/i.test(cells[0])) sec = dept(cells[0]); return; }
    const name = ei > 0 && cells[0] && !EMAIL_RE.test(cells[0]) ? cells[0] : '';
    const free = green(bg[ri][ei]) || green(bg[ri][0]);
    out.push([sec, name, cells[ei].toLowerCase(), name ? 'شخصي' : 'خدمة', free ? 'خالي' : '']);
  });
  return out;
}
// شيت الأرقام: الأعمدة المعروفة بس، والرقم لازم يبقى أرقام (أي حاجة تانية في خانة الرقم بتتجاهل)
function lines_(id) {
  const v = SpreadsheetApp.openById(id).getSheets()[0].getDataRange().getDisplayValues(), H = v[0].map(h => String(h).trim());
  const c = n => H.indexOf(n), cols = { code: 0, holder: c('المستلم'), number: c('الرقم'), serial: c('السريال'), lastPaid: c('اخر دفع'), renew: c('التجديد القادم'), company: c('الشركة'), phone: c('كود الهاتف'), carrier: c('النوع'), status: c('الحاله'), backup: c('ميل backup'), note: c('ملاحظه') };
  const out = [['الكود', 'المستلم', 'الرقم', 'السريال', 'آخر دفع', 'التجديد القادم', 'الشركة', 'كود الهاتف', 'شركة الاتصالات', 'الحالة', 'إيميل الباك أب', 'ملاحظة']];
  v.slice(1).forEach(r => {
    const g = k => cols[k] >= 0 ? String(r[cols[k]] || '').trim() : '', code = g('code'), num = g('number').replace(/[\s+-]/g, '');
    if (!/^[A-Za-z]{2,}-[A-Za-z]{2,}-\d+$/.test(code) || !/^\d{9,15}$/.test(num)) return;
    const note = g('note'), bk = g('backup');
    out.push([code, g('holder'), num, /^\d{10,}$/.test(g('serial')) ? g('serial') : '', g('lastPaid'), g('renew'), g('company'), g('phone') === '---' ? '' : g('phone'), g('carrier'), g('status'), EMAIL_RE.test(bk) ? bk : '', /^\*\d+#$|كود الشحن/.test(note) ? '' : note]);
  });
  return out;
}

// ---------- استمارة التقديم (Google Form) — مرة واحدة: الفورم + شيت الردود على حسابك ----------
function setupForm_() {
  const pr = props(); let fid = pr.getProperty('FORM_ID');
  if (fid) { try { const f = FormApp.openById(fid); return { url: f.getPublishedUrl(), edit: f.getEditUrl(), sheet: 'https://docs.google.com/spreadsheets/d/' + pr.getProperty('FORM_SS') }; } catch (e) { fid = ''; } }
  const f = FormApp.create('استمارة طلب توظيف — Three Pillars');
  f.setDescription('اكتب بياناتك وهنتواصل معاك. البيانات دي بتوصل لقسم الموارد البشرية بس.').setCollectEmail(false).setAllowResponseEdits(false).setLimitOneResponsePerUser(false).setConfirmationMessage('✓ طلبك وصل — شكرًا! هنتواصل معاك قريب.');
  const T = (t, req) => f.addTextItem().setTitle(t).setRequired(!!req), P = t => f.addParagraphTextItem().setTitle(t), L = (t, o, req) => f.addMultipleChoiceItem().setTitle(t).setChoiceValues(o).setRequired(!!req);
  T('الاسم', true); T('الهاتف', true); T('الإيميل'); T('الوظيفة المطلوبة', true); T('الراتب المتوقع');
  f.addDateItem().setTitle('تاريخ الميلاد'); L('النوع', ['ذكر', 'أنثى'], true); L('الموقف التجنيدي', ['أدى الخدمة', 'معفى', 'مؤجل', 'لم يحن موعده', 'لا ينطبق']);
  L('الحالة الاجتماعية', ['أعزب', 'متزوج', 'مطلق', 'أرمل']); T('العنوان'); T('الرقم القومي'); T('المؤهل'); T('سنة التخرج'); T('سنين الخبرة');
  P('الأعمال السابقة (الشركة · من/إلى · الوظيفة · الراتب · سبب ترك العمل)'); P('الدورات (الاسم · الفترة · المحاضر)'); P('المراجع (الاسم · الوظيفة · الهاتف)'); T('مدة الإخطار قبل ترك العمل الحالي');
  const ss = SpreadsheetApp.create('ردود استمارة التوظيف — Three Pillars');
  f.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  pr.setProperty('FORM_ID', f.getId()); pr.setProperty('FORM_SS', ss.getId());
  return { url: f.getPublishedUrl(), edit: f.getEditUrl(), sheet: ss.getUrl() };
}

// ---------- التنبيهات على الجيميل ----------
// بتتبعت لصاحب السكربت بس (الجيميل بتاعك) — ومفيش تنبيه بيتبعت مرتين حتى لو الموقع والبرنامج الاتنين شغالين
function mail_(p) {
  const to = Session.getEffectiveUser().getEmail(), pr = props(), items = [];
  (p.items || []).forEach(a => {
    const k = 'm_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(a.key || a.title))).slice(0, 22);
    if (p.test || !pr.getProperty(k)) { items.push(a); if (!p.test) pr.setProperty(k, String(Date.now())); }
  });
  if (!items.length) return { ok: true, sent: 0 };
  const urgent = items.filter(a => a.sev === 'urgent').length, site = String(p.site || '');
  const subject = (p.test ? '✅ تجربة — ' : urgent ? '🔴 ' : '🟠 ') + 'تنبيهات تكنولوجيا المعلومات · Three Pillars (' + items.length + ')';
  const rows = items.map(a => '<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (a.sev === 'urgent' ? '🔴 عاجل' : '🟠 قريب') + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee"><b>' + esc_(a.title) + '</b></td><td style="padding:6px 10px;border-bottom:1px solid #eee;direction:ltr">' + esc_(a.code || '') + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (site && a.link ? '<a href="' + esc_(site + a.link) + '">فتح</a>' : '') + '</td></tr>').join('');
  MailApp.sendEmail({ to: to, subject: subject, name: 'Three Pillars · تكنولوجيا المعلومات',
    htmlBody: '<div dir="rtl" style="font-family:Tahoma,Arial;font-size:14px"><h2 style="color:#c94f08;margin:0 0 8px">تنبيهات تكنولوجيا المعلومات</h2>' + (p.test ? '<p>دي رسالة تجربة — الربط شغال ✓</p>' : '') + '<table style="border-collapse:collapse;width:100%">' + rows + '</table><p style="color:#888;font-size:12px">اتبعتت من نظام Three Pillars · تكنولوجيا المعلومات — كل تنبيه بيتبعت مرة واحدة.</p></div>' });
  return { ok: true, sent: items.length, to: to };
}
const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// جهاز جديد من السيستم: لو كوده موجود كصف محجوز فاضي ← يتملي · لو مش موجود ← صف جديد تحت آخر صف فيه بيانات
// الكود المستخدم لجهاز تاني ← مرفوض (مفيش كتابة فوق جهاز)
const APPEND_ALLOWED = ALLOWED.concat(['كود الاصل', 'كود الأصل', 'الفئه', 'الفئة', 'الشركه', 'الشركة']);
function append_(p) {
  ensureSafety_();
  const sh = sheet_(), rng = sh.getDataRange(), vals = rng.getValues(), disp = rng.getDisplayValues();
  const head = disp[0].map(h => String(h).trim()), kc = CODE_H.map(h => head.indexOf(h)).filter(i => i >= 0)[0];
  if (kc == null) return { ok: false, error: 'عمود الكود مش موجود' };
  const key = String(p.key || '').trim(); if (!key) return { ok: false, error: 'no_code' };
  const dataCols = ['اسم الموظف', 'الجهاز', 'سريال الجهاز', 'سريال الشاشه'].map(h => head.indexOf(h)).filter(i => i >= 0);
  let r = -1; for (let i = 1; i < disp.length; i++) if (String(disp[i][kc]).trim().toUpperCase() === key.toUpperCase()) { r = i; break; }
  if (r >= 0 && dataCols.some(c => String(disp[r][c]).trim())) return { ok: false, error: 'code_taken' };
  let mode = 'filled';
  if (r < 0) { mode = 'appended'; r = disp.length; for (let i = disp.length - 1; i >= 1; i--) { if (disp[i].some(c => String(c).trim())) { r = i + 1; break; } } }
  const now = new Date().toISOString(), logs = [], v = p.values || {};
  Object.keys(v).forEach(h => {
    const c = head.indexOf(String(h).trim()); if (c < 0 || APPEND_ALLOWED.indexOf(String(h).trim()) < 0) return;
    const cell = sh.getRange(r + 1, c + 1), old = r < vals.length ? vals[r][c] : '';
    const val = typeof v[h] === 'boolean' ? v[h] : String(v[h] == null ? '' : v[h]); if (val === '' && !old) return;
    cell.setValue(val); logs.push([now, 'system', p.by || 'النظام', key, h, String(old), String(val), mode]);
  });
  if (kc != null && mode === 'appended') sh.getRange(r + 1, kc + 1).setValue(key);
  log_(logs.length ? logs : [[now, 'system', p.by || '', key, '', '', '', mode]]);
  return { ok: true, mode: mode, row: r + 1 };
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

// تشغيل مرة واحدة من المحرر: الموافقة على الصلاحية + عمل النسخة الاحتياطية وشيت السجل
function authorize() { const i = ensureSafety_(), fm = setupForm_(); Logger.log('استمارة التقديم (للـ QR): ' + fm.url + '\nتعديل الاستمارة: ' + fm.edit + '\nشيت الردود: ' + fm.sheet); mail_({ test: true, items: [{ key: 'setup', title: 'الربط بالجيميل اشتغل — التنبيهات هتوصلك هنا', sev: 'soon' }] }); Logger.log('تمام ✓ — الشيت: ' + sheet_().getParent().getName() + '\nالنسخة الاحتياطية: ' + i.backupUrl + '\nالسجل: ' + i.logUrl); }
