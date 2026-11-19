(async () => {
  const D = self.TPWE_DEFAULTS;
  const s = await chrome.storage.local.get(['pw', 'lines']);
  const pw = Object.assign({}, D.pw || {}, s.pw || {});
  // الخطوط (اليوزرز): أول مرة = اللي في config.js، وبعدها اللي اتحفظ من هنا (تقدر تزوّد وتمسح وتعدّل)
  let lines = (s.lines && s.lines.length ? s.lines : D.lines).map(l => ({ code: l.code, number: l.number, type: l.type || 'Internet', pw: pw[l.number] || '' }));
  const box = document.getElementById('lines'), msg = document.getElementById('msg');
  const q = v => String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const nextCode = () => 'NET-' + String(Math.max(0, ...lines.map(l => +(String(l.code).match(/(\d+)$/) || [0, 0])[1])) + 1).padStart(3, '0');
  const read = () => { lines = [...box.querySelectorAll('.line')].map(row => ({ code: row.dataset.code, number: row.querySelector('[data-u]').value.replace(/\D/g, ''), type: row.querySelector('[data-t]').value, pw: row.querySelector('[data-p]').value.trim() })); };
  function draw() {
    box.innerHTML = lines.map((l, i) => `<div class="line" data-code="${q(l.code)}"><div style="display:flex;justify-content:space-between;align-items:center"><b>${q(l.code)}</b>${lines.length > 1 ? `<span class="del" data-del="${i}" title="مسح الخط">✕ مسح</span>` : ''}</div>
      <label>اليوزر (رقم الخط — Service number)</label><input type="text" data-u value="${q(l.number)}" inputmode="numeric" autocomplete="off" placeholder="مثال: 0504033807">
      <label>نوع الخدمة (Service Type) — نفس اللي بتختاره في موقع WE</label><select data-t>${['Internet', 'WE OneHome', 'LandLine'].map(t => `<option ${t === l.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label>الباسورد</label><input type="password" data-p value="${q(l.pw)}" placeholder="(فاضي = هتكتبه إنت في موقع WE)" autocomplete="off"></div>`).join('');
  }
  draw();
  box.onclick = e => { const d = e.target.closest('[data-del]'); if (!d) return; read(); lines.splice(+d.dataset.del, 1); draw(); };
  document.getElementById('add').onclick = () => { read(); lines.push({ code: nextCode(), number: '', type: 'Internet', pw: '' }); draw(); box.querySelector('.line:last-child [data-u]').focus(); };
  document.getElementById('save').onclick = async () => {
    read();
    const bad = lines.find(l => !/^\d{8,12}$/.test(l.number)), dup = lines.find((l, i) => lines.findIndex(x => x.number === l.number) !== i);
    if (bad) { msg.style.color = '#b91c1c'; msg.textContent = 'رقم ' + bad.code + ' مش مظبوط (8–12 رقم)'; return; }
    if (dup) { msg.style.color = '#b91c1c'; msg.textContent = 'الرقم ' + dup.number + ' متكرر'; return; }
    const newPw = {}; lines.forEach(l => { if (l.pw) newPw[l.number] = l.pw; });
    await chrome.storage.local.set({ lines: lines.map(l => ({ code: l.code, number: l.number, type: l.type || 'Internet' })), pw: newPw });
    msg.style.color = '#0f766e'; msg.textContent = 'اتحفظ ✓ — ' + lines.length + ' خط · الزرار في النظام هيحدّثهم كلهم';
  };
})();
