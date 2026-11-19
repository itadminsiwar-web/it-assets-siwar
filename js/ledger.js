/* =========================================================
   ledger.js — محرك المحاسبة (قيد مزدوج)
   القيود لا تُخزَّن؛ تُولَّد من المستندات في كل مرة،
   فيستحيل أن يختلف دفتر الأستاذ عن المستندات.
   ========================================================= */
(function (global) {
  'use strict';
  const { SYS, accId, find } = global.Core;
  const U = global.U;

  // ---------- حساب إجماليات المستند ----------
  function lineCalc(l) {
    const qty = U.num(l.qty), price = U.num(l.price), disc = U.num(l.discount), rate = U.num(l.taxRate);
    const gross = qty * price;
    const net = gross * (1 - disc / 100);
    return { gross, net, tax: net * rate / 100 };
  }

  function docTotals(doc) {
    const lines = (doc.lines || []).map(l => Object.assign({}, l, lineCalc(l)));
    const subtotal = lines.reduce((a, l) => a + l.net, 0);
    let discount = U.num(doc.discount);
    if (doc.discountType === 'pct') discount = subtotal * discount / 100;
    discount = Math.min(discount, subtotal);
    const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
    let tax = lines.reduce((a, l) => a + l.tax, 0) * factor;
    const net = subtotal - discount;
    lines.forEach(l => { l.netAfter = l.net * factor; l.taxAfter = l.tax * factor; });
    // الاحتساب العكسي (خدمات مستوردة من مورد غير مقيم): المورد لا يحصّل ضريبة،
    // والمنشأة تثبت الضريبة مدخلات ومخرجات في نفس الوقت
    let rcTax = 0;
    if (doc.reverseCharge) { rcTax = net * U.num((global.DB || {}).settings ? DB.settings.vatRate : 15) / 100; tax = 0; lines.forEach(l => { l.tax = 0; l.taxAfter = 0; }); }
    const wht = U.round(net * U.num(doc.whtRate) / 100);
    return { lines, subtotal: U.round(subtotal), discount: U.round(discount), net: U.round(net), tax: U.round(tax), total: U.round(net + tax), rcTax: U.round(rcTax), wht, factor };
  }

  // ---------- حالة الفواتير ----------
  function invoicePaid(inv) {
    let paid = 0;
    DB.receipts.forEach(r => (r.allocations || []).forEach(a => { if (a.invoiceId === inv.id) paid += U.num(a.amount); }));
    return U.round(paid);
  }
  function invoiceCredited(inv) {
    return U.sum(DB.creditNotes.filter(c => c.invoiceId === inv.id), c => docTotals(c).total);
  }
  function invoiceInfo(inv) {
    const t = docTotals(inv);
    const paid = invoicePaid(inv), credited = invoiceCredited(inv);
    const outstanding = Math.max(0, U.round(t.total - paid - credited));
    let status;
    if (inv.status === 'draft') status = 'draft';
    else if (inv.status === 'void') status = 'void';
    else if (outstanding <= 0.005) status = 'paid';
    else if (inv.dueDate && inv.dueDate < U.today()) status = 'overdue';
    else if ((inv.installments || []).length && U.sum(inv.installments.filter(x => x.dueDate < U.today()), x => U.num(x.amount)) - (paid + credited) > 0.005) status = 'overdue';
    else if (paid + credited > 0) status = 'partial';
    else status = 'unpaid';
    return Object.assign({}, t, { paid, credited, outstanding, status });
  }
  function isPosted(doc) { return doc.status !== 'draft' && doc.status !== 'void'; }

  function billPaid(bill) {
    let paid = 0;
    DB.payments.forEach(p => (p.allocations || []).forEach(a => { if (a.billId === bill.id) paid += U.num(a.amount); }));
    return U.round(paid);
  }
  function billDebited(bill) { return U.sum((DB.debitNotes || []).filter(x => x.billId === bill.id), x => docTotals(x).total); }
  function billInfo(bill) {
    const t = docTotals(bill);
    const paid = U.round(billPaid(bill) + billDebited(bill));
    const payable = U.round(t.total - t.wht); // ما يُدفع للمورد بعد خصم ضريبة الاستقطاع
    const outstanding = Math.max(0, U.round(payable - paid));
    let status;
    if (bill.status === 'draft') status = 'draft';
    else if (bill.status === 'void') status = 'void';
    else if (outstanding <= 0.005) status = 'paid';
    else if (bill.dueDate && bill.dueDate < U.today()) status = 'overdue';
    else if (paid > 0) status = 'partial';
    else status = 'unpaid';
    return Object.assign({}, t, { paid, payable, outstanding, status });
  }

  // الأقساط: توزيع المدفوع على الأقساط بالترتيب
  function installmentsInfo(inv) {
    const info = invoiceInfo(inv);
    let pool = info.paid + info.credited;
    return (inv.installments || []).slice().sort(U.by('dueDate')).map((ins, i) => {
      const amt = U.num(ins.amount);
      const covered = Math.min(amt, Math.max(0, pool));
      pool -= amt;
      const remaining = U.round(amt - covered);
      let status = remaining <= 0.005 ? 'paid' : (ins.dueDate < U.today() ? 'overdue' : (covered > 0 ? 'partial' : 'unpaid'));
      return { n: i + 1, dueDate: ins.dueDate, amount: amt, covered: U.round(covered), remaining, status };
    });
  }

  // ---------- توليد القيود ----------
  function treasuryAcc(tid) { const t = find('treasuries', tid); return t ? t.accountId : accId(SYS.CASH); }

  // ---------- العملات ----------
  // الدفاتر بالعملة الأساسية (الريال). الخزائن يمكن أن تكون بعملة أخرى (جنيه، دولار)
  // وكل حركة عليها تُخزن المبلغ بعملة الخزينة (fxAmount) وسعر الصرف (fxRate = كم ريال للوحدة).
  function baseCur() { return (DB.settings.baseCurrency || 'SAR'); }
  function curOf(tid) { const t = find('treasuries', tid); return (t && t.currency) || baseCur(); }
  function isForeign(tid) { return curOf(tid) !== baseCur(); }
  function defaultRate(code) {
    if (!code || code === baseCur()) return 1;
    const c = (DB.settings.currencies || []).find(x => x.code === code);
    return c ? U.num(c.rate) : 1;
  }
  function curLabel(code) {
    if (!code || code === baseCur()) return DB.settings.currency;
    const c = (DB.settings.currencies || []).find(x => x.code === code);
    return c ? c.symbol || c.code : code;
  }

  function buildLedger() {
    const E = [];
    const push = (base, accountId, debit, credit) => {
      debit = U.round(debit); credit = U.round(credit);
      if (Math.abs(debit) < 0.005 && Math.abs(credit) < 0.005) return;
      E.push(Object.assign({}, base, { accountId, debit, credit }));
    };
    // حركة على خزينة: المبلغ بالريال للدفاتر + المبلغ بعملة الخزينة لكشفها
    const cash = (base, tid, debit, credit, fx) => {
      const foreign = isForeign(tid);
      const f = U.round(foreign && fx != null ? U.num(fx) : (debit || credit));
      push(Object.assign({}, base, { tid, fxD: debit ? f : 0, fxC: credit ? f : 0 }), treasuryAcc(tid), debit, credit);
    };
    const openDate = DB.settings.openingDate || '2000-01-01';

    // أرصدة افتتاحية
    DB.treasuries.forEach(t => {
      const v = U.num(t.opening); if (!v) return;
      const sar = U.round(v * (isForeign(t.id) ? U.num(t.openingRate) || defaultRate(t.currency) : 1));
      const b = { date: openDate, src: 'opening', srcId: t.id, no: 'افتتاحي', memo: 'رصيد افتتاحي - ' + t.name };
      cash(b, t.id, sar > 0 ? sar : 0, sar < 0 ? -sar : 0, Math.abs(v));
      push(b, accId(SYS.OPENING), sar < 0 ? -sar : 0, sar > 0 ? sar : 0);
    });
    DB.customers.forEach(c => {
      const v = U.num(c.opening); if (!v) return;
      const b = { date: openDate, src: 'opening', srcId: c.id, no: 'افتتاحي', memo: 'رصيد افتتاحي - ' + c.name, partyType: 'customer', partyId: c.id };
      push(b, accId(SYS.AR), v > 0 ? v : 0, v < 0 ? -v : 0);
      push(Object.assign({}, b, { partyType: null, partyId: null }), accId(SYS.OPENING), v < 0 ? -v : 0, v > 0 ? v : 0);
    });
    DB.suppliers.forEach(s => {
      const v = U.num(s.opening); if (!v) return;
      const b = { date: openDate, src: 'opening', srcId: s.id, no: 'افتتاحي', memo: 'رصيد افتتاحي - ' + s.name, partyType: 'supplier', partyId: s.id };
      push(b, accId(SYS.AP), v < 0 ? -v : 0, v > 0 ? v : 0);
      push(Object.assign({}, b, { partyType: null, partyId: null }), accId(SYS.OPENING), v > 0 ? v : 0, v < 0 ? -v : 0);
    });

    // فواتير المبيعات: من ح/ العملاء إلى ح/ الإيرادات + ضريبة المخرجات
    DB.invoices.filter(isPosted).forEach(inv => {
      const t = docTotals(inv); const c = find('customers', inv.customerId);
      const b = { date: inv.date, src: 'invoice', srcId: inv.id, no: inv.no, memo: 'فاتورة مبيعات - ' + (c ? c.name : ''), dueDate: inv.dueDate, projectId: inv.projectId || null };
      push(Object.assign({}, b, { partyType: 'customer', partyId: inv.customerId }), accId(SYS.AR), t.total, 0);
      const byAcc = {};
      t.lines.forEach(l => { const a = l.accountId || accId(SYS.SALES); byAcc[a] = (byAcc[a] || 0) + l.netAfter; });
      Object.keys(byAcc).forEach(a => push(b, a, 0, byAcc[a]));
      push(b, accId(SYS.VAT_OUT), 0, t.tax);
    });

    // إشعارات دائنة (مرتجعات): عكس الفاتورة، ومع الاسترداد النقدي إن وجد
    DB.creditNotes.forEach(cn => {
      const t = docTotals(cn); const c = find('customers', cn.customerId);
      const inv0 = cn.invoiceId ? find('invoices', cn.invoiceId) : null;
      const b = { date: cn.date, src: 'credit', srcId: cn.id, no: cn.no, memo: 'إشعار دائن - ' + (c ? c.name : ''), projectId: cn.projectId || (inv0 && inv0.projectId) || null };
      push(b, accId(SYS.SALES_RET), t.net, 0);
      push(b, accId(SYS.VAT_OUT), t.tax, 0);
      push(Object.assign({}, b, { partyType: 'customer', partyId: cn.customerId }), accId(SYS.AR), 0, t.total);
      if (cn.refundTreasuryId) {
        const rb = Object.assign({}, b, { memo: 'استرداد نقدي - ' + (c ? c.name : '') });
        push(Object.assign({}, rb, { partyType: 'customer', partyId: cn.customerId }), accId(SYS.AR), t.total, 0);
        cash(rb, cn.refundTreasuryId, 0, t.total, U.num(cn.refundFx) || t.total / defaultRate(curOf(cn.refundTreasuryId)));
      }
    });

    // سندات القبض
    DB.receipts.forEach(r => {
      const c = find('customers', r.customerId);
      const b = { date: r.date, src: 'receipt', srcId: r.id, no: r.no, memo: 'سند قبض - ' + (c ? c.name : '') + (r.notes ? ' - ' + r.notes : '') };
      cash(b, r.treasuryId, r.amount, 0, r.fxAmount);
      push(Object.assign({}, b, { partyType: 'customer', partyId: r.customerId }), accId(SYS.AR), 0, r.amount);
    });

    // فواتير المشتريات
    DB.bills.filter(isPosted).forEach(bl => {
      const t = docTotals(bl); const s = find('suppliers', bl.supplierId);
      const b = { date: bl.date, src: 'bill', srcId: bl.id, no: bl.no, memo: 'فاتورة مشتريات - ' + (s ? s.name : ''), dueDate: bl.dueDate, projectId: bl.projectId || null };
      const byAcc = {};
      t.lines.forEach(l => { const a = l.accountId || accId(SYS.PURCHASES); byAcc[a] = (byAcc[a] || 0) + l.netAfter; });
      Object.keys(byAcc).forEach(a => push(b, a, byAcc[a], 0));
      push(b, accId(SYS.VAT_IN), t.tax, 0);
      push(Object.assign({}, b, { partyType: 'supplier', partyId: bl.supplierId }), accId(SYS.AP), 0, t.total - t.wht);
      if (t.wht) push(Object.assign({}, b, { memo: 'ضريبة استقطاع - ' + (s ? s.name : '') }), accId(SYS.WHT), 0, t.wht);
      if (t.rcTax) {
        const rb = Object.assign({}, b, { memo: 'احتساب عكسي للضريبة - ' + (s ? s.name : ''), rc: true });
        push(rb, accId(SYS.VAT_IN), t.rcTax, 0); push(rb, accId(SYS.VAT_OUT), 0, t.rcTax);
      }
    });

    // إشعارات مدينة (مرتجعات مشتريات): عكس فاتورة المورد، مع استرداد نقدي اختياري
    (DB.debitNotes || []).forEach(dn => {
      const t = docTotals(dn); const s = find('suppliers', dn.supplierId);
      const bl0 = dn.billId ? find('bills', dn.billId) : null;
      const b = { date: dn.date, src: 'debit', srcId: dn.id, no: dn.no, memo: 'إشعار مدين - ' + (s ? s.name : ''), projectId: dn.projectId || (bl0 && bl0.projectId) || null };
      push(Object.assign({}, b, { partyType: 'supplier', partyId: dn.supplierId }), accId(SYS.AP), t.total, 0);
      const byAcc = {};
      t.lines.forEach(l => { const a = l.accountId || accId(SYS.PURCHASES); byAcc[a] = (byAcc[a] || 0) + l.netAfter; });
      Object.keys(byAcc).forEach(a => push(b, a, 0, byAcc[a]));
      push(b, accId(SYS.VAT_IN), 0, t.tax);
      if (dn.refundTreasuryId) {
        const rb = Object.assign({}, b, { memo: 'استرداد من المورد - ' + (s ? s.name : '') });
        cash(rb, dn.refundTreasuryId, t.total, 0, U.num(dn.refundFx) || t.total / defaultRate(curOf(dn.refundTreasuryId)));
        push(Object.assign({}, rb, { partyType: 'supplier', partyId: dn.supplierId }), accId(SYS.AP), 0, t.total);
      }
    });

    // سندات الصرف للموردين
    DB.payments.forEach(p => {
      const s = find('suppliers', p.supplierId);
      const b = { date: p.date, src: 'payment', srcId: p.id, no: p.no, memo: 'سند صرف - ' + (s ? s.name : '') + (p.notes ? ' - ' + p.notes : '') };
      push(Object.assign({}, b, { partyType: 'supplier', partyId: p.supplierId }), accId(SYS.AP), p.amount, 0);
      cash(b, p.treasuryId, 0, p.amount, p.fxAmount);
    });

    // المصروفات المباشرة
    DB.expenses.forEach(x => {
      const net = U.num(x.amount), tax = x.reverseCharge ? 0 : net * U.num(x.taxRate) / 100;
      const b = { date: x.date, src: 'expense', srcId: x.id, no: x.no, memo: 'مصروف' + (x.payee ? ' - ' + x.payee : '') + (x.notes ? ' - ' + x.notes : ''), projectId: x.projectId || null };
      push(b, x.accountId, net, 0);
      push(b, accId(SYS.VAT_IN), tax, 0);
      cash(b, x.treasuryId, 0, net + tax, U.num(x.fxAmount) * (1 + (x.reverseCharge ? 0 : U.num(x.taxRate)) / 100));
      if (x.reverseCharge) {
        const rc = net * U.num(DB.settings.vatRate) / 100, rb = Object.assign({}, b, { memo: 'احتساب عكسي للضريبة' + (x.payee ? ' - ' + x.payee : ''), rc: true });
        push(rb, accId(SYS.VAT_IN), rc, 0); push(rb, accId(SYS.VAT_OUT), 0, rc);
      }
    });

    // التحويلات بين الخزائن والبنوك
    DB.transfers.forEach(t => {
      const b = { date: t.date, src: 'transfer', srcId: t.id, no: t.no, memo: 'تحويل' + (t.notes ? ' - ' + t.notes : '') };
      // amount بعملة الخزينة المحوِّلة، toAmount بعملة المستلمة، sarAmount قيمته بالريال
      const sar = t.sarAmount != null ? U.num(t.sarAmount) : U.num(t.amount) * defaultRate(curOf(t.fromId));
      cash(b, t.toId, sar, 0, t.toAmount != null ? t.toAmount : t.amount);
      cash(b, t.fromId, 0, sar, t.amount);
      if (U.num(t.fee)) {
        const sarFee = t.sarFee != null ? U.num(t.sarFee) : U.num(t.fee) * defaultRate(curOf(t.fromId));
        push(b, accId(SYS.BANK_FEES), sarFee, 0); cash(b, t.fromId, 0, sarFee, t.fee);
      }
    });

    // القيود اليدوية
    DB.journals.forEach(j => {
      const b = { date: j.date, src: 'journal', srcId: j.id, no: j.no, memo: j.memo || 'قيد يومية', closing: !!j.closing };
      // fx0: سطر يعدّل القيمة بالريال فقط (فروق عملة) دون تغيير الرصيد بالعملة الأجنبية
      // fxAmount: المبلغ بعملة الخزينة الأجنبية لسطر على حسابها
      j.lines.forEach(l => {
        const d = U.num(l.debit), c = U.num(l.credit);
        const fx = l.fx0 ? { fxD: 0, fxC: 0 } : (l.fxAmount != null && l.fxAmount !== '' ? { fxD: d ? U.num(l.fxAmount) : 0, fxC: c ? U.num(l.fxAmount) : 0 } : {});
        push(Object.assign({}, b, { memo: l.note || b.memo, partyType: l.partyType || null, partyId: l.partyId || null }, fx), l.accountId, d, c);
      });
    });

    E.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return E;
  }

  // ---------- أرصدة الحسابات ----------
  function children(id) { return DB.accounts.filter(a => a.parentId === id); }
  function descendants(id) { const out = [id]; children(id).forEach(c => out.push(...descendants(c.id))); return out; }
  function isLeaf(id) { return children(id).length === 0; }

  // الرصيد بإشارة الطبيعة (موجب = رصيد طبيعي)
  function signed(acc, debit, credit) {
    return global.Core.ACCOUNT_TYPES[acc.type].normal === 'debit' ? debit - credit : credit - debit;
  }

  function accountTotals(E, from, to) {
    const m = {};
    E.forEach(e => {
      if (!U.inRange(e.date, from, to)) return;
      const x = m[e.accountId] || (m[e.accountId] = { debit: 0, credit: 0 });
      x.debit += e.debit; x.credit += e.credit;
    });
    return m;
  }
  function rollup(totals, accId_) {
    let d = 0, c = 0;
    descendants(accId_).forEach(id => { if (totals[id]) { d += totals[id].debit; c += totals[id].credit; } });
    return { debit: U.round(d), credit: U.round(c) };
  }
  function balanceOf(E, id, from, to) {
    const acc = find('accounts', id); const t = rollup(accountTotals(E, from, to), id);
    return U.round(signed(acc, t.debit, t.credit));
  }

  // ---------- أرصدة العملاء والموردين ----------
  function partyEntries(E, type, id) {
    const acc = type === 'customer' ? accId(SYS.AR) : accId(SYS.AP);
    return E.filter(e => e.accountId === acc && e.partyType === type && e.partyId === id);
  }
  function partyBalance(E, type, id, to) {
    const es = partyEntries(E, type, id).filter(e => !to || e.date <= to);
    const d = U.sum(es, e => e.debit), c = U.sum(es, e => e.credit);
    return U.round(type === 'customer' ? d - c : c - d);
  }
  function statement(E, type, id, from, to) {
    const es = partyEntries(E, type, id);
    let opening = 0; const rows = [];
    es.forEach(e => {
      const delta = type === 'customer' ? e.debit - e.credit : e.credit - e.debit;
      if (from && e.date < from) { opening += delta; return; }
      if (to && e.date > to) return;
      rows.push(Object.assign({}, e));
    });
    let bal = opening;
    rows.forEach(r => { bal += type === 'customer' ? r.debit - r.credit : r.credit - r.debit; r.balance = U.round(bal); });
    return { opening: U.round(opening), rows, closing: U.round(bal) };
  }

  // أعمار الديون: تطبيق الدائن على أقدم المدين (FIFO)
  function aging(E, type, asOf) {
    asOf = asOf || U.today();
    const list = type === 'customer' ? DB.customers : DB.suppliers;
    return list.map(p => {
      const es = partyEntries(E, type, p.id).filter(e => e.date <= asOf);
      const debts = [], credits = [];
      es.forEach(e => {
        const inc = type === 'customer' ? e.debit - e.credit : e.credit - e.debit;
        if (inc > 0) debts.push({ due: e.dueDate || e.date, amount: inc });
        else if (inc < 0) credits.push(-inc);
      });
      debts.sort(U.by('due'));
      let pool = credits.reduce((a, b) => a + b, 0);
      const b = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
      debts.forEach(d => {
        const take = Math.min(pool, d.amount); pool -= take;
        const rem = d.amount - take; if (rem <= 0.005) return;
        const late = U.daysBetween(d.due, asOf);
        if (late <= 0) b.current += rem; else if (late <= 30) b.d30 += rem; else if (late <= 60) b.d60 += rem; else if (late <= 90) b.d90 += rem; else b.d90p += rem;
      });
      Object.keys(b).forEach(k => b[k] = U.round(b[k]));
      const total = U.round(b.current + b.d30 + b.d60 + b.d90 + b.d90p - pool);
      return Object.assign({ party: p, total, advance: U.round(pool) }, b);
    }).filter(r => Math.abs(r.total) > 0.005 || r.advance > 0.005);
  }

  // ---------- التقارير ----------
  function trialBalance(E, from, to) {
    const before = from ? accountTotals(E, null, U.addDays(from, -1)) : {};
    const period = accountTotals(E, from, to);
    return DB.accounts.slice().sort(U.by('code')).filter(a => isLeaf(a.id)).map(a => {
      const o = before[a.id] || { debit: 0, credit: 0 }, p = period[a.id] || { debit: 0, credit: 0 };
      const ob = o.debit - o.credit, cb = ob + p.debit - p.credit;
      return { acc: a, openDr: ob > 0 ? ob : 0, openCr: ob < 0 ? -ob : 0, dr: U.round(p.debit), cr: U.round(p.credit), closeDr: U.round(cb > 0 ? cb : 0), closeCr: U.round(cb < 0 ? -cb : 0) };
    }).filter(r => r.openDr || r.openCr || r.dr || r.cr);
  }

  // قيود الإقفال (closing) تُستبعد من تقارير الأرباح حتى تظهر نتيجة السنة المقفلة،
  // وتُحتسب في الميزانية (includeClosing) حتى لا يتكرر الربح مع الأرباح المحتجزة
  function incomeStatement(E, from, to, includeClosing) {
    if (!includeClosing) E = E.filter(e => !e.closing);
    const t = accountTotals(E, from, to);
    const mk = type => DB.accounts.filter(a => a.type === type && isLeaf(a.id)).sort(U.by('code'))
      .map(a => ({ acc: a, amount: U.round(signed(a, (t[a.id] || {}).debit || 0, (t[a.id] || {}).credit || 0)) }))
      .filter(r => Math.abs(r.amount) > 0.005);
    const revenue = mk('revenue'), expense = mk('expense');
    const cogsIds = descendants(accId(SYS.COGS_ROOT) || '');
    const cogs = expense.filter(r => cogsIds.includes(r.acc.id)), opex = expense.filter(r => !cogsIds.includes(r.acc.id));
    const totalRev = U.sum(revenue, r => r.amount), totalExp = U.sum(expense, r => r.amount);
    const totalCogs = U.sum(cogs, r => r.amount), totalOpex = U.sum(opex, r => r.amount);
    return { revenue, expense, cogs, opex, totalRev, totalExp, totalCogs, totalOpex, gross: U.round(totalRev - totalCogs), profit: U.round(totalRev - totalExp) };
  }

  // ربحية المشاريع / الحملات
  function projectProfit(E, from, to) {
    E = E.filter(e => !e.closing);
    const m = {};
    const get = id => m[id] || (m[id] = { revenue: 0, cost: 0 });
    const types = {}; DB.accounts.forEach(a => types[a.id] = a.type);
    E.forEach(e => {
      if (!U.inRange(e.date, from, to)) return;
      const ty = types[e.accountId];
      if (ty === 'revenue') get(e.projectId || '').revenue += e.credit - e.debit;
      else if (ty === 'expense') get(e.projectId || '').cost += e.debit - e.credit;
    });
    return DB.projects.map(p => Object.assign({ project: p }, finish(m[p.id])))
      .concat(m[''] ? [Object.assign({ project: null }, finish(m['']))] : []);
    function finish(x) { x = x || { revenue: 0, cost: 0 }; const revenue = U.round(x.revenue), cost = U.round(x.cost); return { revenue, cost, profit: U.round(revenue - cost), margin: revenue ? Math.round((revenue - cost) / revenue * 100) : null }; }
  }

  // ربحية العملاء: صافي فواتيرهم − تكاليف المشاريع المرتبطة بهم
  function clientProfit(E, from, to) {
    const projCust = {}; DB.projects.forEach(p => { if (p.customerId) projCust[p.id] = p.customerId; });
    const types = {}; DB.accounts.forEach(a => types[a.id] = a.type);
    const m = {}; const get = id => m[id] || (m[id] = { revenue: 0, cost: 0, invoices: 0 });
    DB.invoices.filter(isPosted).filter(i => U.inRange(i.date, from, to)).forEach(i => { const x = get(i.customerId); x.revenue += docTotals(i).net; x.invoices++; });
    DB.creditNotes.filter(c => U.inRange(c.date, from, to)).forEach(c => { get(c.customerId).revenue -= docTotals(c).net; });
    E.forEach(e => { if (e.closing || !e.projectId || !projCust[e.projectId] || types[e.accountId] !== 'expense' || !U.inRange(e.date, from, to)) return; get(projCust[e.projectId]).cost += e.debit - e.credit; });
    return Object.keys(m).map(id => { const x = m[id]; const revenue = U.round(x.revenue), cost = U.round(x.cost);
      return { customer: find('customers', id), revenue, cost, profit: U.round(revenue - cost), margin: revenue ? Math.round((revenue - cost) / revenue * 100) : null, invoices: x.invoices };
    }).filter(r => r.customer).sort((a, b) => b.profit - a.profit);
  }

  // توقع التدفق النقدي للشهور القادمة
  function forecast(E, months) {
    months = months || 3;
    const today = U.today(), m0 = U.startOfMonth(today);
    const start = U.sum(DB.treasuries, t => treasuryBalance(E, t.id).sar);
    const keys = []; for (let i = 0; i < months; i++) keys.push(U.monthKey(U.addMonths(m0, i)));
    const end = U.addDays(U.addMonths(m0, months), -1);
    const B = { overdue: { key: 'overdue', inflow: 0, outflow: 0, items: [] } };
    keys.forEach(k => B[k] = { key: k, inflow: 0, outflow: 0, items: [] });
    const add = (date, amount, dir, label) => {
      if (amount <= 0.005) return; if (date > end) return;
      const b = date < today ? B.overdue : B[U.monthKey(date)]; if (!b) return;
      b[dir] += amount; b.items.push({ date, amount: U.round(amount), dir, label });
    };
    // تحصيلات متوقعة
    DB.invoices.filter(isPosted).forEach(inv => {
      const c = (find('customers', inv.customerId) || {}).name || '';
      const info = invoiceInfo(inv); if (info.outstanding <= 0.005) return;
      if ((inv.installments || []).length) installmentsInfo(inv).forEach(x => add(x.dueDate, x.remaining, 'inflow', `قسط ${x.n} - ${inv.no} - ${c}`));
      else add(inv.dueDate || inv.date, info.outstanding, 'inflow', `${inv.no} - ${c}`);
    });
    // فواتير دورية قادمة
    const step = { monthly: 1, quarterly: 3, yearly: 12 };
    DB.invoices.filter(i => i.recurring && i.recurring.active && i.recurring.next).forEach(inv => {
      const c = (find('customers', inv.customerId) || {}).name || ''; const total = docTotals(inv).total;
      let d = inv.recurring.next; let guard = 0;
      while (d <= end && guard++ < 40) { const due = U.addDays(d, U.num(DB.settings.dueDays)); if (d >= today) add(due > end ? end : due, total, 'inflow', `فاتورة دورية متوقعة - ${c}`); d = U.addMonths(d, step[inv.recurring.freq] || 1); }
    });
    // مدفوعات للموردين
    DB.bills.filter(isPosted).forEach(b => { const info = billInfo(b); add(b.dueDate || b.date, info.outstanding, 'outflow', `${b.no} - ${(find('suppliers', b.supplierId) || {}).name || ''}`); });
    // مصروفات شهرية متكررة: متوسط آخر 3 شهور مكتملة
    let past = 0; for (let i = 1; i <= 3; i++) { const f = U.addMonths(m0, -i), t = U.addDays(U.addMonths(f, 1), -1); past += U.sum(DB.expenses.filter(x => U.inRange(x.date, f, t)), x => U.num(x.amount) * (1 + (x.reverseCharge ? 0 : U.num(x.taxRate)) / 100)); }
    const avg = U.round(past / 3);
    const spentThisMonth = U.sum(DB.expenses.filter(x => x.date >= m0 && x.date <= today), x => U.num(x.amount) * (1 + (x.reverseCharge ? 0 : U.num(x.taxRate)) / 100));
    keys.forEach((k, i) => { const amt = i === 0 ? Math.max(0, avg - spentThisMonth) : avg; const b = B[k]; if (amt > 0) { b.outflow += amt; b.items.push({ date: k + '-15', amount: U.round(amt), dir: 'outflow', label: 'مصروفات تشغيلية متوقعة (متوسط آخر 3 شهور)' }); } });
    // ضريبة القيمة المضافة المستحقة (تُسدد خلال الشهر التالي)
    const vatDue = U.round(balanceOf(E, accId(SYS.VAT_OUT)) - balanceOf(E, accId(SYS.VAT_IN)));
    if (vatDue > 0 && keys[1]) { B[keys[1]].outflow += vatDue; B[keys[1]].items.push({ date: keys[1] + '-28', amount: vatDue, dir: 'outflow', label: 'سداد ضريبة القيمة المضافة المستحقة' }); }
    const whtDue = balanceOf(E, accId(SYS.WHT));
    if (whtDue > 0) { B[keys[0]].outflow += whtDue; B[keys[0]].items.push({ date: keys[0] + '-10', amount: whtDue, dir: 'outflow', label: 'توريد ضريبة الاستقطاع' }); }
    let bal = start;
    const rows = ['overdue'].concat(keys).map(k => { const b = B[k]; b.inflow = U.round(b.inflow); b.outflow = U.round(b.outflow); b.net = U.round(b.inflow - b.outflow); bal += b.net; b.balance = U.round(bal); b.items.sort(U.by('date')); return b; });
    return { start: U.round(start), rows, avgExpenses: avg };
  }

  // قيد إقفال السنة: تصفير الإيرادات والمصروفات وترحيل الصافي للأرباح المحتجزة
  function closingLines(E, year) {
    const from = year + '-01-01', to = year + '-12-31';
    const t = accountTotals(E.filter(e => !e.closing), from, to);
    const lines = []; let net = 0;
    DB.accounts.filter(a => (a.type === 'revenue' || a.type === 'expense') && isLeaf(a.id)).forEach(a => {
      const x = t[a.id]; if (!x) return; const bal = U.round(x.debit - x.credit); if (Math.abs(bal) < 0.005) return;
      lines.push({ accountId: a.id, debit: bal < 0 ? -bal : 0, credit: bal > 0 ? bal : 0, note: 'إقفال ' + a.name });
      net += bal;
    });
    net = U.round(net); // موجب = خسارة
    if (Math.abs(net) >= 0.005) lines.push({ accountId: accId(SYS.RETAINED), debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0, note: net < 0 ? 'ترحيل صافي ربح ' + year : 'ترحيل صافي خسارة ' + year });
    return { lines, profit: U.round(-net), date: to };
  }

  // ضريبة الاستقطاع حسب المورد
  function whtReport(E, from, to) {
    const rows = [];
    DB.bills.filter(isPosted).filter(b => U.inRange(b.date, from, to)).forEach(b => {
      const t = docTotals(b); if (!t.wht) return;
      rows.push({ bill: b, supplier: find('suppliers', b.supplierId), net: t.net, rate: U.num(b.whtRate), wht: t.wht });
    });
    const acc = accId(SYS.WHT);
    const paid = U.sum(E.filter(e => e.accountId === acc && U.inRange(e.date, from, to)), e => e.debit);
    return { rows, total: U.sum(rows, r => r.wht), paid };
  }

  function balanceSheet(E, asOf) {
    const t = accountTotals(E, null, asOf);
    const mk = type => DB.accounts.filter(a => a.type === type && isLeaf(a.id)).sort(U.by('code'))
      .map(a => ({ acc: a, amount: U.round(signed(a, (t[a.id] || {}).debit || 0, (t[a.id] || {}).credit || 0)) }))
      .filter(r => Math.abs(r.amount) > 0.005);
    const assets = mk('asset'), liabilities = mk('liability'), equity = mk('equity');
    const pl = incomeStatement(E, null, asOf, true).profit;
    const totalA = U.sum(assets, r => r.amount), totalL = U.sum(liabilities, r => r.amount), totalE = U.round(U.sum(equity, r => r.amount) + pl);
    return { assets, liabilities, equity, profit: pl, totalA, totalL, totalE, balanced: Math.abs(totalA - totalL - totalE) < 0.01 };
  }

  function vatReport(E, from, to) {
    const out = E.filter(e => e.accountId === accId(SYS.VAT_OUT) && U.inRange(e.date, from, to));
    const inp = E.filter(e => e.accountId === accId(SYS.VAT_IN) && U.inRange(e.date, from, to));
    const output = U.sum(out, e => e.credit - e.debit), input = U.sum(inp, e => e.debit - e.credit);
    return { out, inp, output, input, net: U.round(output - input) };
  }

  function monthlyPL(E, months) {
    const res = []; let m = U.startOfMonth(U.today());
    for (let i = months - 1; i >= 0; i--) {
      const from = U.addMonths(m, -i), to = U.addDays(U.addMonths(from, 1), -1);
      const is = incomeStatement(E, from, to);
      res.push({ key: U.monthKey(from), from, to, revenue: is.totalRev, expense: is.totalExp, profit: is.profit });
    }
    return res;
  }

  function salesBy(dim, from, to) {
    const m = {};
    DB.invoices.filter(isPosted).filter(i => U.inRange(i.date, from, to)).forEach(inv => {
      const t = docTotals(inv);
      if (dim === 'item') {
        t.lines.forEach(l => {
          const k = l.itemId || ('desc:' + l.desc);
          const x = m[k] || (m[k] = { key: k, label: (find('items', l.itemId) || {}).name || l.desc || '—', qty: 0, net: 0, count: 0 });
          x.qty += U.num(l.qty); x.net += l.netAfter; x.count++;
        });
      } else {
        const k = (dim === 'customer' ? inv.customerId : inv.repId) || 'none';
        const src = dim === 'customer' ? find('customers', k) : find('reps', k);
        const x = m[k] || (m[k] = { key: k, label: src ? src.name : 'بدون', qty: 0, net: 0, count: 0, total: 0 });
        x.net += t.net; x.total += t.total; x.count++;
      }
    });
    // خصم المرتجعات
    DB.creditNotes.filter(c => U.inRange(c.date, from, to)).forEach(cn => {
      const t = docTotals(cn);
      if (dim === 'item') t.lines.forEach(l => { const k = l.itemId || ('desc:' + l.desc); if (m[k]) m[k].net -= l.netAfter; });
      else {
        const inv = cn.invoiceId ? find('invoices', cn.invoiceId) : null;
        const k = (dim === 'customer' ? cn.customerId : inv && inv.repId) || 'none';
        if (m[k]) { m[k].net -= t.net; m[k].total -= t.total; }
      }
    });
    return Object.values(m).map(x => Object.assign(x, { net: U.round(x.net), total: U.round(x.total || 0) })).sort((a, b) => b.net - a.net);
  }

  // العمولات: نسبة المندوب × صافي المحصّل (بدون الضريبة) خلال الفترة
  function commissions(from, to) {
    return DB.reps.map(rep => {
      let collected = 0, base = 0;
      DB.receipts.filter(r => U.inRange(r.date, from, to)).forEach(r => (r.allocations || []).forEach(a => {
        const inv = find('invoices', a.invoiceId); if (!inv || inv.repId !== rep.id) return;
        const t = docTotals(inv); collected += U.num(a.amount);
        base += t.total ? U.num(a.amount) * t.net / t.total : 0;
      }));
      const sales = U.sum(DB.invoices.filter(i => isPosted(i) && i.repId === rep.id && U.inRange(i.date, from, to)), i => docTotals(i).net);
      return { rep, sales, collected: U.round(collected), base: U.round(base), rate: U.num(rep.commission), commission: U.round(base * U.num(rep.commission) / 100), target: U.num(rep.target) };
    });
  }

  function treasuryMovements(E, treasuryId, from, to) {
    const t = find('treasuries', treasuryId); if (!t) return { opening: 0, rows: [], closing: 0 };
    // المبالغ بعملة الخزينة (in/out)، مع قيمتها بالريال (debit/credit)
    const es = E.filter(e => e.accountId === t.accountId).map(e => Object.assign({}, e, { in: e.fxD != null ? e.fxD : e.debit, out: e.fxC != null ? e.fxC : e.credit }));
    let opening = 0, openingSar = 0; const rows = [];
    es.forEach(e => { if (from && e.date < from) { opening += e.in - e.out; openingSar += e.debit - e.credit; } else if (!to || e.date <= to) rows.push(e); });
    let bal = opening, sar = openingSar; rows.forEach(r => { bal += r.in - r.out; sar += r.debit - r.credit; r.balance = U.round(bal); r.balanceSar = U.round(sar); });
    return { currency: t.currency || baseCur(), opening: U.round(opening), openingSar: U.round(openingSar), rows, closing: U.round(bal), closingSar: U.round(sar), inflow: U.sum(rows, r => r.in), outflow: U.sum(rows, r => r.out) };
  }
  // رصيد الخزينة بعملتها وبالريال
  function treasuryBalance(E, tid) { const m = treasuryMovements(E, tid); return { fx: m.closing, sar: m.closingSar, currency: m.currency }; }

  function budgetVsActual(E, from, to) {
    E = E.filter(e => !e.closing);
    const months = Math.max(1, Math.round(U.daysBetween(from, U.addDays(to, 1)) / 30.4));
    const t = accountTotals(E, from, to);
    return DB.accounts.filter(a => (a.type === 'expense' || a.type === 'revenue') && isLeaf(a.id)).sort(U.by('code')).map(a => {
      const budget = U.round(U.num(DB.budgets[a.id]) * months);
      const actual = U.round(signed(a, (t[a.id] || {}).debit || 0, (t[a.id] || {}).credit || 0));
      return { acc: a, budget, actual, diff: U.round(budget - actual), pct: budget ? Math.round(actual / budget * 100) : null };
    }).filter(r => r.budget || r.actual);
  }

  // ---------- الفواتير الدورية ----------
  function dueRecurring(asOf) {
    asOf = asOf || U.today();
    return DB.invoices.filter(i => i.recurring && i.recurring.active && i.recurring.next && i.recurring.next <= asOf);
  }
  function generateRecurring(asOf) {
    asOf = asOf || U.today(); let n = 0;
    const step = { monthly: 1, quarterly: 3, yearly: 12 };
    dueRecurring(asOf).forEach(src => {
      let guard = 0;
      while (src.recurring.next <= asOf && guard++ < 36) {
        const date = src.recurring.next;
        if (!global.Core.isLocked(date)) {
          const copy = U.clone(src);
          Object.assign(copy, { id: U.uid(), no: global.Core.nextNo('invoice'), date, dueDate: U.addDays(date, U.num(DB.settings.dueDays)), status: 'issued', recurring: null, installments: [], fromRecurring: src.id, createdAt: new Date().toISOString() });
          DB.invoices.push(copy); global.Core.audit('إضافة', 'فاتورة دورية', copy.no, 'من ' + src.no); n++;
        }
        src.recurring.next = U.addMonths(date, step[src.recurring.freq] || 1);
      }
    });
    if (n || dueRecurring(asOf).length === 0) global.Store.save();
    return n;
  }

  global.Ledger = {
    lineCalc, docTotals, invoiceInfo, billInfo, installmentsInfo, isPosted,
    buildLedger, balanceOf, accountTotals, rollup, isLeaf, descendants, signed,
    partyBalance, statement, aging, trialBalance, incomeStatement, balanceSheet,
    vatReport, monthlyPL, salesBy, commissions, treasuryMovements, budgetVsActual,
    dueRecurring, generateRecurring, projectProfit, whtReport, treasuryBalance, clientProfit, forecast, closingLines,
    baseCur, curOf, isForeign, defaultRate, curLabel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
