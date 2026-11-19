/* =========================================================
   i18n.js — اللغة: عربي / English
   يترجم نصوص الواجهة وقت التشغيل (بدون تعديل باقي الملفات):
   أي نص يظهر في الصفحة يُبحث عن مقاطعه العربية في القاموس ويُستبدل.
   بيانات المستخدم (أسماء العملاء، الملاحظات...) لا تُترجم لأنها ليست في القاموس،
   والمستندات المطبوعة (ثنائية اللغة أصلاً) مستثناة.
   ========================================================= */
(function (global) {
  'use strict';
  const KEY = 'crm_finance_lang';
  let lang = 'ar';
  try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'ar'; } catch (e) {}
  // ?lang=en أو ?lang=ar في الرابط يختار اللغة ويحفظها
  const qp = (location.search.match(/[?&]lang=(en|ar)\b/) || [])[1];
  if (qp) { lang = qp; try { localStorage.setItem(KEY, qp); } catch (e) {} }

  const D = {
    // ---- عام / تنقل ----
    "النظام المالي": "Financial System", "لوحة التحكم": "Dashboard", "لوحة التحكم المالية": "Financial Dashboard", "عام": "General",
    "المبيعات": "Sales", "العملاء": "Customers", "عروض الأسعار": "Quotations", "فواتير المبيعات": "Sales Invoices", "سندات القبض": "Receipts",
    "المرتجعات / إشعارات دائنة": "Returns / Credit Notes", "الأقساط": "Installments", "المشاريع والحملات": "Projects & Campaigns", "الخدمات والباقات": "Services & Packages",
    "المندوبين والعمولات": "Sales Reps & Commissions", "المشتريات والمصروفات": "Purchases & Expenses", "الموردين": "Suppliers", "فواتير المشتريات": "Purchase Bills",
    "مرتجعات المشتريات": "Purchase Returns", "سندات الصرف": "Payment Vouchers", "المصروفات": "Expenses", "الخزينة والمحاسبة": "Treasury & Accounting",
    "الخزائن والبنوك": "Cash & Banks", "التحويلات": "Transfers", "دليل الحسابات": "Chart of Accounts", "قيود اليومية": "Journal Entries", "الموازنات": "Budgets",
    "التقارير": "Reports", "التقارير المالية": "Financial Reports", "النظام": "System", "الإعدادات والنسخ الاحتياطي": "Settings & Backup", "سجل العمليات": "Activity Log",
    "الإعدادات": "Settings", "خروج": "Log out", "تسجيل الخروج؟": "Log out?", "دخول": "Sign in", "تبديل الوضع الليلي": "Toggle dark mode", "الوضع الليلي": "Dark mode", "القائمة": "Menu",
    "بحث": "Search", "بحث في النظام": "Search the system", "بحث: عميل، رقم فاتورة، مبلغ": "Search: customer, invoice no., amount", "لا توجد نتائج": "No results",
    "حفظ": "Save", "إلغاء": "Cancel", "إغلاق": "Close", "تعديل": "Edit", "حذف": "Delete", "طباعة": "Print", "نسخ": "Duplicate", "إضافة": "Add", "تحميل": "Load",
    "لا توجد بيانات": "No data", "لا يوجد": "None", "لا توجد": "None", "الإجمالي": "Total", "الكل": "All", "نعم": "Yes", "لا": "No", "من": "From", "إلى": "To", "حتى": "until",
    "حدث خطأ": "An error occurred", "تم الحفظ": "Saved", "تم حفظ": "Saved", "تم الإلغاء": "Cancelled", "حقل مطلوب": "Required field", "متابعة؟": "Continue?", "متابعة رغم ذلك؟": "Continue anyway?",
    "اختر": "Select", "بدون": "None", "كل الحالات": "All statuses", "كل العملاء": "All customers", "كل الموردين": "All suppliers", "كل البنود": "All items", "كل العمليات": "All actions",
    "فترة مخصصة": "Custom period", "الشهر الحالي": "This month", "الشهر السابق": "Last month", "آخر 3 شهور": "Last 3 months", "السنة الحالية": "This year", "السنة السابقة": "Last year", "كل الفترات": "All periods",
    "التاريخ": "Date", "البيان": "Description", "الوصف": "Description", "ملاحظات": "Notes", "المرجع": "Reference", "الحالة": "Status", "النوع": "Type", "المبلغ": "Amount", "الاسم": "Name",
    "الهاتف": "Phone", "البريد": "Email", "البريد الإلكتروني": "Email", "العنوان": "Address", "المدينة": "City", "الدولة": "Country", "الشركة": "Company", "الكود": "Code", "رقم": "No.",
    "الرصيد": "Balance", "الصافي": "Net", "الضريبة": "VAT", "الخصم": "Discount", "الكمية": "Qty", "السعر": "Price", "النسبة": "Rate", "الفرق": "Difference", "التفاصيل": "Details", "تفاصيل": "Details",
    "مدين": "Debit", "دائن": "Credit", "وارد": "In", "منصرف": "Out", "داخل": "Inflow", "خارج": "Outflow", "الوارد": "Inflow", "المنصرف": "Outflow", "الفترة": "Period", "الشهر": "Month", "السنة": "Year",
    "اليوم": "Today", "يوم": "day", "أيام": "days", "شهر": "month", "شهور": "months", "شهور مكتملة": "full months", "أكثر من": "Over", "متأخر": "Overdue", "تأخير": "Delay",
    "الصلاحية": "Role", "مدير": "Admin", "محاسب": "Accountant", "مدير النظام": "System Administrator", "أنت": "You", "اضغط للتخطي": "Click to skip",
    "يناير": "Jan", "فبراير": "Feb", "مارس": "Mar", "أبريل": "Apr", "مايو": "May", "يونيو": "Jun", "يوليو": "Jul", "أغسطس": "Aug", "سبتمبر": "Sep", "أكتوبر": "Oct", "نوفمبر": "Nov", "ديسمبر": "Dec",
    "ينا": "Jan", "فبر": "Feb", "مار": "Mar", "أبر": "Apr", "ماي": "May", "يون": "Jun", "يول": "Jul", "أغس": "Aug", "سبت": "Sep", "أكت": "Oct", "نوف": "Nov", "ديس": "Dec",
    "ر.س": "SAR", "ج.م": "EGP", "ريال": "SAR", "ريال سعودي": "Saudi Riyal", "جنيه مصري": "Egyptian Pound", "دولار أمريكي": "US Dollar", "هللة": "halala",

    // ---- الدخول والمستخدمون ----
    "كلمة المرور": "Password", "تذكرني على هذا الجهاز": "Remember me on this device", "حساب تجريبي": "Demo account", "أرقام واضحة.. قرارات أذكى»": "Clear numbers.. smarter decisions»",
    "«أرقام واضحة.. قرارات أذكى»": "“Clear numbers.. smarter decisions”", "البريد الإلكتروني أو كلمة المرور غير صحيحة": "Incorrect email or password", "المتصفح لا يدعم التشفير المطلوب": "This browser doesn't support the required encryption",
    "المستخدمون": "Users", "المستخدمون وكلمات المرور": "Users & Passwords", "إضافة مستخدم": "Add user", "تغيير كلمة المرور": "Change password", "كلمة المرور الجديدة لـ": "New password for",
    "أحرف على الأقل": "characters minimum", "أحرف على الأقل)": "characters minimum)", "كلمة المرور قصيرة": "Password is too short", "أدخل الاسم والبريد": "Enter name and email", "البريد مستخدم": "Email already in use",
    "تمت الإضافة": "Added", "تم تغيير كلمة المرور": "Password changed", "حذف المستخدم؟": "Delete user?", "كلمة مرور": "password", "مستخدم": "User",

    // ---- لوحة التحكم ----
    "النقدية المتاحة": "Available cash", "مستحق على العملاء": "Receivables", "مستحق للموردين": "Payables", "إيرادات الشهر": "Revenue this month", "مصروفات الشهر": "Expenses this month",
    "صافي ربح الشهر": "Net profit this month", "المحصّل هذا الشهر": "Collected this month", "النقدية المتوقعة آخر الشهر القادم": "Expected cash end of next month", "تفاصيل التوقع": "Forecast details",
    "عن الشهر السابق": "vs last month", "هامش": "Margin", "خزينة/بنك": "cash/bank accounts", "فاتورة متأخرة": "overdue invoices", "الإيرادات والمصروفات": "Revenue & Expenses", "آخر 12 شهر": "last 12 months",
    "عرض كجدول": "View as table", "الإيرادات والمصروفات — آخر 12 شهر": "Revenue & Expenses — last 12 months", "آخر": "Last", "فاتورة دورية مستحقة الإصدار.": "recurring invoice(s) due.", "فواتير متأخرة": "Overdue invoices", "أعمار الديون": "Aging", "لا توجد فواتير متأخرة": "No overdue invoices", "أقساط مستحقة خلال": "Installments due within",
    "كل الأقساط": "All installments", "لا توجد أقساط مستحقة": "No installments due", "أكبر أرصدة العملاء": "Top customer balances", "لا توجد أرصدة": "No balances", "أرصدة الخزائن والبنوك": "Cash & bank balances",
    "التفاصيل": "Details", "يوجد": "There are", "فاتورة دورية مستحقة الإصدار": "recurring invoice(s) due", "توليدها الآن": "Generate now", "الفترات حتى": "Periods until", "مقفلة": "are locked",
    "النظام فارغ. ابدأ بإضافة عملاء وفواتير، أو": "The system is empty. Start by adding customers and invoices, or", "حمّل بيانات تجريبية": "load demo data", "لاستكشاف كل المزايا": "to explore all features",
    "عرض": "Quote", "انتهت صلاحيته": "has expired", "ينتهي": "expires", "حملة": "Campaign", "الإنفاق الإعلاني": "Ad spend", "من الميزانية المعتمدة": "of the approved budget", "تجاوز الميزانية!": "Over budget!",
    "فاتورة": "Invoice", "تحصيل": "Collect", "مصروف": "Expense", "صرف لمورد": "Pay supplier", "تم توليد": "Generated", "تم إصدار": "Issued",

    // ---- العملاء ----
    "عميل جديد": "New customer", "تعديل عميل": "Edit customer", "اسم العميل": "Customer name", "العميل": "Customer", "أرصدة العملاء وكشوف الحساب": "Customer balances & statements",
    "عدد العملاء": "Customers", "إجمالي المستحق على العملاء": "Total receivables", "متأخرات": "Overdue", "حد الائتمان": "Credit limit", "تجاوز": "Exceeded", "كشف حساب": "Statement",
    "لا يمكن حذف عميل له حركات": "Can't delete a customer with transactions", "حذف العميل": "Delete customer", "الرقم الضريبي (VAT)": "VAT number", "الرقم الضريبي": "VAT number", "السجل التجاري": "Commercial reg. (CR)",
    "المندوب / مدير الحساب": "Sales rep / account manager", "رصيد افتتاحي (مدين": "Opening balance (debit", "المبلغ المستحق على العميل قبل بدء النظام. سالب": "Amount owed by the customer before go-live. Negative",
    "رصيد دائن له": "credit in their favor", "بدون حد": "no limit", "العنوان الوطني": "National address", "رقم المبنى، الشارع، الحي، الرمز البريدي": "Building no., street, district, postal code",
    "الرياض، جدة، الدمام": "Riyadh, Jeddah, Dammam", "وجوده يجعل الفاتورة": "When present, the invoice is a", "ضريبية قياسية": "standard tax invoice", "رقماً يبدأ وينتهي بـ": "digits starting and ending with",
    "رقماً يبدأ وينتهي بالرقم": "digits, starting and ending with", "تم حفظ العميل": "Customer saved", "العميل غير موجود": "Customer not found", "الرصيد الحالي": "Current balance", "إجمالي الفواتير": "Total invoiced",
    "إجمالي المحصل": "Total collected", "طباعة الكشف": "Print statement", "رصيد أول المدة": "Opening balance", "الإجمالي / رصيد آخر المدة": "Total / closing balance", "الفواتير المفتوحة": "Open invoices",
    "لا توجد فواتير مفتوحة": "No open invoices", "كشف حساب عميل": "Customer statement", "المستند": "Document", "الرقم الضريبي غير صحيح: يجب أن يكون": "Invalid VAT number: must be", "الرقم الضريبي غير صحيح": "Invalid VAT number",

    // ---- الخدمات ----
    "صنف جديد": "New item", "صنف / خدمة جديدة": "New item / service", "تعديل صنف": "Edit item", "النوع (خدمة/منتج/باقة)": "Type (service/product/package)", "خدمة": "Service", "منتج": "Product",
    "باقة / اشتراك شهري": "Package / monthly subscription", "إعادة فوترة (إنفاق إعلاني)": "Rebilling (ad spend)", "كود / SKU": "Code / SKU", "الوحدة": "Unit", "قطعة، ساعة، شهر": "piece, hour, month",
    "سعر البيع": "Selling price", "التكلفة / سعر الشراء": "Cost / purchase price", "حساب الإيراد": "Revenue account", "الافتراضي (إيرادات المبيعات)": "Default (sales revenue)", "خاضع للضريبة": "Taxable", "نشط": "Active",
    "التكلفة": "Cost", "هامش الربح": "Profit margin", "المبيعات (صافي)": "Sales (net)", "موقوف": "Inactive", "حذف الصنف؟ (الفواتير السابقة لن تتأثر)": "Delete item? (past invoices are not affected)",
    "باقات الإدارة الشهرية، رسوم إدارة الحملات، الإنتاج، التصميم": "Monthly management packages, campaign fees, production, design", "اشتراك": "Subscription", "باقة": "Package",

    // ---- المندوبين ----
    "مندوب جديد": "New rep", "تعديل مندوب": "Edit rep", "نسبة العمولة": "Commission rate", "التارجت الشهري (مبيعات)": "Monthly target (sales)", "تُحسب على صافي المحصّل (بدون الضريبة)": "Calculated on net collections (excl. VAT)",
    "العمولة": "Commission", "صافي المبالغ المحصلة من فواتير المندوب خلال الفترة": "net amounts collected from the rep's invoices in the period", "العمولات المستحقة": "Commissions due", "المندوب": "Sales rep",
    "تحقيق التارجت": "Target achievement", "المحصّل": "Collected", "أساس العمولة": "Commission base", "صرف العمولة": "Pay commission", "أضف مندوبين واربطهم بالفواتير": "Add reps and link them to invoices",
    "المندوب مرتبط بفواتير": "Rep is linked to invoices", "حذف المندوب؟": "Delete rep?", "بدون مندوب": "No rep", "عمولة": "Commission",

    // ---- الفواتير ----
    "فاتورة جديدة": "New invoice", "فاتورة مبيعات جديدة": "New sales invoice", "تعديل فاتورة": "Edit invoice", "رقم الفاتورة": "Invoice no.", "تاريخ الاستحقاق": "Due date", "الاستحقاق": "Due",
    "صادرة (تُرحَّل للحسابات)": "Issued (posted)", "مسودة": "Draft", "صادرة": "Issued", "ملغاة": "Void", "مدفوعة": "Paid", "مدفوعة جزئياً": "Partially paid", "غير مدفوعة": "Unpaid", "متأخرة": "Overdue",
    "مُرسل": "Sent", "مقبول": "Accepted", "مرفوض": "Rejected", "تم التحويل لفاتورة": "Converted to invoice", "منتهي": "Expired", "رقم أمر الشراء / مرجع": "PO number / reference", "فاتورة دورية": "Recurring invoice",
    "شهرية": "Monthly", "ربع سنوية": "Quarterly", "سنوية": "Yearly", "خطة أقساط (اختياري)": "Installment plan (optional)", "عدد الأقساط": "No. of installments", "أول قسط": "First installment", "كل": "Every",
    "مقدم": "Down payment", "توليد الأقساط": "Generate installments", "مسح": "Clear", "الفاتورة تُسدد دفعة واحدة": "the invoice is paid in one payment", "ملاحظات تظهر في الفاتورة": "Notes shown on invoice",
    "الشروط والأحكام": "Terms & conditions", "الصنف / الخدمة": "Item / service", "إضافة بند": "Add line", "خصم إضافي": "Extra discount", "مبلغ": "Amount", "الإجمالي قبل الخصم": "Subtotal",
    "الإجمالي المستحق": "Amount due", "بند حر": "Free line", "حذف البند": "Remove line", "أضف بنداً واحداً على الأقل": "Add at least one line", "مجموع الأقساط": "Installments total",
    "لا يساوي إجمالي الفاتورة": "doesn't equal the invoice total", "تحذير: الفاتورة تتجاوز حد ائتمان العميل": "Warning: invoice exceeds the customer's credit limit", "الرصيد بعد الفاتورة": "Balance after invoice",
    "تنبيه: الرقم الضريبي للشركة غير مُدخل أو غير صحيح في الإعدادات، والفاتورة الضريبية تتطلبه. متابعة؟": "Warning: the company VAT number is missing or invalid in Settings, and tax invoices require it. Continue?",
    "تم حفظ الفاتورة": "Invoice saved", "تنبيه: الفاتورة عليها مدفوعات": "Note: this invoice has payments", "الفاتورة": "Invoice", "الفواتير": "Invoices", "المدفوع": "Paid", "المتبقي": "Remaining",
    "توليد": "Generate", "فاتورة دورية مستحقة": "recurring invoice(s) due", "تسجيل تحصيل": "Record payment", "إصدار الفاتورة": "Issue invoice", "مرتجع": "Return", "الفاتورة غير موجودة": "Invoice not found",
    "من عرض سعر": "from quote", "مرتجعات": "Returns", "المدفوعات": "Payments", "لا توجد مدفوعات": "No payments", "المرتجعات": "Returns", "القسط": "Installment", "المسدد": "Paid", "السند": "Voucher",
    "الطريقة": "Method", "الخزينة": "Account", "إلغاء الفاتورة؟ سيتم عكس أثرها المحاسبي": "Void the invoice? Its accounting effect will be reversed", "حذف الفاتورة نهائياً؟": "Permanently delete the invoice?",
    "احذف المدفوعات المرتبطة أو أصدر مرتجعاً بدلاً من الإلغاء": "Delete linked payments or issue a return instead of voiding", "دورية": "Recurring", "أقساط": "Installments", "فاتورة ضريبية": "Tax invoice",
    "فاتورة ضريبية مبسطة": "Simplified tax invoice", "جدول الأقساط": "Installment schedule", "الشروط": "Terms", "توقيع المستلم": "Recipient signature", "الختم والتوقيع": "Stamp & signature",
    "المشروع / الحملة": "Project / campaign", "الإجمالي غير شامل الضريبة": "Total excl. VAT", "الإجمالي الخاضع للضريبة": "Taxable amount", "الإجمالي شامل الضريبة": "Total incl. VAT", "ضريبة القيمة المضافة": "VAT",

    // ---- عروض الأسعار ----
    "عرض سعر": "Quotation", "عرض سعر جديد": "New quotation", "تعديل عرض سعر": "Edit quotation", "صالح حتى": "Valid until", "الموضوع": "Subject", "تم حفظ العرض": "Quotation saved", "قيمة العروض": "Quotes value",
    "عروض ناجحة": "Won quotes", "نسبة التحويل": "Conversion rate", "محوّل لفاتورة": "Converted", "حذف العرض؟": "Delete quotation?", "مقدم إلى": "Prepared for",

    // ---- القبض ----
    "سند قبض": "Receipt", "سند قبض جديد": "New receipt", "تعديل سند قبض": "Edit receipt", "تحصيلات العملاء": "Customer collections", "المبلغ بالريال": "Amount (SAR)", "الخزينة / البنك": "Cash / bank account",
    "طريقة الدفع": "Payment method", "رقم الشيك / المرجع": "Cheque no. / reference", "تاريخ استحقاق الشيك": "Cheque date", "توزيع المبلغ على الفواتير": "Allocate to invoices", "توزيع تلقائي (الأقدم أولاً)": "Auto-allocate (oldest first)",
    "أي مبلغ غير موزع يُسجَّل كرصيد دائن (دفعة مقدمة) في حساب العميل": "Any unallocated amount is recorded as a customer credit (advance)", "لا توجد فواتير مفتوحة لهذا العميل": "No open invoices for this customer",
    "المبلغ المسدد": "Amount paid", "الموزع": "Allocated", "غير موزع": "Unallocated", "المبلغ المسدد لفاتورة أكبر من المتبقي عليها": "Payment for an invoice exceeds its remaining balance",
    "مجموع التوزيع أكبر من مبلغ السند": "Allocations exceed the voucher amount", "تم حفظ سند القبض": "Receipt saved", "طباعة السند؟": "Print voucher?", "استلمنا من السيد/ السادة": "Received from",
    "صرفنا إلى السيد/ السادة": "Paid to", "مبلغ وقدره": "The sum of", "وذلك عن": "For", "سداداً لـ": "In settlement of", "المستلم": "Received by", "المحاسب": "Accountant", "المدير": "Manager",
    "حذف سند القبض": "Delete receipt", "حذف السند؟": "Delete voucher?", "الفواتير": "Invoices", "سند صرف": "Payment voucher", "فقط": "Only", "لا غير": "only",

    // ---- المرتجعات ----
    "إشعار دائن": "Credit note", "إشعار دائن / مرتجع مبيعات": "Credit note / sales return", "المرتجعات والإشعارات الدائنة": "Returns & Credit Notes", "الفاتورة الأصلية": "Original invoice",
    "رد المبلغ نقداً من": "Refund in cash from", "خصم من رصيد العميل": "deduct from customer balance", "سبب المرتجع": "Return reason", "قيمة المرتجعات أكبر من قيمة الفاتورة": "Returns exceed the invoice value",
    "تم حفظ المرتجع": "Return saved", "التسوية": "Settlement", "رد نقدي": "Cash refund", "خصم من الرصيد": "Deduct from balance", "حذف الإشعار؟": "Delete note?", "السبب": "Reason", "سبب الإشعار": "Reason",
    "إشعار مدين": "Debit note", "إشعار مدين / مرتجع مشتريات": "Debit note / purchase return", "مرتجعات المشتريات / الإشعارات المدينة": "Purchase Returns / Debit Notes",
    "خصومات وإرجاعات من الموردين": "Discounts and returns from suppliers", "تخفض المستحق لهم أو تُسترد نقداً": "reduce payables or are refunded in cash", "فاتورة المورد الأصلية": "Original supplier bill",
    "استرداد نقدي إلى": "Cash refund to", "خصم من المستحق للمورد": "deduct from supplier payable", "خصم، استرداد إنفاق إعلاني غير مستخدم، خدمة لم تُنفذ": "Discount, unused ad spend refund, service not delivered",
    "نسخ بنود الفاتورة الأصلية؟": "Copy lines from the original bill?", "قيمة المرتجعات أكبر من قيمة فاتورة المورد": "Returns exceed the supplier bill value", "استرداد نقدي": "Cash refund", "خصم من المستحق": "Deduct from payable",
    "استرداد من المورد": "Refund from supplier",

    // ---- الأقساط ----
    "متابعة أقساط الفواتير المستحقة والقادمة": "Track due and upcoming invoice installments", "غير المسددة": "Unpaid", "المتأخرة": "Overdue", "تستحق خلال": "Due within", "المسددة": "Paid", "عدد الأقساط ": "Installments",
    "قيمة القسط": "Installment amount", "لا توجد أقساط": "No installments", "قسط": "Installment",

    // ---- المشاريع ----
    "مشروع / حملة": "Project / campaign", "مشروع / حملة جديدة": "New project / campaign", "تعديل مشروع": "Edit project", "اسم المشروع / الحملة": "Project / campaign name", "مثال: حملة رمضان - مطاعم الشيف": "e.g. Ramadan campaign - Chef restaurants",
    "بدون عميل (داخلي)": "No customer (internal)", "نوع الخدمة": "Service type", "تاريخ البداية": "Start date", "تاريخ النهاية": "End date", "قيمة العقد (قبل الضريبة)": "Contract value (excl. VAT)",
    "الميزانية الإعلانية المعتمدة": "Approved ad budget", "للمقارنة مع الإنفاق الإعلاني الفعلي": "To compare with actual ad spend", "مدير المشروع": "Project manager", "المنصات": "Platforms",
    "ربحية كل حملة": "Each campaign's profitability", "إيرادات فواتيرها": "its invoice revenue", "المؤثرين": "influencers", "الفريلانسرز": "freelancers", "أي تكلفة مربوطة بها)": "any linked cost)",
    "مشاريع جارية": "Active projects", "إيرادات المشاريع": "Project revenue", "تكاليف المشاريع": "Project costs", "ربح المشاريع": "Project profit", "الربحية": "Profitability",
    "لا توجد مشاريع بعد": "No projects yet", "أضف مشروعاً واربطه بالفواتير والمصروفات": "add a project and link it to invoices and expenses", "غير مرتبط بمشروع (مصروفات عامة)": "Not linked to a project (overheads)",
    "قيمة العقد": "Contract value", "الإيراد": "Revenue", "الربح": "Profit", "الهامش": "Margin", "المشروع مرتبط بمستندات": "Project is linked to documents", "غيّر حالته إلى": "change its status to", "مغلق": "Closed",
    "بدلاً من حذفه": "instead of deleting it", "حذف المشروع؟": "Delete project?", "المشروع غير موجود": "Project not found", "فاتورة للمشروع": "Invoice for project", "تكلفة (فاتورة مورد)": "Cost (supplier bill)",
    "تمت فوترة": "Invoiced", "الإنفاق الإعلاني / الميزانية": "Ad spend / budget", "توزيع التكاليف": "Cost breakdown", "البند": "Item", "لا توجد تكاليف": "No costs", "فواتير المشروع": "Project invoices",
    "التكاليف المسجلة": "Recorded costs", "الجهة / البند": "Party / item", "المبلغ (قبل الضريبة)": "Amount (excl. VAT)", "جارٍ": "Active", "مكتمل": "Completed", "متوقف": "On hold", "المشروع": "Project",
    "بدون مشروع": "No project", "لحساب ربحية الحملة": "to calculate campaign profitability", "مشروع": "Project",
    "إدارة حسابات التواصل الاجتماعي": "Social media management", "حملة إعلانية مدفوعة": "Paid ad campaign", "إنتاج محتوى وتصوير": "Content production & photography", "هوية بصرية وتصميم": "Branding & design",
    "تسويق عبر المؤثرين": "Influencer marketing", "SEO وتطوير مواقع": "SEO & web development", "فعالية / إطلاق منتج": "Event / product launch", "استشارات تسويقية": "Marketing consulting", "أخرى": "Other",

    // ---- الموردين والمشتريات ----
    "مورد جديد": "New supplier", "تعديل مورد": "Edit supplier", "اسم المورد": "Supplier name", "المورد": "Supplier", "جهة الاتصال": "Contact person", "الرقم الضريبي (للمورد السعودي)": "VAT no. (Saudi supplier)",
    "السعودية، مصر، أيرلندا": "Saudi Arabia, Egypt, Ireland", "مورد غير مقيم (خارج المملكة)": "Non-resident supplier (outside KSA)", "خدماته خاضعة للاحتساب العكسي": "Services subject to reverse charge",
    "نسبة ضريبة الاستقطاع الافتراضية": "Default withholding tax rate", "لغير المقيمين فقط": "non-residents only", "راجع النسبة الصحيحة لنوع الخدمة مع المحاسب": "confirm the correct rate for the service type with your accountant",
    "رصيد افتتاحي (دائن": "Opening balance (credit", "المستحق للمورد قبل بدء النظام": "Amount owed to supplier before go-live", "الحساب البنكي": "Bank account", "عدد الموردين": "Suppliers",
    "إجمالي المستحق للموردين": "Total payables", "الرصيد المستحق": "Balance due", "لا يمكن حذف مورد له حركات": "Can't delete a supplier with transactions", "حذف المورد؟": "Delete supplier?",
    "المورد غير موجود": "Supplier not found", "المستحق للمورد": "Owed to supplier", "فواتير مفتوحة": "Open bills", "كشف حساب مورد": "Supplier statement", "فاتورة مشتريات": "Purchase bill",
    "فاتورة مشتريات جديدة": "New purchase bill", "رقم فاتورة المورد": "Supplier invoice no.", "معتمدة (تُرحَّل)": "Approved (posted)", "ضريبة استقطاع": "Withholding tax", "تُخصم من المدفوع للمورد غير المقيم": "Deducted from payments to non-resident suppliers",
    "احتساب عكسي (خدمة مستوردة)": "Reverse charge (imported service)", "في الاحتساب العكسي: المورد لا يضيف ضريبة، ويُسجَّل": "With reverse charge, the supplier adds no VAT and",
    "مدخلات ومخرجات تلقائياً (أثرها صفر على المستحق، وتظهر في الإقرار)": "is recorded automatically as input and output VAT (zero net effect, shown on the return)",
    "الإجمالي الجديد أقل من المدفوع على الفاتورة": "New total is less than the amount already paid", "إجمالي المشتريات": "Total purchases", "غير مسددة": "Unpaid", "مسددة": "Paid", "سداد": "Pay",
    "استقطاع": "WHT", "سند صرف لمورد": "Supplier payment voucher", "مدفوعات الموردين": "Supplier payments", "من خزينة / بنك": "From cash / bank", "توزيع على فواتير المورد": "Allocate to supplier bills",
    "توزيع تلقائي": "Auto-allocate", "المبلغ أكبر من المتبقي على الفاتورة": "Amount exceeds the bill's remaining balance", "أقل من المطلوب": "is less than required",
    "مصروفات": "Expenses", "تسجيل مصروف": "Record expense", "تعديل مصروف": "Edit expense", "بند المصروف": "Expense category", "اختر الحساب": "Select account", "دُفع من": "Paid from",
    "المبلغ بالريال (قبل الضريبة)": "Amount in SAR (excl. VAT)", "فقط لو معك فاتورة ضريبية سعودية (تُخصم كمدخلات). مصروفات مصر": "Only with a Saudi tax invoice (claimed as input VAT). Egypt expenses",
    "احتساب عكسي": "Reverse charge", "اشتراكات وبرامج من خارج المملكة": "Subscriptions & software from outside KSA", "المستفيد": "Payee", "رقم الإيصال / المرجع": "Receipt no. / reference",
    "المصروفات النثرية والتشغيلية المدفوعة مباشرة": "Petty and operating expenses paid directly", "إجمالي المصروفات": "Total expenses", "تم تسجيل المصروف": "Expense recorded", "حذف المصروف؟": "Delete expense?",
    "أدخل المبلغ بعملة الخزينة": "Enter the amount in the account currency", "الخزينة بعملة": "Account currency", "المبلغ بالريال يُحسب تلقائياً": "SAR amount is calculated automatically", "المبلغ بـ": "Amount in",
    "سعر الصرف (ريال لكل": "Exchange rate (SAR per", "اختر المورد": "Select supplier", "اختر العميل": "Select customer",

    // ---- الخزائن ----
    "خزينة / بنك": "Cash / bank", "خزينة / حساب بنكي جديد": "New cash / bank account", "حساب بنكي": "Bank account", "خزينة نقدية": "Cash box", "محفظة إلكترونية": "E-wallet", "العملة": "Currency",
    "اسم البنك": "Bank name", "رقم الحساب / IBAN": "Account no. / IBAN", "رصيد افتتاحي (بعملة الحساب)": "Opening balance (account currency)", "سعر الصرف للرصيد الافتتاحي": "Opening balance exchange rate",
    "ريال لكل وحدة": "SAR per unit", "للعملات الأجنبية فقط": "foreign currencies only", "بتاريخ بداية النظام": "as of go-live date", "لا يمكن تغيير العملة بعد وجود حركات": "Currency can't change after transactions exist",
    "اختر الجنيه لحسابات وخزينة فريق مصر": "Choose EGP for the Egypt team's accounts", "مثال: الراجحي - جاري، خزينة مكتب القاهرة": "e.g. Al Rajhi - current, Cairo office cash",
    "الأرصدة بعملة كل حساب": "Balances in each account's currency", "قيمتها الدفترية بالريال": "their book value in SAR", "تحويل بين الحسابات": "Transfer between accounts", "إجمالي النقدية (بالريال)": "Total cash (SAR)",
    "إجمالي أرصدة": "Total balances in", "بسعر اليوم": "at today's rate", "القيمة الدفترية": "Book value", "وارد الشهر": "In this month", "منصرف الشهر": "Out this month", "الحركة والتسوية": "Activity & reconciliation",
    "لا يمكن حذف خزينة عليها حركات": "Can't delete an account with transactions", "رصيد آخر المدة": "Closing balance", "دفترياً": "book", "فروق العملة": "Currency differences", "الرصيد": "Balance",
    "سعر اليوم": "today's rate", "تسجيل قيد فروق العملة": "Record FX revaluation entry", "غيّر سعر اليوم من الإعدادات": "Change today's rate in Settings", "العملات. القيد يعدّل قيمة الحساب بالريال فقط دون تغيير رصيده بالـ": "Currencies. The entry adjusts the SAR value only, without changing its balance in",
    "تسوية بنكية": "Bank reconciliation", "علّم الحركات التي ظهرت في كشف البنك، ثم أدخل رصيد الكشف لمعرفة الفرق": "Tick the transactions that appear on the bank statement, then enter the statement balance to see the difference",
    "رصيد كشف البنك في": "Bank statement balance on", "الرصيد المسوّى بالدفاتر": "Reconciled book balance", "حركة الحساب": "Account activity", "لا توجد حركات": "No transactions", "بالريال": "in SAR", "تمت التسوية": "Reconciled",
    "تسجيل فرق عملة": "Record FX difference", "تم تسجيل قيد فروق العملة": "FX revaluation entry recorded", "إعادة تقييم": "Revaluation", "أرباح فروق عملة": "FX gains", "خسائر فروق عملة": "FX losses", "فروق عملة": "FX difference",
    "تحويل بين الخزائن والبنوك": "Transfer between accounts", "المبلغ المحوَّل (بعملة المصدر)": "Amount sent (source currency)", "عمولة التحويل (بعملة المصدر)": "Transfer fee (source currency)",
    "تُسجل كمصروف بنكي": "recorded as a bank charge", "مثال: تحويل رواتب فريق مصر": "e.g. Egypt team salaries transfer", "المبلغ المستلم بـ": "Amount received in", "سعر التحويل الفعلي": "Actual exchange rate",
    "اختر حسابين مختلفين": "Choose two different accounts", "أدخل المبلغ المستلم": "Enter the received amount", "تم التحويل": "Transfer done", "بين الحسابات وبين العملات (مثلاً من البنك السعودي لحساب فريق مصر)": "Between accounts and currencies (e.g. from the Saudi bank to the Egypt team account)",
    "المستلم": "Received", "حذف التحويل؟": "Delete transfer?", "تحويل": "Transfer", "تحويل بنكي": "Bank transfer", "نقدي": "Cash", "مدى": "mada", "بطاقة ائتمانية": "Credit card", "شيك": "Cheque",
    "إنستاباي (مصر)": "InstaPay (Egypt)", "فودافون كاش (مصر)": "Vodafone Cash (Egypt)", "تحويل دولي / ويسترن يونيون": "International transfer / Western Union", "الصندوق الرئيسي": "Main cash box",

    // ---- الحسابات والقيود ----
    "حساب جديد": "New account", "تعديل حساب": "Edit account", "الحساب الرئيسي": "Parent account", "حساب رئيسي": "Top-level account", "يُقترح تلقائياً عند اختيار الحساب الرئيسي": "Suggested automatically when a parent is chosen",
    "اسم الحساب": "Account name", "الكود مستخدم": "Code already used", "لا يمكن أن يكون الحساب أباً لنفسه": "An account can't be its own parent", "شجرة الحسابات وأرصدتها الحالية": "Account tree and current balances",
    "الأستاذ": "Ledger", "احذف الحسابات الفرعية أولاً": "Delete sub-accounts first", "الحساب مستخدم في حركات": "Account is used in transactions", "يمكنك إيقافه بدلاً من حذفه": "you can deactivate it instead",
    "حذف الحساب": "Delete account", "أصول": "Assets", "خصوم": "Liabilities", "حقوق ملكية": "Equity", "إيرادات": "Revenue", "الحساب": "Account",
    "قيد يومية": "Journal entry", "قيد يومية جديد": "New journal entry", "تعديل قيد": "Edit entry", "قيد يدوي": "Manual entry", "القيود اليدوية": "Manual entries", "دفتر اليومية العام": "General journal",
    "دفتر اليومية": "Journal", "مدين (ريال)": "Debit (SAR)", "دائن (ريال)": "Credit (SAR)", "بعملة الخزينة": "In account currency", "سطر": "Line", "متوازن": "Balanced", "غير متوازن: الفرق": "Unbalanced: difference",
    "أمثلة: إيداع رأس مال، شراء أصل ثابت، إهلاك، تسوية، مسحوبات شخصية، قيد إقفال": "Examples: capital deposit, fixed asset purchase, depreciation, adjustment, drawings, closing entry",
    "القيد يحتاج سطرين على الأقل": "An entry needs at least two lines", "السطر الواحد إما مدين أو دائن": "Each line is either debit or credit", "القيد غير متوازن": "The entry is not balanced",
    "تم حفظ القيد": "Entry saved", "أدخل المبلغ بالـ": "Enter the amount in", "لسطر": "for line", "حذف القيد؟": "Delete entry?", "لا توجد قيود يدوية": "No manual entries", "لا توجد قيود": "No entries",
    "دفتر اليومية العام المُولّد تلقائياً من كل المستندات": "General journal generated automatically from all documents", "القيود": "Entries",
    "إقفال سنة مالية": "Close fiscal year", "إقفال السنة المالية": "Close the fiscal year", "ينشئ قيد إقفال بتاريخ": "Creates a closing entry dated",
    "ديسمبر يصفّر حسابات الإيرادات والمصروفات ويرحّل صافي الربح/الخسارة إلى": "Dec that zeroes revenue and expense accounts and transfers the net profit/loss to",
    "تقارير الأرباح تظل تعرض نتيجة السنة كما هي": "Profit reports still show the year's result as is", "إقفال الفترة أيضاً (منع التعديل حتى": "Also lock the period (no edits until",
    "صافي": "Net", "سطر في القيد": "lines in the entry", "إقفال السنة": "Close year", "مقفلة)": "closed)", "مقفلة بالفعل. احذف قيد الإقفال القديم أولاً إن أردت إعادة الإقفال": "is already closed. Delete the old closing entry first to close again",
    "لم تنتهِ بعد. متابعة الإقفال؟": "hasn't ended yet. Continue closing?", "لا توجد حركات إيرادات أو مصروفات في": "No revenue or expense transactions in", "تم إقفال السنة": "Year closed",
    "قيد إقفال السنة المالية": "Fiscal year closing entry", "قيد الإقفال لا يُعدّل": "Closing entries can't be edited", "احذفه وأعد الإقفال": "delete it and close again", "ترحيل صافي ربح": "Transfer net profit",
    "ترحيل صافي خسارة": "Transfer net loss", "إقفال": "Closing", "قيد فروق عملة": "FX revaluation entry",
    "الموازنات التقديرية": "Budgets", "حدد موازنة شهرية لكل بند وقارنها بالفعلي": "Set a monthly budget per line and compare with actuals", "حفظ الموازنة": "Save budget", "الموازنة مقابل الفعلي": "Budget vs Actual",
    "الموازنة الشهرية": "Monthly budget", "موازنة الفترة": "Period budget", "الفعلي": "Actual", "نسبة الاستهلاك": "Usage", "تم حفظ الموازنة": "Budget saved", "موازنة": "Budget", "الموازنة": "Budget",
    "الاستهلاك": "Usage", "تعديل الموازنات": "Edit budgets", "حدد الموازنات من صفحة الموازنات أولاً": "Set budgets on the Budgets page first",

    // ---- التقارير ----
    "قائمة الدخل (الأرباح والخسائر)": "Income Statement (P&L)", "الميزانية العمومية (المركز المالي)": "Balance Sheet", "ميزان المراجعة": "Trial Balance", "دفتر الأستاذ العام": "General Ledger",
    "التدفقات النقدية": "Cash Flow", "الأرباح الشهرية": "Monthly Profit", "أعمار ديون العملاء": "Receivables Aging", "أعمار مستحقات الموردين": "Payables Aging", "توقع التدفق النقدي": "Cash Flow Forecast",
    "إقرار ضريبة القيمة المضافة": "VAT Return", "ضريبة الاستقطاع": "Withholding Tax", "ربحية المشاريع والحملات": "Project & Campaign Profitability", "ربحية العملاء": "Customer Profitability", "تحليل المبيعات": "Sales Analysis",
    "طباعة / PDF": "Print / PDF", "الإيرادات": "Revenue", "إجمالي الإيرادات": "Total revenue", "التكاليف المباشرة للحملات": "Direct campaign costs", "إجمالي التكاليف المباشرة": "Total direct costs",
    "مجمل الربح": "Gross profit", "المصروفات التشغيلية والإدارية": "Operating & admin expenses", "إجمالي المصروفات التشغيلية": "Total operating expenses", "صافي الربح": "Net profit", "صافي الخسارة": "Net loss",
    "هامش صافي الربح": "Net profit margin", "الأصول": "Assets", "إجمالي الأصول": "Total assets", "الخصوم": "Liabilities", "إجمالي الخصوم": "Total liabilities", "حقوق الملكية": "Equity",
    "أرباح (خسائر) متراكمة غير مُقفلة": "Unclosed accumulated profit (loss)", "إجمالي حقوق الملكية": "Total equity", "الخصوم + حقوق الملكية": "Liabilities + equity", "الميزانية متوازنة": "Balance sheet is balanced",
    "الميزانية غير متوازنة": "Balance sheet is not balanced", "راجع القيود": "review entries", "حتى تاريخ": "As of", "رصيد أول المدة ": "Opening", "حركة الفترة": "Period activity",
    "الميزان متوازن": "Trial balance is balanced", "الميزان غير متوازن": "Trial balance is not balanced", "أول المدة مدين": "Opening Dr", "أول المدة دائن": "Opening Cr", "آخر المدة مدين": "Closing Dr", "آخر المدة دائن": "Closing Cr",
    "رصيد النقدية أول الفترة": "Opening cash", "تحصيلات من العملاء": "Collections from customers", "مردودات نقدية للعملاء": "Cash refunds to customers", "مدفوعات للموردين": "Payments to suppliers",
    "مصروفات تشغيلية": "Operating expenses", "قيود يدوية (رأس مال، قروض، أصول...)": "Manual entries (capital, loans, assets...)", "أرصدة افتتاحية": "Opening balances", "عمولات تحويل بنكية": "Bank transfer fees",
    "صافي التدفق النقدي": "Net cash flow", "رصيد النقدية آخر الفترة": "Closing cash", "غير مستحق": "Current", "دفعات مقدمة": "Advances", "لا توجد أرصدة مستحقة": "No outstanding balances",
    "ضريبة المخرجات (المبيعات)": "Output VAT (sales)", "المبيعات الخاضعة": "Taxable sales", "مردودات المبيعات (إشعارات دائنة)": "Sales returns (credit notes)", "خدمات مستوردة خاضعة للاحتساب العكسي": "Imported services under reverse charge",
    "إجمالي ضريبة المخرجات": "Total output VAT", "ضريبة المدخلات (المشتريات والمصروفات)": "Input VAT (purchases & expenses)", "مشتريات محلية خاضعة للنسبة الأساسية": "Domestic purchases at the standard rate",
    "مصروفات بفواتير ضريبية": "Expenses with tax invoices", "إجمالي ضريبة المدخلات": "Total input VAT", "الضريبة المستحقة للسداد": "VAT payable", "رصيد ضريبي دائن (مسترد)": "VAT credit (refundable)",
    "القيمة قبل الضريبة": "Value excl. VAT", "تسجيل سداد / مقاصة الإقرار": "Record return payment / offset",
    "الإقرار يُقدَّم لهيئة الزكاة والضريبة والجمارك (شهرياً أو ربع سنوياً حسب حجم الإيرادات). لتسجيل السداد: قيد يومية من ح/ ضريبة المخرجات إلى ح/ ضريبة المدخلات بالرصيد، والفرق إلى ح/ البنك": "The return is filed with ZATCA (monthly or quarterly depending on revenue). To record payment: debit output VAT, credit input VAT, and the difference to the bank",
    "لا توجد مبالغ استقطاع في الفترة": "No withholding tax in this period", "المورد غير المقيم": "Non-resident supplier", "المبلغ الخاضع": "Taxable amount", "الضريبة المستقطعة": "Tax withheld",
    "المستقطع في الفترة": "Withheld in period", "المسدد للهيئة": "Paid to authority", "رصيد مستحق (كل الفترات)": "Outstanding (all periods)", "تسجيل توريد الاستقطاع": "Record WHT remittance",
    "يُورَّد الاستقطاع للهيئة خلال أول": "WHT is remitted to the authority within the first", "أيام من الشهر التالي. للسداد: قيد يومية من ح/ ضريبة الاستقطاع المستحقة إلى ح/ البنك": "days of the following month. To pay: debit WHT payable, credit bank",
    "غير مرتبط (عام)": "Unlinked (general)", "التكاليف هنا": "Costs here", "التكاليف المرتبطة بمشاريع العميل فقط (إنفاق إعلاني، مؤثرين، فريلانسرز...). اربط فواتير الموردين والمصروفات بالمشروع لتظهر هنا. الهامش أقل من": "are only costs linked to the customer's projects (ad spend, influencers, freelancers...). Link supplier bills and expenses to the project to see them here. Margin below",
    "يظهر باللون الأحمر": "is shown in red", "عدد الفواتير": "Invoices", "صافي الإيراد": "Net revenue", "تكاليف مشاريعه": "Project costs", "الربح المباشر": "Direct profit",
    "النقدية الحالية (كل الحسابات بالريال)": "Current cash (all accounts, SAR)", "الرصيد المتوقع آخر الفترة": "Expected closing balance", "متوسط المصروفات الشهرية": "Average monthly expenses", "آخر 3 شهور مكتملة": "last 3 full months",
    "الرصيد المتوقع يصبح سالباً في": "Expected balance turns negative in", "راجع التحصيل أو أجّل بعض المدفوعات": "Review collections or defer some payments", "تحصيلات متوقعة": "Expected collections",
    "مدفوعات متوقعة": "Expected payments", "الرصيد المتوقع": "Expected balance", "الرصيد الحالي ": "Current balance", "متأخرات (مستحقة فعلاً)": "Overdue (already due)", "مصروفات تشغيلية متوقعة (متوسط آخر": "Expected operating expenses (average of last",
    "سداد ضريبة القيمة المضافة المستحقة": "Pay VAT due", "توريد ضريبة الاستقطاع": "Remit withholding tax", "فاتورة دورية متوقعة": "Expected recurring invoice",
    "التوقع مبني على: الفواتير والأقساط غير المحصلة بتواريخ استحقاقها، الفواتير الدورية القادمة، فواتير الموردين المستحقة، متوسط المصروفات الشهرية، والضرائب المستحقة. التحويلات الداخلية (ريال": "Based on: uncollected invoices and installments by due date, upcoming recurring invoices, supplier bills due, average monthly expenses, and taxes due. Internal transfers (SAR",
    "جنيه) لا تُحتسب لأنها لا تغير إجمالي النقدية": "EGP) are excluded since they don't change total cash",
    "حسب العميل": "By customer", "حسب الصنف": "By item", "حسب المندوب": "By rep", "صافي المبيعات": "Net sales", "لا توجد مبيعات في الفترة": "No sales in this period", "العدد/الكمية": "Count/Qty",
    "تقرير غير معروف": "Unknown report", "الأرباح المحتجزة": "Retained earnings", "أرباح متراكمة": "Accumulated profit",
    "سداد / مقاصة إقرار ضريبة القيمة المضافة": "VAT return payment / offset", "الأرصدة حتى تاريخ (نهاية فترة الإقرار)": "Balances as of (end of return period)", "تاريخ السداد": "Payment date", "السداد من": "Pay from",
    "رقم السداد (سداد / المرجع)": "SADAD no. / reference", "رصيد ضريبة المخرجات": "Output VAT balance", "رصيد ضريبة المدخلات": "Input VAT balance", "المبلغ المستحق للسداد": "Amount payable",
    "رصيد دائن يُرحّل للفترة القادمة": "Credit carried forward to next period", "رصيد الاستقطاع المستحق": "WHT balance due", "تسجيل القيد": "Record entry", "اختر حساب السداد": "Choose the payment account",
    "لا توجد أرصدة ضريبية حتى هذا التاريخ": "No tax balances as of this date", "لا يوجد استقطاع مستحق حتى هذا التاريخ": "No WHT due as of this date", "تم تسجيل القيد": "Entry recorded",
    "سداد ضريبة": "Tax payment", "مقاصة ضريبة المدخلات": "Input VAT offset", "إقفال ضريبة المخرجات": "Clear output VAT", "والباقي رصيد دائن مُرحّل": "remainder carried forward as credit", "توريد للهيئة": "Remitted to authority",
    "سداد إقرار ضريبة القيمة المضافة حتى": "VAT return payment up to", "توريد ضريبة الاستقطاع حتى": "WHT remittance up to",

    // ---- الإعدادات ----
    "حفظ الإعدادات": "Save settings", "بيانات المنشأة (تظهر في الفاتورة الضريبية)": "Company details (shown on tax invoices)", "اسم المنشأة بالعربي": "Company name (Arabic)", "اسم المنشأة بالإنجليزي": "Company name (English)",
    "إلزامي في الفاتورة الضريبية": "required on tax invoices", "رقم المبنى": "Building no.", "الشارع": "Street", "الحي": "District", "الرمز البريدي": "Postal code", "الرقم الإضافي": "Additional no.",
    "بيانات التحويل البنكي (تظهر في الفاتورة)": "Bank details (shown on invoice)", "بيانات التحويل البنكي": "Bank details", "الشعار": "Logo", "إزالة": "Remove", "فاتورة ثنائية اللغة (عربي/إنجليزي)": "Bilingual invoice (Arabic/English)",
    "إظهار التاريخ الهجري": "Show Hijri date", "إصدار الفواتير الدورية المستحقة تلقائياً عند الدخول": "Issue due recurring invoices automatically on sign-in", "العملات": "Currencies",
    "الدفاتر بالريال السعودي. أضف العملات التي تحتفظ بها في خزائن أو حسابات (مثل الجنيه لفريق مصر). السعر": "Books are kept in Saudi Riyal. Add the currencies you hold in cash or bank accounts (e.g. EGP for the Egypt team). The rate",
    "كم ريال تساوي وحدة واحدة، ويُستخدم كقيمة افتراضية في الحركات وفي حساب فروق العملة": "is how many SAR one unit is worth; used as the default in transactions and FX revaluation",
    "السعر (ريال لكل وحدة)": "Rate (SAR per unit)", "للتوضيح": "For reference", "الرمز": "Symbol", "عملة": "currency", "الإعدادات المالية": "Financial settings", "رمز العملة الأساسية": "Base currency symbol",
    "اسم العملة (للتفقيط)": "Currency name (amount in words)", "اسم الكسر (للتفقيط)": "Subunit name (amount in words)", "نسبة ضريبة القيمة المضافة": "VAT rate", "نسبة الاستقطاع الافتراضية للموردين غير المقيمين": "Default WHT rate for non-resident suppliers",
    "مدة الاستحقاق الافتراضية (يوم)": "Default payment terms (days)", "تاريخ بداية النظام (للأرصدة الافتتاحية)": "Go-live date (for opening balances)", "إقفال الفترات حتى تاريخ": "Lock periods up to",
    "يمنع إضافة/تعديل/حذف أي حركة بتاريخ قبله أو يساويه": "Prevents adding/editing/deleting any transaction on or before this date", "الشروط الافتراضية للفواتير": "Default invoice terms",
    "بادئات الترقيم التلقائي": "Auto-numbering prefixes", "التالي": "next", "استيراد من": "Import from", "استيراد": "Import", "نزّل القالب، املأه في": "Download the template, fill it in",
    "، ثم احفظه بصيغة": ", then save it as", "حفظ باسم": "Save as", "وارفعه هنا. الأسماء المكررة تُتجاهل": "and upload it here. Duplicate names are skipped", "تنزيل القالب": "Download template", "رفع ملف": "Upload file",
    "تمت إضافة": "Added", "سجل": "records", "تم تجاهل": "Skipped", "مكرر": "duplicates", "الملف فارغ أو بدون صفوف بيانات": "The file is empty or has no data rows", "عمود": "Column", "غير موجود. استخدم القالب": "not found. Use the template",
    "صف": "Row", "رقم ضريبي غير صحيح لـ": "invalid VAT number for", "تم تجاهله": "ignored", "النسخ الاحتياطي والبيانات": "Backup & data",
    "البيانات محفوظة في هذا المتصفح. خذ نسخة احتياطية بانتظام. الحجم الحالي": "Data is stored in this browser. Back up regularly. Current size", "تنزيل نسخة احتياطية": "Download backup",
    "استعادة نسخة": "Restore backup", "تحميل بيانات تجريبية": "Load demo data", "مسح كل البيانات": "Erase all data", "حجم الشعار كبير": "Logo file is too large", "تم حفظ الشعار": "Logo saved",
    "ملف غير صالح": "Invalid file", "سيتم استبدال كل البيانات الحالية بالنسخة المستعادة. متابعة؟": "All current data will be replaced by the backup. Continue?", "تمت الاستعادة": "Restored", "فشل الاستعادة": "Restore failed",
    "سيتم استبدال البيانات الحالية ببيانات تجريبية. متابعة؟": "Current data will be replaced with demo data. Continue?", "تم تحميل البيانات التجريبية": "Demo data loaded",
    "مسح كل البيانات نهائياً؟ لا يمكن التراجع": "Permanently erase all data? This can't be undone", "اكتب": "Type", "للتأكيد": "to confirm", "تم المسح": "Erased", "تم حفظ الإعدادات": "Settings saved",
    "مستخدمة في خزينة ولا يمكن حذفها": "is used by an account and can't be removed", "العملة الأساسية": "base currency", "الوقت": "Time", "العملية": "Action", "كل عمليات الإضافة والتعديل والحذف": "All add, edit and delete actions",
    "تعذر الحفظ": "Couldn't save", "الفترة حتى": "The period up to", "مقفلة. لا يمكن إضافة أو تعديل حركات بتاريخ": "is locked. You can't add or edit transactions dated",
    "فواتير المبيعات": "Sales invoices", "عروض الأسعار": "Quotations", "الإشعارات الدائنة": "Credit notes", "قيود": "Entries", "القيود ": "Entries",

    // ---- دليل الحسابات الافتراضي ----
    "النقدية والبنوك": "Cash & banks", "العملاء (ذمم مدينة)": "Accounts receivable", "ضريبة القيمة المضافة - مدخلات": "VAT - input", "سُلف وعُهد الموظفين": "Employee advances & custody",
    "مصروفات مدفوعة مقدماً (إيجار، اشتراكات)": "Prepaid expenses (rent, subscriptions)", "أصول ثابتة (أجهزة، معدات تصوير، أثاث)": "Fixed assets (devices, camera gear, furniture)", "مجمع الإهلاك": "Accumulated depreciation",
    "الموردين (ذمم دائنة)": "Accounts payable", "ضريبة القيمة المضافة - مخرجات": "VAT - output", "دفعات مقدمة من العملاء (ميزانيات إعلانية)": "Customer advances (ad budgets)", "ضريبة الاستقطاع المستحقة": "Withholding tax payable",
    "مخصص مكافأة نهاية الخدمة": "End-of-service provision", "رواتب مستحقة": "Salaries payable", "التأمينات الاجتماعية المستحقة": "Social insurance payable", "مخصص الزكاة": "Zakat provision", "رأس المال": "Capital",
    "الاحتياطي النظامي": "Statutory reserve", "جاري الشركاء / المسحوبات": "Partners' current / drawings", "إيرادات خدمات تسويقية عامة": "General marketing services revenue",
    "إيرادات إدارة حسابات التواصل الاجتماعي": "Social media management revenue", "إيرادات إدارة الحملات الإعلانية": "Ad campaign management revenue", "إيرادات إنتاج المحتوى والتصوير": "Content production revenue",
    "إيرادات التصميم والهوية البصرية": "Design & branding revenue", "إيرادات التسويق عبر المؤثرين": "Influencer marketing revenue", "إيرادات SEO وتطوير المواقع": "SEO & web revenue", "إيرادات تنظيم الفعاليات": "Events revenue",
    "إعادة فوترة الإنفاق الإعلاني للعملاء": "Ad spend rebilled to clients", "إيرادات أخرى": "Other revenue", "مردودات وخصومات المبيعات": "Sales returns & discounts", "تكاليف مباشرة عامة": "General direct costs",
    "الإنفاق الإعلاني (Meta, Google, Snap, TikTok, X)": "Ad spend (Meta, Google, Snap, TikTok, X)", "أتعاب المؤثرين": "Influencer fees", "مستقلون (فريلانسرز)": "Freelancers", "إنتاج وتصوير ومونتاج": "Production, filming & editing",
    "طباعة ومواد دعائية وفعاليات": "Printing, promo materials & events", "رواتب وأجور": "Salaries & wages", "أجور فريق مصر (عن بُعد)": "Egypt team wages (remote)", "إيجار ومصروفات مكتب مصر": "Egypt office rent & expenses",
    "التأمينات الاجتماعية (GOSI)": "Social insurance (GOSI)", "رسوم الإقامات والمقابل المالي والتأشيرات": "Iqama, expat levy & visa fees", "مكافأة نهاية الخدمة": "End-of-service benefits", "التأمين الطبي والبدلات": "Medical insurance & allowances",
    "الإيجارات": "Rent", "كهرباء ومياه واتصالات وإنترنت": "Utilities, telecom & internet", "اشتراكات البرامج والأدوات": "Software & tool subscriptions", "تسويق الوكالة نفسها": "Agency's own marketing",
    "عمولات المبيعات": "Sales commissions", "انتقالات وسفر": "Travel & transport", "مصروفات بنكية وعمولات بوابات الدفع": "Bank & payment gateway fees", "رسوم حكومية (سجل تجاري، غرفة، بلدية، قوى)": "Government fees (CR, chamber, municipality, Qiwa)",
    "مصروف الإهلاك": "Depreciation expense", "مصروفات عمومية وإدارية": "General & administrative expenses", "الزكاة": "Zakat",

    // ---- مقاطع من القيود والمستندات ----
    "فاتورة مبيعات": "Sales invoice", "سند صرف ": "Payment voucher", "رصيد افتتاحي": "Opening balance", "افتتاحي": "Opening", "احتساب عكسي للضريبة": "VAT reverse charge", "استرداد نقدي ": "Cash refund",
    "تحويل ": "Transfer", "قيد يومية ": "Journal entry",

    // ---- مطابقة الإنفاق الإعلاني والتنقل بين النظامين ----
    "مطابقة الإنفاق الإعلاني": "Ad Spend Reconciliation", "حسب المنصات": "Per platforms", "المقيد محاسبياً": "Booked in accounts", "مشاريع بها فرق": "Projects with differences", "الحملات": "Campaigns",
    "✓ مطابق": "✓ Matched", "+ تسجيل فاتورة منصة": "+ Record platform bill", "لا يوجد إنفاق إعلاني مربوط بمشاريع": "No project-linked ad spend",
    "تراكمي حتى اليوم: الإنفاق حسب تقارير المنصات (من نظام التسويق) مقابل الإنفاق الإعلاني المقيد في الدفاتر (حساب 5110) لكل مشروع": "Cumulative to date: spend reported by the platforms (from the Marketing System) vs. ad spend booked in the ledger (account 5110) per project",
    "فرق موجب = المنصة صرفت أكثر من المسجل: غالباً فاتورة منصة لم تُسجل بعد في فواتير المشتريات.": "Positive difference = the platform spent more than recorded: usually a platform bill not yet entered in purchase bills.",
    "فرق سالب = المسجل محاسبياً أكبر: نتائج حملات لم ينقلها فريق التسويق بعد، أو تكلفة على المشروع ليست من حملة مسجلة.": "Negative difference = more is booked: campaign results not yet entered by the marketing team, or a project cost not tied to a recorded campaign.",
    "نظام التسويق": "Marketing System", "الأنظمة": "Systems", "تقنية المعلومات": "IT", "منصة العملاء": "Client Platform", "تقنية المعلومات (نظام IT فقط)": "IT (IT System only)", "عميل (منصة العملاء فقط)": "Client (Client Platform only)", "عميل (المنصة)": "Client (Platform)", "فريق التسويق": "Marketing team", "فريق التسويق (نظام التسويق فقط)": "Marketing team (Marketing System only)", "التسويق": "Marketing",
  };

  // مقاطع بنمط ثابت + رقم/قيمة
  const REX = [
    [/^تم حفظ (.+)$/, 'Saved $1'], [/^حذف (.+)؟$/, 'Delete $1?'],
  ];

  const AR_RUN = /[؀-ۿ][؀-ۿ ،؛:\-\/\(\)%«»…؟!\.]*[؀-ۿ\)»؟!]|[؀-ۿ]+/g;
  function tr(s) {
    if (!s || !/[؀-ۿ]/.test(s)) return s;
    const k = s.trim(); if (D[k]) return s.replace(k, D[k]);
    return s.replace(AR_RUN, run => {
      const r = run.trim(); if (D[r]) return run.replace(r, D[r]);
      const core = r.replace(/[\s:،\.\-\/]+$/, '').replace(/^[\s:،\.\-\/]+/, '');
      if (D[core]) return run.replace(core, D[core]);
      // تقسيم على الفواصل وترجمة كل جزء معروف
      const parts = r.split(/(\s[\-\/·]\s|،\s?|:\s)/);
      if (parts.length > 1 && parts.some(p => D[p.trim()])) return parts.map(p => D[p.trim()] ? p.replace(p.trim(), D[p.trim()]) : p).join('');
      for (const [re, rep] of REX) if (re.test(r)) return r.replace(re, rep);
      return run;
    });
  }

  const SKIP = 'script,style,textarea,#print-area,.doc-preview,[data-no-i18n]';
  function apply(root) {
    if (lang !== 'en' || !root) return;
    if (root.nodeType === 3) { if (!(root.parentElement && root.parentElement.closest(SKIP))) { const v = tr(root.data); if (v !== root.data) root.data = v; } return; }
    if (root.nodeType !== 1 || root.closest && root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && n.parentElement.closest(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => { const v = tr(n.data); if (v !== n.data) n.data = v; });
    const els = [root].concat(Array.from(root.querySelectorAll('[placeholder],[title],[aria-label]')));
    els.forEach(el => ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute && el.getAttribute(a); if (v && /[؀-ۿ]/.test(v)) el.setAttribute(a, tr(v)); }));
  }

  function init() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ar';
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.classList.toggle('lang-en', lang === 'en');
    if (lang !== 'en') return;
    document.title = tr(document.title);
    apply(document.body);
    new MutationObserver(muts => muts.forEach(m => {
      if (m.type === 'characterData') apply(m.target);
      m.addedNodes && m.addedNodes.forEach(n => apply(n));
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
    // نوافذ التأكيد والتنبيه
    const c = window.confirm.bind(window), a = window.alert.bind(window), p = window.prompt.bind(window);
    window.confirm = m => c(tr(String(m))); window.alert = m => a(tr(String(m))); window.prompt = (m, d) => p(tr(String(m)), d);
  }
  function set(l) { try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); }
  function toggle() { set(lang === 'en' ? 'ar' : 'en'); }

  global.I18N = { get lang() { return lang; }, tr, apply, init, set, toggle, dict: D };
})(window);
