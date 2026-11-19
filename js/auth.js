/* =========================================================
   auth.js — تسجيل الدخول وإدارة المستخدمين
   تنبيه: هذا دخول على مستوى المتصفح فقط (البيانات نفسها محلية)،
   ويُستبدل بنظام دخول حقيقي (Firebase Auth / خادم الـ CRM) عند الربط.
   ========================================================= */
(function (global) {
  'use strict';
  const SESSION_KEY = 'crm_finance_session';
  const U = global.U;

  async function hash(pw) {
    if (!global.crypto || !crypto.subtle) throw new Error('المتصفح لا يدعم التشفير المطلوب');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('crm-finance:' + pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function read() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function current() { const s = read(); return s && (DB.users || []).find(u => u.id === s.userId) || null; }

  // ---------- التحقق بخطوتين (TOTP — Google/Microsoft Authenticator) ----------
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function newSecret() { const b = crypto.getRandomValues(new Uint8Array(20)); let bits = '', out = ''; b.forEach(x => { bits += x.toString(2).padStart(8, '0'); }); for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]; return out; }
  function b32bytes(s) { let bits = ''; String(s).replace(/=+$/, '').toUpperCase().split('').forEach(c => { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }); const out = new Uint8Array(Math.floor(bits.length / 8)); for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2); return out; }
  async function totpAt(secret, step) {
    const key = await crypto.subtle.importKey('raw', b32bytes(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const msg = new ArrayBuffer(8), dv = new DataView(msg); dv.setUint32(0, Math.floor(step / 0x100000000)); dv.setUint32(4, step >>> 0);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)), o = h[19] & 15;
    return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, '0');
  }
  // بيرجع الـ step اللي اتطابق (±30 ثانية) أو null — ومفيش إعادة استخدام لنفس الكود
  async function totpVerify(secret, code, lastStep) {
    code = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(code)) return null;
    const now = Math.floor(Date.now() / 30000);
    for (const s of [now, now - 1, now + 1]) if ((!lastStep || s > lastStep) && await totpAt(secret, s) === code) return s;
    return null;
  }

  async function login(email, password, remember, code) {
    const u = (DB.users || []).find(x => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.passHash !== await hash(password)) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    if (u.mfaSecret) {
      if (!code) throw Object.assign(new Error('اكتب كود التحقق (6 أرقام) من تطبيق Authenticator'), { mfa: true });
      const st = await totpVerify(u.mfaSecret, code, u.mfaLastStep);
      if (!st) throw Object.assign(new Error('كود التحقق غلط أو اتستخدم قبل كده'), { mfa: true });
      u.mfaLastStep = st;
    }
    const s = JSON.stringify({ userId: u.id, at: new Date().toISOString() });
    try { sessionStorage.setItem(SESSION_KEY, s); if (remember) localStorage.setItem(SESSION_KEY, s); } catch (e) {}
    global.Core.audit('دخول', 'مستخدم', u.email); global.Store.save();
    return u;
  }
  function logout() { try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch (e) {} location.hash = ''; location.reload(); }

  // شعار SEG السداسي: إطار يُرسم + أعمدة صاعدة وخط اتجاه (رمز النمو المالي)
  function hexLogo(cls) {
    return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">
      <polygon class="hx-fill" points="50,4 90,27 90,73 50,96 10,73 10,27"/>
      <polygon class="hx-line" points="50,4 90,27 90,73 50,96 10,73 10,27"/>
      <g class="hx-mark"><rect x="30" y="56" width="9" height="16" rx="2"/><rect x="45.5" y="46" width="9" height="26" rx="2"/><rect x="61" y="36" width="9" height="36" rx="2"/>
      <polyline points="28,48 44,36 54,41 72,24"/><polyline points="64,24 72,24 72,32"/></g></svg>`;
  }

  // لوجو SEG الحقيقي: نسخة بيضاء للخلفيات الغامقة ونسخة ملونة للفاتحة
  function brandLogo() { const B = global.BRAND || {}, alt = U.esc(B.company || 'SEG'); return `<img class="logo-on-dark" src="${U.esc(B.logoWhite || B.logo || 'img/seg-logo-white.png')}" alt="${alt}"><img class="logo-on-light" src="${U.esc(B.logo || 'img/seg-logo.png')}" alt="${alt}">`; }

  function showLogin(onSuccess) {
    document.body.classList.add('locked');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wrap = document.createElement('div');
    wrap.className = 'login-wrap' + (reduce ? ' ready' : '');
    // مربعات تطفو وتدور في الخلفية
    const sq = Array.from({ length: 16 }, (_, i) => {
      const x = (i * 37 + 7) % 96, y = (i * 53 + 11) % 92, s = 10 + (i % 4) * 6;
      return `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;--d:${(i * 0.37).toFixed(2)}s;--t:${10 + (i % 5) * 3}s;--r:${i % 2 ? 1 : -1}"></i>`;
    }).join('');
    // هوية التطبيق (المالي / التسويق) تأتي من window.APP في الصفحة
    const A = Object.assign({ sub: 'FINANCE', t1: 'النظام', t2: 'المالي', tagline: '«أرقام واضحة.. قرارات أذكى»' }, global.APP || {});
    const tagline = A.tagline;
    const setup = !(DB.users || []).some(u => u.role === 'admin' && !u.disabled); // أول تشغيل: مفيش مدير ← إنشاء حساب المدير
    wrap.innerHTML = `
      <div class="login-bg" aria-hidden="true"><div class="lb-glow"></div><div class="lb-cols"></div><div class="lb-squares">${sq}</div></div>
      <div class="splash" title="اضغط للتخطي">
        <div class="sp-logo">${brandLogo()}</div>
        <div class="sp-dream"><span></span>Your Dream Begins Here<span></span></div>
        <div class="sp-sub">${A.sub}</div>
        <div class="sp-title">${A.t1} <em>${A.t2}</em></div>
        <div class="sp-tag">${tagline}</div>
        <div class="sp-bar"><i></i></div>
      </div>
      <div class="login-stage">
        <form class="login-card" novalidate>
          <div class="lc-head"><div class="lc-logo">${brandLogo()}</div><small>${A.sub}</small></div>
          <h1 class="lc-title">${A.t1} ${A.t2}<span class="dot"></span></h1>
          ${setup ? '<div class="login-hint" style="margin:0 0 10px">👋 أول تشغيل: اعمل حساب المدير بالإيميل بتاعك (جيميل) وباسورد تختاره. مفيش حسابات تجريبية.</div><label class="field"><span>الاسم</span><input name="fullname" id="setupName" required></label>' : ''}
          <label class="field"><span>البريد الإلكتروني</span><input type="email" name="email" id="loginEmail" autocomplete="username" required dir="ltr"></label>
          <label class="field"><span>كلمة المرور</span><input type="password" name="password" id="loginPass" autocomplete="${setup ? 'new-password' : 'current-password'}" required dir="ltr"></label>${setup ? '<label class="field"><span>تأكيد كلمة المرور</span><input type="password" name="password2" id="setupPass2" autocomplete="new-password" required dir="ltr"></label>' : ''}
          <label class="field lc-mfa" hidden><span>🔐 كود التحقق (Authenticator)</span><input type="text" name="mfa" id="loginMfa" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr"></label>
          <label class="field check"><input type="checkbox" name="remember" id="loginRemember"> تذكرني على هذا الجهاز</label>
          <div class="login-err" role="alert"></div>
          <button class="lc-btn" type="submit">${setup ? 'إنشاء حساب المدير والدخول' : 'دخول'}</button>
          <div class="lc-foot"><div class="lc-tools"><button type="button" class="lc-lang" data-lang-toggle data-no-i18n>${global.I18N && I18N.lang === 'en' ? 'العربية' : 'English'}</button><button type="button" class="lc-icon" data-theme-toggle aria-label="تبديل الوضع الليلي" title="الوضع الليلي">◐</button></div><span>${tagline}</span></div>
          ${A.hint ? '<div class="login-hint">' + A.hint + '</div>' : ''}
        </form>
        <div class="login-credit" dir="ltr"><span class="lc-code" aria-hidden="true">&lt;/&gt;</span><span>Developed by</span><b>Eng. Mahmoud Ebrahim</b></div>
      </div>`;
    document.body.appendChild(wrap);
    const f = wrap.querySelector('form');
    // الشاشة الافتتاحية ~3 ثوانٍ ثم يظهر كارت الدخول (أو فوراً عند الضغط)
    let done = reduce;
    const ready = () => { if (done) return; done = true; wrap.classList.add('ready'); setTimeout(() => f.email.focus(), 450); };
    if (reduce) f.email.focus(); else { setTimeout(ready, 3100); wrap.querySelector('.splash').addEventListener('click', ready); }
    document.addEventListener('keydown', function skip(e) { if (!done && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) { e.preventDefault(); ready(); } if (done) document.removeEventListener('keydown', skip); });
    wrap.querySelector('[data-theme-toggle]').onclick = () => { const b = document.getElementById('themeBtn'); if (b) b.click(); };
    wrap.querySelector('[data-lang-toggle]').onclick = () => global.I18N && I18N.toggle();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = f.querySelector('.lc-btn'); btn.disabled = true;
      try {
        if (setup) await createAdmin(f);
        const u = await login(f.email.value, f.password.value, f.remember.checked, f.mfa.value);
        wrap.classList.add('leaving');
        setTimeout(() => { wrap.remove(); document.body.classList.remove('locked'); onSuccess(u); }, reduce ? 0 : 420);
      } catch (err) {
        f.querySelector('.login-err').textContent = err.message;
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
        if (err.mfa) { f.querySelector('.lc-mfa').hidden = false; f.mfa.value = ''; f.mfa.focus(); } else f.password.select();
      }
      btn.disabled = false;
    });
  }

  // أول تشغيل: حساب المدير بإيميل وباسورد صاحب النظام (مش حسابات تجريبية)
  async function createAdmin(f) {
    const name = f.fullname.value.trim(), email = f.email.value.trim().toLowerCase(), pw = f.password.value;
    if (!name) throw new Error('اكتب اسمك');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('الإيميل مش صحيح');
    if (pw.length < 8) throw new Error('كلمة المرور 8 حروف على الأقل');
    if (pw !== f.password2.value) throw new Error('تأكيد كلمة المرور مش مطابق');
    if ((DB.users || []).some(u => u.role === 'admin' && !u.disabled)) return; // اتعمل خلاص
    DB.users = (DB.users || []).filter(u => u.email.toLowerCase() !== email);
    DB.users.push({ id: U.uid(), name, email, role: 'admin', passHash: await hash(pw), createdAt: new Date().toISOString() });
    global.Core.audit('إضافة', 'حساب المدير (أول تشغيل)', email); global.Store.save();
  }

  // نافذة إدارة المستخدمين (من الإعدادات)
  function manageUsers() {
    const me = current();
    const draw = m => {
      m.el.querySelector('.ulist').innerHTML = global.UI.table({ rows: DB.users, columns: [
        { label: 'الاسم', render: u => U.esc(u.name) + (me && u.id === me.id ? ' <span class="badge b-info"><i>•</i>أنت</span>' : '') },
        { label: 'البريد', render: u => `<span dir="ltr">${U.esc(u.email)}</span>` },
        { label: 'الصلاحية', render: u => (({ admin: 'مدير', accountant: 'محاسب', marketing: 'فريق التسويق', it: 'تقنية المعلومات', hr: 'الموارد البشرية', client: 'عميل (المنصة)' })[u.role] || 'محاسب') + (u.role === 'client' ? '<div class="muted small">' + U.esc(((DB.customers || []).find(c => c.id === u.customerId) || {}).name || '') + '</div>' : '') },
        { label: '', render: u => `<button class="link" data-pw="${u.id}">تغيير كلمة المرور</button>` + (me && u.id === me.id ? '' : `<button class="link danger" data-del="${u.id}">حذف</button>`) },
      ] });
    };
    global.UI.modal({
      title: 'المستخدمون', wide: true,
      body: `<div class="ulist"></div><h3>إضافة مستخدم</h3><div class="grid4">
        ${global.UI.field({ label: 'الاسم', name: 'name' })}${global.UI.field({ label: 'البريد', name: 'email', type: 'email' })}
        ${global.UI.field({ label: 'كلمة المرور', name: 'password', type: 'password', hint: '8 أحرف على الأقل' })}
        ${global.UI.field({ label: 'الصلاحية', name: 'role', type: 'select', options: [{ value: 'accountant', label: 'محاسب' }, { value: 'marketing', label: 'فريق التسويق (نظام التسويق فقط)' }, { value: 'it', label: 'تقنية المعلومات (نظام IT فقط)' }, { value: 'hr', label: 'الموارد البشرية (رحلة الموظف في نظام IT)' },{ value: 'client', label: 'عميل (منصة العملاء فقط)' }, { value: 'admin', label: 'مدير' }] })}
        ${global.UI.field({ label: 'العميل (لحساب المنصة)', name: 'customerId', type: 'select', options: global.UI.opt.customers('—') })}
      </div><button type="button" class="btn" data-add>+ إضافة</button>`,
      onOpen: m => {
        draw(m);
        m.el.addEventListener('click', async e => {
          try {
            if (e.target.closest('[data-add]')) {
              const d = global.UI.form(m.el);
              if (!d.name || !d.email) throw new Error('أدخل الاسم والبريد');
              if ((d.password || '').length < 8) throw new Error('كلمة المرور 8 أحرف على الأقل');
              if (DB.users.some(u => u.email.toLowerCase() === d.email.toLowerCase())) throw new Error('البريد مستخدم');
              if (d.role === 'client' && !d.customerId) throw new Error('اختر العميل المرتبط بحساب المنصة');
              DB.users.push({ id: U.uid(), name: d.name, email: d.email, role: d.role, customerId: d.role === 'client' ? d.customerId : '', passHash: await hash(d.password) });
              global.Core.audit('إضافة', 'مستخدم', d.email); global.Store.save(); global.UI.toast('تمت الإضافة');
              ['name', 'email', 'password'].forEach(k => { m.el.querySelector(`[name=${k}]`).value = ''; }); draw(m);
            }
            const pw = e.target.closest('[data-pw]');
            if (pw) {
              const u = DB.users.find(x => x.id === pw.dataset.pw);
              const np = prompt('كلمة المرور الجديدة لـ ' + u.email + ' (8 أحرف على الأقل):');
              if (np == null) return; if (np.length < 8) throw new Error('كلمة المرور قصيرة');
              u.passHash = await hash(np); global.Core.audit('تعديل', 'كلمة مرور', u.email); global.Store.save(); global.UI.toast('تم تغيير كلمة المرور');
            }
            const del = e.target.closest('[data-del]');
            if (del && confirm('حذف المستخدم؟')) { const u = DB.users.find(x => x.id === del.dataset.del); DB.users = DB.users.filter(x => x.id !== u.id); global.Core.audit('حذف', 'مستخدم', u.email); global.Store.save(); draw(m); }
          } catch (err) { global.UI.toast(err.message, 'err'); }
        });
      },
    });
  }

  // حسابات منصة العملاء لعميل معيّن (من صفحة العميل)
  function clientAccess(customerId) {
    const c = (DB.customers || []).find(x => x.id === customerId) || {};
    const list = () => DB.users.filter(u => u.role === 'client' && u.customerId === customerId);
    const draw = m => {
      m.el.querySelector('.calist').innerHTML = list().length ? global.UI.table({ rows: list(), columns: [
        { label: 'الاسم', render: u => U.esc(u.name) }, { label: 'البريد', render: u => `<span dir="ltr">${U.esc(u.email)}</span>` },
        { label: '', render: u => `<button class="link" data-pw="${u.id}">تغيير كلمة المرور</button><button class="link danger" data-del="${u.id}">إيقاف الحساب</button>` }] })
        : '<div class="empty">لا يوجد حساب منصة لهذا العميل بعد</div>';
    };
    global.UI.modal({
      title: 'منصة العملاء — ' + (c.name || ''),
      body: `<p class="muted small">العميل يدخل على <b dir="ltr">clients.html</b> ويشوف فواتيره وكشف حسابه، ويوافق على المحتوى، ويشوف تقرير حملاته. لا يرى أي بيانات لعملاء آخرين.</p>
        <div class="calist"></div><h3>حساب جديد</h3><div class="grid2">
        ${global.UI.field({ label: 'الاسم', name: 'name', value: c.name || '' })}${global.UI.field({ label: 'البريد', name: 'email', type: 'email', value: c.email || '' })}
        ${global.UI.field({ label: 'كلمة المرور', name: 'password', type: 'text', hint: '8 أحرف على الأقل — أرسلها للعميل بطريقة آمنة', attrs: 'dir="ltr" autocomplete="off"' })}
        </div><button type="button" class="btn" data-add>+ إنشاء الحساب</button>`,
      onOpen: m => {
        draw(m);
        m.el.addEventListener('click', async e => {
          try {
            if (e.target.closest('[data-add]')) {
              const d = global.UI.form(m.el);
              if (!d.name || !d.email) throw new Error('أدخل الاسم والبريد');
              if ((d.password || '').length < 8) throw new Error('كلمة المرور 8 أحرف على الأقل');
              if (DB.users.some(u => u.email.toLowerCase() === d.email.toLowerCase())) throw new Error('البريد مستخدم');
              DB.users.push({ id: U.uid(), name: d.name, email: d.email, role: 'client', customerId, passHash: await hash(d.password) });
              global.Core.audit('إضافة', 'حساب منصة عميل', d.email); global.Store.save(); global.UI.toast('تم إنشاء حساب المنصة');
              m.el.querySelector('[name=password]').value = ''; draw(m);
            }
            const pw = e.target.closest('[data-pw]');
            if (pw) {
              const u = DB.users.find(x => x.id === pw.dataset.pw);
              const np = prompt('كلمة المرور الجديدة لـ ' + u.email + ' (8 أحرف على الأقل):');
              if (np == null) return; if (np.length < 8) throw new Error('كلمة المرور قصيرة');
              u.passHash = await hash(np); global.Core.audit('تعديل', 'كلمة مرور', u.email); global.Store.save(); global.UI.toast('تم تغيير كلمة المرور');
            }
            const del = e.target.closest('[data-del]');
            if (del && confirm('إيقاف حساب المنصة؟ لن يستطيع العميل الدخول.')) { const u = DB.users.find(x => x.id === del.dataset.del); DB.users = DB.users.filter(x => x.id !== u.id); global.Core.audit('حذف', 'حساب منصة عميل', u.email); global.Store.save(); draw(m); }
          } catch (err) { global.UI.toast(err.message, 'err'); }
        });
      },
    });
  }

  global.Auth = { current, login, logout, showLogin, manageUsers, clientAccess, hash, brandLogo, newSecret, totpVerify, totpAt };
})(window);
