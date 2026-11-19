/**
 * Code.gs — بيستقبل قراءات WE من سكريبت we_usage.py ويكتبها في الشيت
 *   • تاب "الاستهلاك": لقطة يومية لكل خط (الكود · التاريخ · المستخدم · المتبقي · الحصة · التجديد · المصدر)
 *   • تاب "الباقات":   يحدّث الحصة وتاريخ التجديد للخط بالكود (والباقي زي ما هو)
 * نظام IT Administration بيقرا التابين دول في المزامنة (كل 5 دقايق).
 *
 * التركيب (مرة واحدة):
 *   1) في الشيت: Extensions ← Apps Script ← امسح الموجود والصق الملف ده ← غيّر SECRET تحت.
 *   2) Deploy ← New deployment ← Web app ← Execute as: Me ← Who has access: Anyone ← Deploy.
 *   3) انسخ رابط الـ Web app وحطه في config.json (sheet_webapp_url) ونفس الـ SECRET في sheet_secret.
 */
const SECRET = 'CHANGE_ME';
const USAGE_TAB = 'الاستهلاك';
const PACKAGES_TAB = 'الباقات';

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.secret !== SECRET) return out_({ ok: false, error: 'secret' });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usage = tab_(ss, USAGE_TAB, ['الكود', 'التاريخ', 'المستخدم', 'المتبقي', 'الحصة', 'التجديد', 'المصدر']);
    const pk = tab_(ss, PACKAGES_TAB, ['الكود', 'الاسم', 'الحصة', 'التجديد', 'التكلفة', 'العملة', 'الفرع', 'المورد']);
    (p.rows || []).forEach(r => {
      // لقطة يومية: سطر واحد لكل (كود + تاريخ) — لو اتشغّل كذا مرة في اليوم بيتحدّث نفس السطر
      upsert_(usage, { 'الكود': r.code, 'التاريخ': r.date }, { 'المستخدم': r.used, 'المتبقي': r.remaining, 'الحصة': r.quota, 'التجديد': r.renewalDate, 'المصدر': r.source || 'my.te.eg' });
      // الباقة: الحصة والتجديد بس
      const patch = { 'الحصة': r.quota };
      if (r.renewalDate) patch['التجديد'] = r.renewalDate;
      upsert_(pk, { 'الكود': r.code }, patch, { 'الاسم': r.name || '', 'العملة': 'EGP', 'المورد': 'WE' });
    });
    return out_({ ok: true, rows: (p.rows || []).length, at: new Date().toISOString() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

// للتجربة من المتصفح: يرجع ok لو الـ Web app شغال
function doGet() { return out_({ ok: true, service: 'IT Administration · WE usage receiver' }); }

function tab_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, headers.length).setValues([headers]); }
  const have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
  headers.forEach(h => { if (have.indexOf(h) < 0) { sh.getRange(1, have.length + 1).setValue(h); have.push(h); } });
  sh.getRange(1, 1, sh.getMaxRows(), have.length).setNumberFormat('@'); // نص: عشان التواريخ متتقلبش
  return sh;
}

function upsert_(sh, keys, values, onInsert) {
  const data = sh.getDataRange().getValues(), head = data[0].map(String), col = h => head.indexOf(h);
  let row = -1;
  for (let i = 1; i < data.length; i++) {
    if (Object.keys(keys).every(k => String(data[i][col(k)]) === String(keys[k]))) { row = i + 1; break; }
  }
  const all = Object.assign({}, keys, values);
  if (row < 0) {
    Object.assign(all, onInsert || {});
    const line = head.map(h => (all[h] === undefined || all[h] === null) ? '' : String(all[h]));
    sh.appendRow(line);
  } else {
    Object.keys(values).forEach(h => { if (col(h) >= 0 && values[h] !== undefined && values[h] !== '') sh.getRange(row, col(h) + 1).setValue(String(values[h])); });
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
