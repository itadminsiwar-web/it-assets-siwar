/**
 * @OnlyCurrentDoc
 * Code.gs — مزامنة في الاتجاهين (تجربة) بين نظام IT و "نسخة تجريبية" من شيت الجرد
 *
 * أمان:
 *   • @OnlyCurrentDoc: السكربت ده مايقدرش يفتح أي شيت تاني غير الملف ده (ولا الشيت الأصلي).
 *   • النسخة بتتملي من النظام (اللي بيقرا الشيت الأصلي قراءة بس) — الأصلي عمره ما بيتكتب فيه.
 *   • الشيت ده مش لازم يبقى عام: النظام بيقراه عن طريق الـ Web app بالـ SECRET.
 *
 * اللي بيعمله:
 *   GET  ?action=csv&secret=…   ← تاب "شيت جرد" كـ CSV (+ row_version لكل صف)
 *   POST {action:'seed'}        ← يملى النسخة (مرة واحدة) + قوائم منسدلة وألوان وCheckboxes
 *   POST {action:'upsert'}      ← تعديل من النظام: بيتأكد من رقم النسخة (لو الصف اتعدل في الشيت ← تعارض، مش كتابة فوقه)
 *   onEdit                      ← أي تعديل يدوي في الشيت بيزوّد row_version وبيتسجل في "سجل_التغييرات"
 */
// SECRET موجود في Secret.js (مش بيترفع على GitHub)
const TAB = 'شيت جرد';
const LOG = 'سجل_التغييرات';
const META = ['row_version', 'updated_at', 'updated_by', 'source'];
const CODE_H = ['كود الاصل', 'كود الأصل', 'الكود', 'code'];
const STATUS_H = ['الحاله', 'الحالة'];
const STATUSES = ['مستخدم', 'تالف', 'تحت الصيانة', 'يحتاج الي صيانه', 'خالي', 'مخزن', 'مخزن/تالف'];
const ST_COLORS = { 'مستخدم': '#16a34a', 'تالف': '#dc2626', 'تحت الصيانة': '#ea580c', 'يحتاج الي صيانه': '#f59e0b', 'خالي': '#2563eb', 'خالى': '#2563eb', 'مخزن': '#6b7280', 'مخزن/تالف': '#9f1239' };
const BOOL_H = ['كيبورد', 'ماوس', 'سماعة', 'سماعه', 'كابلات', 'باده', 'باد', 'بادة', 'شاحن'];
const CATS = [['CMP', 'كمبيوتر مكتبي (Desktop)'], ['CMPM', 'كمبيوتر مكتبي (DESIGN)'], ['CMPH', 'كمبيوتر مكتبي (MOTION)'], ['LTP', 'كمبيوتر محمول (Laptop)'], ['AIO', 'كمبيوتر كامل / All-in-One'], ['PRN', 'طابعة'], ['MOB', 'هاتف محمول'], ['Mobile', 'هاتف محمول (اسم الشيت الحالي)'], ['MAC', 'ماكنتوش'], ['Hard', 'هارد خارجي'], ['mon', 'شاشة']];

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.secret !== SECRET) return json_({ ok: false, error: 'secret' });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB);
  if (p.action === 'csv') {
    if (!sh || sh.getLastRow() < 1) return text_('');
    const v = sh.getDataRange().getDisplayValues();
    return text_(v.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n'));
  }
  return json_({ ok: true, service: 'TP IT · two-way test', rows: sh ? Math.max(0, sh.getLastRow() - 1) : 0, at: new Date().toISOString() });
}

function doPost(e) {
  const lock = LockService.getDocumentLock();
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.secret !== SECRET) return json_({ ok: false, error: 'secret' });
    lock.waitLock(20000);
    if (p.action === 'seed') return json_(seed_(p));
    if (p.action === 'upsert') return json_(upsert_(p));
    return json_({ ok: false, error: 'action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

// ---------- التعبئة الأولى من النظام (نسخة من الأصلي) ----------
function seed_(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB);
  if (sh && sh.getLastRow() > 1 && !p.force) return { ok: false, error: 'not_empty', rows: sh.getLastRow() - 1 };
  if (!sh) sh = ss.insertSheet(TAB, 0);
  sh.clear(); sh.clearConditionalFormatRules(); sh.getDataRange().clearDataValidations();
  const rows = (p.rows || []).filter(r => r.some(c => String(c).trim() !== ''));
  if (!rows.length) return { ok: false, error: 'no_rows' };
  const head = rows[0].map(String).concat(META), now = new Date().toISOString();
  const body = rows.slice(1).map(r => { const x = head.slice(0, rows[0].length).map((_, i) => r[i] == null ? '' : String(r[i])); return x.concat([1, now, 'seed', 'seed']); });
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#eef2f7');
  if (body.length) sh.getRange(2, 1, body.length, head.length).setNumberFormat('@').setValues(body);
  sh.setFrozenRows(1); sh.setRightToLeft(true);
  format_(sh, head, body.length);
  // قوائم مرجعية
  ref_(ss, 'الحالات', [['الحالة', 'اللون']].concat(STATUSES.map(s => [s, ST_COLORS[s]])));
  ref_(ss, 'الفئات', [['كود الفئة', 'الفئة']].concat(CATS));
  ref_(ss, 'ألوان_الاختيارات', [['الحقل', 'الخيار', 'اللون HEX']].concat(STATUSES.map(s => ['الحاله', s, ST_COLORS[s]])));
  logTab_(ss);
  log_(ss, 'seed', p.by || 'النظام', '', '', '', body.length + ' صف', 1, 'ok');
  // الصفحة الأولى الفاضية (Sheet1) مش محتاجينها
  ss.getSheets().forEach(s => { if (s.getName() !== TAB && /^(Sheet1|ورقة1|Feuille 1)$/.test(s.getName()) && s.getLastRow() === 0) ss.deleteSheet(s); });
  return { ok: true, rows: body.length };
}

function format_(sh, head, n) {
  const max = Math.max(n, 1), col = names => { for (const h of names) { const i = head.indexOf(h); if (i >= 0) return i + 1; } return 0; };
  // الحالة: قائمة منسدلة + لون الخلية بس (مش الصف)
  const sc = col(STATUS_H);
  if (sc) {
    const r = sh.getRange(2, sc, max, 1);
    r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES.concat(['خالى']), true).setAllowInvalid(true).build());
    sh.setConditionalFormatRules(Object.keys(ST_COLORS).map(s => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setFontColor(ST_COLORS[s]).setBackground(ST_COLORS[s] + '22').setRanges([r]).build()));
  }
  // الملحقات: Checkboxes
  head.forEach((h, i) => { if (BOOL_H.indexOf(String(h).trim()) >= 0) { const r = sh.getRange(2, i + 1, max, 1), v = r.getValues().map(x => [/^(true|yes|1|✓|نعم)$/i.test(String(x[0]).trim())]); r.setNumberFormat('General').insertCheckboxes().setValues(v); } });
  // أعمدة النظام: تحذير لو حد عدّلها بإيده
  const m = head.indexOf('row_version') + 1;
  if (m) { sh.getRange(1, m, max + 1, META.length).setBackground('#f3f4f6').setFontColor('#6b7280'); sh.getRange(1, m, max + 1, META.length).protect().setDescription('أعمدة المزامنة — متعدلهاش').setWarningOnly(true); }
}

function ref_(ss, name, rows) { let s = ss.getSheetByName(name); if (!s) s = ss.insertSheet(name); s.clear(); s.getRange(1, 1, rows.length, rows[0].length).setValues(rows); s.getRange(1, 1, 1, rows[0].length).setFontWeight('bold'); s.setRightToLeft(true); }
function logTab_(ss) { let s = ss.getSheetByName(LOG); if (!s) { s = ss.insertSheet(LOG); s.appendRow(['الوقت', 'المصدر', 'المستخدم', 'الكود', 'العمود', 'قبل', 'بعد', 'رقم النسخة', 'النتيجة']); s.getRange(1, 1, 1, 9).setFontWeight('bold'); s.setRightToLeft(true); } return s; }
function log_(ss, src, by, code, h, before, after, ver, res) { logTab_(ss).appendRow([new Date().toISOString(), src, by, code, h, before, after, ver, res]); }

// ---------- تعديل من النظام (مع كشف التعارض) ----------
function upsert_(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB);
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: 'not_seeded' };
  const data = sh.getDataRange().getValues(), head = data[0].map(h => String(h).trim()), ci = names => { for (const h of names) { const i = head.indexOf(h); if (i >= 0) return i; } return -1; };
  const kc = ci(CODE_H), vc = head.indexOf('row_version');
  if (kc < 0 || vc < 0) return { ok: false, error: 'bad_header' };
  let r = -1; for (let i = 1; i < data.length; i++) if (String(data[i][kc]).trim().toUpperCase() === String(p.key).trim().toUpperCase()) { r = i; break; }
  if (r < 0) return { ok: false, error: 'not_found' };
  const ver = Number(data[r][vc]) || 0;
  // التعارض: النظام كان شايف نسخة أقدم من اللي في الشيت ← مش هنكتب فوق تعديل حد تاني
  if (p.base != null && Number(p.base) !== ver && !p.force) {
    const cur = {}; head.forEach((h, i) => { cur[h] = data[r][i]; });
    log_(ss, 'system', p.by || '', p.key, Object.keys(p.set || {}).join('، '), 'نسخة ' + p.base, 'الشيت ' + ver, ver, 'conflict');
    return { ok: false, conflict: true, version: ver, current: cur };
  }
  let changed = 0;
  Object.keys(p.set || {}).forEach(h => {
    const c = head.indexOf(String(h).trim()); if (c < 0 || META.indexOf(h) >= 0 || c === kc) return;
    const old = data[r][c], isBool = typeof old === 'boolean';
    const v = isBool ? (p.set[h] === true || /^true$/i.test(String(p.set[h]))) : String(p.set[h] == null ? '' : p.set[h]);
    if (String(old) === String(v)) return;
    sh.getRange(r + 1, c + 1).setValue(v); changed++;
    log_(ss, 'system', p.by || '', p.key, h, String(old), String(v), ver + 1, 'ok');
  });
  if (changed) sh.getRange(r + 1, vc + 1, 1, META.length).setValues([[ver + 1, new Date().toISOString(), p.by || 'النظام', 'system']]);
  return { ok: true, version: changed ? ver + 1 : ver, changed: changed };
}

// ---------- تعديل يدوي في الشيت ----------
function onEdit(e) {
  try {
    const sh = e.range.getSheet(); if (sh.getName() !== TAB || e.range.getRow() < 2) return;
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim()), vc = head.indexOf('row_version');
    if (vc < 0 || e.range.getColumn() > vc) return; // تعديل في أعمدة النظام نفسها
    const kc = CODE_H.map(h => head.indexOf(h)).filter(i => i >= 0)[0];
    const user = (e.user && e.user.getEmail && e.user.getEmail()) || 'الشيت';
    for (let r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
      const vr = sh.getRange(r, vc + 1), ver = (Number(vr.getValue()) || 0) + 1;
      sh.getRange(r, vc + 1, 1, META.length).setValues([[ver, new Date().toISOString(), user, 'sheet']]);
      const one = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;
      log_(e.source, 'sheet', user, kc != null ? sh.getRange(r, kc + 1).getValue() : '', one ? head[e.range.getColumn() - 1] : 'أكتر من خانة', one ? (e.oldValue == null ? '' : e.oldValue) : '', one ? (e.value == null ? '' : e.value) : '', ver, 'ok');
    }
  } catch (err) { /* تعديل عادي — مايوقفش الشيت */ }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

// تشغيل مرة واحدة من المحرر عشان توافق على الصلاحية (الملف ده بس)
function authorize() { SpreadsheetApp.getActiveSpreadsheet().getName(); Logger.log('تمام — الصلاحية على الملف ده بس'); }
