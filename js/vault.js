/* =========================================================
   vault.js — خزنة الباسوردات (لكل جهاز / خط / إيميل)
   • الباسوردات بتتشفّر في المتصفح بـ AES-256-GCM بمفتاح جاي من "الباسورد الرئيسي"
     (PBKDF2-SHA256، 250 ألف لفة). الباسورد الرئيسي نفسه مش بيتحفظ في أي حتة.
   • المتخزّن: DB.vaultCfg (salt + كود تحقق) و DB.secrets [{kind, refId, iv, ct}] — كله مشفّر،
     فالباك أب / التصدير / الشيت مفيهمش باسورد مقروء.
   • الخانات مالهاش name، فـ UI.form مش بيلمّها ومش بتدخل في سجل الجهاز نفسه.
   • الخزنة بتتقفل لوحدها بعد 15 دقيقة من غير استخدام، أو عند تحديث الصفحة.
   • مدير النظام وتقنية المعلومات بس.
   ========================================================= */
(function (global) {
  'use strict';
  const U = global.U, UI = global.UI;
  const { $, $$ } = UI;
  const esc = s => U.esc(s == null ? '' : s);
  const ITER = 250000, IDLE_MS = 15 * 60 * 1000;

  const FIELDS = {
    asset: [
      ['user', 'اسم المستخدم / حساب الدخول', 'text'],
      ['pass', 'كلمة سر الجهاز', 'secret'],
      ['pin', 'PIN / رمز القفل', 'secret'],
      ['account', 'Apple ID / حساب Google / Microsoft', 'text'],
      ['accountPass', 'باسورد الحساب', 'secret'],
      ['extra', 'باسوردات تانية (BIOS، الراوتر، الواي فاي…)', 'note'],
    ],
    line: [
      ['pin', 'PIN', 'secret'],
      ['puk', 'PUK', 'secret'],
      ['user', 'حساب بوابة المزود (my.te.eg / STC…)', 'text'],
      ['pass', 'باسورد البوابة', 'secret'],
      ['extra', 'ملاحظات سرية', 'note'],
    ],
    staff: [
      ['winUser', 'اسم مستخدم الويندوز / الجهاز', 'text'],
      ['winPass', 'باسورد الويندوز / الجهاز', 'secret'],
      ['crmUser', 'حساب الـ CRM / السيستم', 'text'],
      ['crmPass', 'باسورد الـ CRM / السيستم', 'secret'],
      ['mailPass', 'باسورد الإيميل', 'secret'],
      ['pin', 'PIN الموبايل', 'secret'],
      ['artiqUser', 'innocalls — اسم المستخدم', 'text'],
      ['artiqNo', 'innocalls — رقم الدخول', 'secret'],
      ['doorUser', 'بصمة الدخول — اسم المستخدم', 'text'],
      ['doorNo', 'بصمة الدخول — رقم الدخول', 'secret'],
      ['attUser', 'بصمة الحضور — اسم المستخدم', 'text'],
      ['attNo', 'بصمة الحضور — رقم الدخول', 'secret'],
      ['extra', 'باسوردات تانية (واي فاي، برامج، مواقع…)', 'note'],
    ],
    mail: [
      ['pass', 'كلمة سر الإيميل', 'secret'],
      ['recovery', 'إيميل / رقم الاسترداد', 'text'],
      ['appPass', 'App Password (للموبايل / Outlook)', 'secret'],
      ['extra', 'أكواد MFA الاحتياطية / ملاحظات', 'note'],
    ],
  };

  let KEY = null, idleT = null;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = buf => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const cfg = () => global.DB && DB.vaultCfg;
  const list = () => { if (!Array.isArray(DB.secrets)) DB.secrets = []; return DB.secrets; };
  const save = () => global.Store.save();

  function allowed() {
    const u = (global.Auth && global.Auth.current && global.Auth.current()) || {};
    return !u.role || u.role === 'admin' || u.role === 'it';
  }
  function touch() { clearTimeout(idleT); idleT = setTimeout(lock, IDLE_MS); }
  function lock() { KEY = null; clearTimeout(idleT); }

  async function derive(pass, saltB64) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decrypt(key, box) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
    return JSON.parse(dec.decode(pt));
  }

  // ---------- فتح الخزنة (أو إنشاء الباسورد الرئيسي أول مرة) ----------
  function unlock() {
    if (!allowed()) return Promise.reject(new Error('الباسوردات لمدير النظام وتقنية المعلومات بس'));
    if (!global.crypto || !crypto.subtle) return Promise.reject(new Error('المتصفح ده مش بيدعم التشفير (لازم https)'));
    if (KEY) { touch(); return Promise.resolve(KEY); }
    const first = !cfg();
    return new Promise((resolve, reject) => {
      let busy = false, done = false;
      const m = UI.modal({
        title: first ? '🔑 إنشاء الباسورد الرئيسي للخزنة' : '🔒 فتح خزنة الباسوردات',
        saveLabel: first ? 'إنشاء' : 'فتح',
        body: (first
          ? `<p class="muted small">ده باسورد واحد بتفتح بيه كل باسوردات الأجهزة والخطوط والإيميلات. <b>مش بيتحفظ في أي حتة ولو نسيته الباسوردات المتسجلة مش هترجع</b> — اكتبه في مكان آمن.</p>
             <div class="grid2"><label class="field"><span>الباسورد الرئيسي</span><input type="password" data-m1 autocomplete="new-password" dir="ltr"></label>
             <label class="field"><span>تأكيده</span><input type="password" data-m2 autocomplete="new-password" dir="ltr"></label></div>
             <label class="field check full"><input type="checkbox" data-saved> كتبت الباسورد الرئيسي في مكان آمن بره النظام</label>`
          : `<label class="field full"><span>الباسورد الرئيسي</span><input type="password" data-m1 autocomplete="current-password" dir="ltr"></label>
             <p class="muted small">الخزنة بتتقفل لوحدها بعد 15 دقيقة من غير استخدام.</p>`),
        extraButtons: first ? '' : '<button class="btn ghost" data-forgot>نسيت الباسورد الرئيسي</button>',
        onOpen: x => {
          $$('input', x.el).forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-save]', x.el).click(); }));
          const f = $('[data-forgot]', x.el); if (f) f.onclick = () => { done = true; x.close(); resetAll().then(() => reject(new Error('cancel')), () => reject(new Error('cancel'))); };
          const obs = new MutationObserver(() => { if (!document.body.contains(x.el)) { obs.disconnect(); if (!done) reject(new Error('cancel')); } });
          obs.observe(document.body, { childList: true });
        },
        onSave: x => {
          if (busy) return false;
          const p1 = $('[data-m1]', x.el).value, p2 = first ? $('[data-m2]', x.el).value : p1;
          if (!p1) throw new Error('اكتب الباسورد الرئيسي');
          if (first && p1.length < 8) throw new Error('الباسورد الرئيسي لازم 8 حروف على الأقل');
          if (p1 !== p2) throw new Error('التأكيد مش مطابق');
          if (first && !$('[data-saved]', x.el).checked) throw new Error('اكتب الباسورد الرئيسي في مكان آمن الأول وعلّم على المربع');
          busy = true; const btn = $('[data-save]', x.el); btn.disabled = true; btn.textContent = '…';
          (async () => {
            try {
              if (first) {
                const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
                const k = await derive(p1, salt);
                DB.vaultCfg = { salt, check: await encrypt(k, 'ok'), createdAt: new Date().toISOString() };
                save(); KEY = k;
              } else {
                const k = await derive(p1, cfg().salt);
                try { await decrypt(k, cfg().check); } catch (e) { throw new Error('الباسورد الرئيسي غلط'); }
                KEY = k;
              }
              touch(); done = true; x.close(); resolve(KEY);
              // أول ما الخزنة تتفتح: باسوردات عمود PSWD في الشيت تدخل الخزنة على طول
              const X = global.ITX;
              if (X && X.sync && (first || X.sheetPwPending) && (X.settings().sheetId || X.settings().usageSheetId))
                setTimeout(() => X.sync(false).then(() => { UI.toast('🔑 باسوردات الأجهزة اتنقلت من الشيت للخزنة'); global.Router && global.Router.render(); }).catch(() => {}), 300);
            } catch (e) { UI.toast(e.message, 'err'); busy = false; btn.disabled = false; btn.textContent = first ? 'إنشاء' : 'فتح'; }
          })();
          return false;
        },
      });
      return m;
    });
  }

  function resetAll() {
    return new Promise((resolve, reject) => {
      UI.modal({
        title: '⚠️ مسح الخزنة وعمل باسورد رئيسي جديد',
        saveLabel: 'امسح الخزنة',
        body: `<p>من غير الباسورد الرئيسي مفيش أي طريقة لفك الباسوردات المتسجلة (${list().length} سجل).</p>
          <p class="t-bad">الحل الوحيد: مسح كل الباسوردات المتسجلة وعمل باسورد رئيسي جديد، وبعدها تسجّلها تاني.</p>
          <label class="field full"><span>اكتب كلمة <b>امسح</b> للتأكيد</span><input data-c></label>`,
        onSave: x => {
          if ($('[data-c]', x.el).value.trim() !== 'امسح') throw new Error('اكتب كلمة امسح');
          DB.secrets = []; delete DB.vaultCfg; lock(); global.Core.audit('حذف', 'خزنة الباسوردات', 'مسح كل الباسوردات (نسيان الباسورد الرئيسي)'); save();
          UI.toast('اتمسحت الخزنة — أول ما تفتحها هتعمل باسورد رئيسي جديد', 'warn'); resolve();
        },
      });
    });
  }

  function changeMaster() {
    return unlock().then(oldKey => new Promise(resolve => {
      UI.modal({
        title: '🔑 تغيير الباسورد الرئيسي', saveLabel: 'تغيير',
        body: `<div class="grid2"><label class="field"><span>الباسورد الجديد</span><input type="password" data-m1 autocomplete="new-password" dir="ltr"></label>
          <label class="field"><span>تأكيده</span><input type="password" data-m2 autocomplete="new-password" dir="ltr"></label></div>`,
        onSave: x => {
          const p1 = $('[data-m1]', x.el).value, p2 = $('[data-m2]', x.el).value;
          if (p1.length < 8) throw new Error('8 حروف على الأقل'); if (p1 !== p2) throw new Error('التأكيد مش مطابق');
          (async () => {
            const salt = b64(crypto.getRandomValues(new Uint8Array(16))), k = await derive(p1, salt);
            const rows = [];
            for (const s of list()) rows.push(Object.assign({}, s, await encrypt(k, await decrypt(oldKey, s))));
            DB.secrets = rows; DB.vaultCfg = { salt, check: await encrypt(k, 'ok'), createdAt: new Date().toISOString() };
            KEY = k; touch(); global.Core.audit('تعديل', 'خزنة الباسوردات', 'تغيير الباسورد الرئيسي'); save();
            x.close(); UI.toast('اتغيّر الباسورد الرئيسي'); resolve();
          })().catch(e => UI.toast(e.message, 'err'));
          return false;
        },
      });
    }));
  }

  // ---------- قراءة / كتابة ----------
  const find = (kind, refId) => list().find(s => s.kind === kind && s.refId === refId);
  const has = (kind, refId) => !!(refId && find(kind, refId));
  async function read(kind, refId) {
    const k = await unlock();
    const s = refId && find(kind, refId); return s ? decrypt(k, s) : {};
  }
  async function write(kind, refId, values, label) {
    const k = await unlock();
    const clean = {}; Object.keys(values).forEach(f => { if (values[f]) clean[f] = values[f]; });
    const i = list().findIndex(s => s.kind === kind && s.refId === refId);
    if (!Object.keys(clean).length) { if (i >= 0) list().splice(i, 1); }
    else {
      const rec = Object.assign({ id: i >= 0 ? list()[i].id : U.uid(), kind, refId, updatedAt: new Date().toISOString(), by: ((global.Auth && global.Auth.current && global.Auth.current()) || {}).name || '' }, await encrypt(k, clean));
      if (i >= 0) list()[i] = rec; else list().push(rec);
    }
    global.Core.audit('تعديل', 'خزنة الباسوردات', label || (kind + ' ' + refId)); save(); touch();
  }

  // ---------- الخانات جوه الفورم ----------
  function inputs(kind, vals) {
    return FIELDS[kind].map(([f, label, t]) => t === 'note'
      ? `<label class="field full"><span>${esc(label)}</span><textarea data-sec="${f}" rows="2" dir="ltr" autocomplete="off">${esc(vals[f])}</textarea></label>`
      : `<label class="field"><span>${esc(label)}</span><div style="display:flex;gap:4px;align-items:center">
          <input data-sec="${f}" type="${t === 'secret' ? 'password' : 'text'}" value="${esc(vals[f])}" dir="ltr" autocomplete="new-password" style="flex:1;min-width:0">
          ${t === 'secret' ? '<button type="button" class="btn ghost" data-eye title="إظهار / إخفاء">👁</button>' : ''}
          <button type="button" class="btn ghost" data-copy title="نسخ">📋</button></div></label>`).join('');
  }
  function bindInputs(box) {
    box.onclick = e => {
      const eye = e.target.closest('[data-eye]'), cp = e.target.closest('[data-copy]');
      if (eye) { const i = eye.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; touch(); }
      if (cp) { const i = cp.parentNode.querySelector('input'); if (!i.value) return; navigator.clipboard.writeText(i.value).then(() => { UI.toast('اتنسخ — هيتمسح من الحافظة بعد 30 ثانية'); setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30000); }, () => UI.toast('مقدرتش أنسخ', 'err')); touch(); }
    };
  }
  const collect = box => { const v = {}; $$('[data-sec]', box).forEach(i => { v[i.dataset.sec] = i.value.trim(); }); return v; };

  // HTML القسم اللي بيتحط جوه فورم الجهاز / الخط / الإيميل
  function section(kind, refId) {
    if (!allowed()) return '';
    const n = has(kind, refId);
    return `<div class="field full vault-sec" data-vault="${kind}" style="border:1px dashed var(--line,#ccc);border-radius:10px;padding:10px;margin-top:4px">
      <span>🔑 الباسوردات <small class="muted">(متشفّرة — محدش يشوفها من غير الباسورد الرئيسي)</small></span>
      <div class="vault-body"><button type="button" class="btn" data-vopen>${n ? '🔓 فتح الباسوردات المتسجلة' : '+ إضافة باسوردات'}</button>
      ${n ? '<small class="muted"> · متسجل باسوردات للعنصر ده</small>' : ''}</div></div>`;
  }
  // يتنادى في onOpen للفورم
  function bindSection(formEl, kind, refId) {
    const sec = $('.vault-sec', formEl); if (!sec) return;
    const btn = $('[data-vopen]', sec);
    btn.onclick = async () => {
      try {
        const vals = await read(kind, refId);
        const body = $('.vault-body', sec); body.innerHTML = `<div class="grid2">${inputs(kind, vals)}</div>`;
        sec.dataset.loaded = '1'; sec.dataset.orig = JSON.stringify(collect(sec)); bindInputs(body);
      } catch (e) { if (e.message !== 'cancel') UI.toast(e.message, 'err'); }
    };
  }
  // يتنادى في onSave بعد ما السجل اتحفظ وبقى ليه id
  function saveSection(formEl, kind, refId, label) {
    const sec = $('.vault-sec', formEl); if (!sec || !sec.dataset.loaded) return;
    const v = collect(sec); if (JSON.stringify(v) === sec.dataset.orig) return;
    write(kind, refId, v, label).then(() => UI.toast('🔑 اتحفظت الباسوردات'), e => UI.toast('الباسوردات متحفظتش: ' + e.message, 'err'));
  }

  // ---------- نافذة الباسوردات لوحدها (من صفحة الجهاز / القوائم) ----------
  // باسوردات العهد اللي مع الموظف (أجهزة / خطوط / إيميلات) — للعرض بس
  async function staffRelated(id) {
    const lbl = { asset: {}, line: {}, mail: {} }; Object.keys(lbl).forEach(k => FIELDS[k].forEach(([f, l, t]) => { lbl[k][f] = [l, t]; }));
    const items = [].concat(
      (DB.assets || []).filter(a => a.holderId === id).map(a => ['asset', a.id, a.tag + ' — ' + ([a.brand, a.model].filter(Boolean).join(' ') || a.specs || '')]),
      (DB.lines || []).filter(l => l.holderId === id).map(l => ['line', l.id, '📞 ' + (l.code || l.number)]),
      (DB.mailboxes || []).filter(b => b.holderId === id).map(b => ['mail', b.id, '✉️ ' + b.address]));
    let html = '';
    for (const [k, rid, name] of items) {
      const s = find(k, rid); if (!s) { html += `<div class="muted small" style="margin:6px 0">${esc(name)} — <i>مفيش باسوردات متسجلة</i></div>`; continue; }
      const v = await decrypt(KEY, s);
      html += `<div style="margin:10px 0 4px"><b dir="auto">${esc(name)}</b></div><div class="grid2">` + Object.keys(v).map(f => { const [l, t] = lbl[k][f] || [f, 'text'];
        return t === 'note' ? `<label class="field full"><span>${esc(l)}</span><textarea rows="2" dir="ltr" readonly>${esc(v[f])}</textarea></label>`
          : `<label class="field"><span>${esc(l)}</span><div style="display:flex;gap:4px;align-items:center"><input type="${t === 'secret' ? 'password' : 'text'}" value="${esc(v[f])}" dir="ltr" readonly style="flex:1;min-width:0">${t === 'secret' ? '<button type="button" class="btn ghost" data-eye>👁</button>' : ''}<button type="button" class="btn ghost" data-copy>📋</button></div></label>`; }).join('') + '</div>';
    }
    return items.length ? `<h3 class="h3s" style="margin-top:16px">🔐 باسوردات العهدة اللي معاه</h3><div class="vault-rel">${html}</div><p class="muted small">دي بتتعدّل من صفحة كل جهاز / خط / إيميل.</p>` : '';
  }

  async function open(kind, refId, title) {
    let vals; try { vals = await read(kind, refId); } catch (e) { if (e.message !== 'cancel') UI.toast(e.message, 'err'); return; }
    const s = find(kind, refId);
    let rel = ''; if (kind === 'staff') { try { rel = await staffRelated(refId); } catch (e) { rel = ''; } }
    UI.modal({
      title: '🔑 ' + title, saveLabel: 'حفظ', wide: true,
      body: `<div class="grid2 vault-sec">${inputs(kind, vals)}</div>${rel}
        <p class="muted small">${s ? 'آخر تعديل ' + esc((s.updatedAt || '').slice(0, 16).replace('T', ' ')) + (s.by ? ' — ' + esc(s.by) : '') + ' · ' : ''}الخزنة بتتقفل لوحدها بعد 15 دقيقة.</p>`,
      extraButtons: '<button class="btn ghost" data-lock>🔒 اقفل الخزنة</button><button class="btn ghost" data-master>تغيير الباسورد الرئيسي</button>',
      onOpen: x => {
        bindInputs($('.vault-sec', x.el)); const relBox = $('.vault-rel', x.el); if (relBox) bindInputs(relBox);
        $('[data-lock]', x.el).onclick = () => { lock(); x.close(); UI.toast('الخزنة اتقفلت'); };
        $('[data-master]', x.el).onclick = () => { x.close(); changeMaster().catch(e => { if (e.message !== 'cancel') UI.toast(e.message, 'err'); }); };
      },
      onSave: x => { const v = collect($('.vault-sec', x.el)); write(kind, refId, v, title).then(() => { UI.toast('🔑 اتحفظت الباسوردات'); global.Router && global.Router.render(); }, e => UI.toast(e.message, 'err')); },
    });
  }
  // زرار صغير للقوائم
  const btn = (kind, refId) => allowed() ? `<button class="link" data-act="vault" data-id="${refId}" title="الباسوردات" style="white-space:nowrap">${has(kind, refId) ? '🔑 الباسورد' : '🔑 + باسورد'}</button>` : '';

  global.Vault = { FIELDS, allowed, unlock, lock, changeMaster, resetAll, has, read, write, section, bindSection, saveSection, open, btn, isOpen: () => !!KEY };
})(window);
