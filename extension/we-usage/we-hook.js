// جوه موقع WE (نفس سياق الصفحة): بيلقط ردود الموقع نفسه — الاستهلاك (queryFreeUnit) ونتيجة الدخول
// مبيبعتش أي طلب بنفسه؛ بيقرا اللي الموقع جابه.
(function () {
  const send = (kind, data) => window.postMessage({ __tpwe: kind, data }, '*');
  const check = (url, text) => {
    try {
      const u = String(url || '').toLowerCase();
      if (!/freeunit|userauthenticate/.test(u)) return;
      send(u.includes('userauthenticate') ? 'auth' : 'usage', typeof text === 'string' ? JSON.parse(text) : text);
    } catch (e) { /* مش JSON */ }
  };
  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__tpu = u; return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      const url = this.responseURL || this.__tpu;
      if (this.responseType === '' || this.responseType === 'text') check(url, this.responseText);
      else if (this.responseType === 'json') check(url, this.response);
    });
    return XS.apply(this, arguments);
  };
  const F = window.fetch;
  if (F) window.fetch = function () {
    return F.apply(this, arguments).then(r => { try { if (/freeunit|userauthenticate/i.test(r.url)) r.clone().text().then(t => check(r.url, t)); } catch (e) {} return r; });
  };
})();
