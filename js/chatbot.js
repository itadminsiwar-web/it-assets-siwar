/* =========================================================
   chatbot.js — 🤖 مساعد SEG (شات بوت)
   ثلاث جماهير:
   • staff  : موظفو الشركة داخل الأنظمة — "إزاي أعمل كذا؟" + أسئلة عن البيانات + تحويل للدعم
   • client : العميل في منصة العملاء — رصيده، فواتيره، المنشورات المنتظرة + تحويل لموظف
   • site   : زوار موقع الشركة — الخدمات والأسعار وإزاي نبدأ (داخل شات الموقع)
   الإجابة من قاعدة معرفة عربية + بيانات النظام. لو اتحدد APP_CONFIG.aiEndpoint (سيرفر عليه نموذج
   ذكاء اصطناعي مثل Claude) يتبعت له السؤال اللي القاعدة مش لاقية له إجابة.
   ========================================================= */
(function (global) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // تطبيع العربي: إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة
  const norm = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^؀-ۿa-z0-9\s@]/g, ' ').replace(/\s+/g, ' ').trim();
  const HOST = () => location.pathname.split('/').pop() || 'index.html';
  const link = (page, hash, label) => `<a href="${page === HOST() ? '' : page}#/${hash}">${label}</a>`;

  // ================= قاعدة المعرفة =================
  const KB = {
    staff: [
      { k: ['فاتوره', 'فاتوره جديده', 'اعمل فاتوره', 'اصدار فاتوره', 'invoice'], a: () => `من ${link('index.html', 'invoices', 'النظام المالي ← فواتير المبيعات')} اضغط <b>+ فاتورة</b>، اختار العميل والخدمات، والضريبة 15% ورمز QR بيتحسبوا لوحدهم. ولو العميل عنده رقم ضريبي هتطلع "فاتورة ضريبية"، غير كده "مبسطة".` },
      { k: ['سند قبض', 'تحصيل', 'العميل دفع', 'استلام فلوس', 'دفعه من عميل'], a: () => `من ${link('index.html', 'receipts', 'سندات القبض')} ← <b>+ سند قبض</b>، اختار العميل والخزينة، ووزّع المبلغ على الفواتير المفتوحة.` },
      { k: ['مصروف', 'مصاريف', 'صرف', 'expense'], a: () => `من ${link('index.html', 'expenses', 'المصروفات')} ← <b>+ مصروف</b>. لو الخزينة بالجنيه اكتب المبلغ بالجنيه وسعر الصرف، والريال بيتحسب لوحده.` },
      { k: ['تحويل', 'جنيه', 'فريق مصر', 'تحويل فلوس مصر', 'سعر الصرف'], a: () => `التحويل بين الخزائن (مثلاً من الراجحي لبنك مصر) من ${link('index.html', 'transfers', 'التحويلات')}، بتكتب المبلغ بالريال والمستلم بالجنيه، وفروق العملة بتتسجل من صفحة الخزينة.` },
      { k: ['ضريبه', 'اقرار', 'vat', 'زكاه', 'هيئه'], a: () => `إقرار ضريبة القيمة المضافة من ${link('index.html', 'reports/vat', 'التقارير ← إقرار الضريبة')}، وفيه زرار سداد/مقاصة بقيد تلقائي. الاحتساب العكسي للإعلانات الأجنبية (Meta، تيك توك...) محسوب فيه.` },
      { k: ['تقرير', 'ارباح', 'قائمه الدخل', 'ميزانيه', 'ميزان المراجعه'], a: () => `كل التقارير المالية في ${link('index.html', 'reports', 'التقارير المالية')}: قائمة الدخل، الميزانية، ميزان المراجعة، التدفق النقدي، أعمار الديون، وربحية العملاء والمشاريع.` },
      { k: ['حمله', 'حمله جديده', 'نتايج الحمله', 'campaign', 'اعلان'], a: () => `من ${link('marketing.html', 'campaigns', 'التسويق ← الحملات الإعلانية')} ← <b>+ حملة</b>، وبعدها <b>+ نتائج</b> كل أسبوع من مدير الإعلانات (الإنفاق، الظهور، الـ Leads...).` },
      { k: ['منشور', 'خطه المحتوي', 'محتوي', 'بوست', 'تقويم'], a: () => `خطة المحتوى في ${link('marketing.html', 'content', 'التسويق ← خطة المحتوى')}. حطه في مرحلة "مراجعة العميل" عشان يظهر للعميل في منصة العملاء ويوافق عليه.` },
      { k: ['عميل محتمل', 'ليد', 'lead', 'leads', 'فرصه'], a: () => `العملاء المحتملون في ${link('marketing.html', 'leads', 'التسويق ← العملاء المحتملون')}. انقل الكارت بين المراحل بالسحب أو الأسهم، وافتحه تلاقي فرصة التعاقد ✨ وأزرار الماكرو 🧩.` },
      { k: ['مهمه', 'مهام', 'task', 'تاسك'], a: () => `المهام في ${link('marketing.html', 'tasks', 'مهام الفريق')}: <b>+ مهمة</b> واختار المسؤول وموعد التسليم.` },
      { k: ['مؤثر', 'مؤثرين', 'انفلونسر', 'influencer'], a: () => `مكتبة المؤثرين وسجل التعاون في ${link('marketing.html', 'influencers', 'المؤثرون')}، وفيها CPM وتكلفة التفاعل لكل مؤثر.` },
      { k: ['اتمته', 'قاعده', 'workflow', 'تلقائي', 'automation'], a: () => `من ${link('marketing.html', 'automation', 'الأتمتة')} ← <b>+ قاعدة</b>: اختار "لما يحصل" (مثلاً عميل محتمل جديد) وبعدها الإجراءات (مهمة، إشعار، رسالة واتساب...).` },
      { k: ['رساله', 'واتساب', 'رد علي عميل', 'صندوق التواصل', 'inbox'], a: () => `كل رسائل العملاء في ${link('marketing.html', 'inbox', 'صندوق التواصل')}، مرتبة حسب الأولوية والنبرة. زرار "↩️ رد" بيفتح واتساب أو الإيميل ويسجّل الرد.` },
      { k: ['زوار', 'الموقع', 'تعقب', 'visitors'], a: () => `زوار موقع الشركة في ${link('marketing.html', 'visitors', 'زوار الموقع')}: مين أونلاين، بيتفرج على إيه، وتقييم اهتمامه، وتحويله لعميل محتمل.` },
      { k: ['جهاز', 'لابتوب', 'عهده', 'تسليم جهاز', 'موبايل جديد'], a: () => `من ${link('it.html', 'assets', 'تقنية المعلومات ← الأجهزة والعُهد')}: سجّل الجهاز (+ جهاز) وبعدها <b>📤 تسليم</b> لموظف، وهيطلع إقرار استلام عهدة للتوقيع.` },
      { k: ['خط', 'رقم', 'شريحه', 'sim', 'خط سعودي', 'خط مصري'], a: () => `الخطوط في تقنية المعلومات: ${link('it.html', 'linesSA', 'الأرقام السعودية')} و${link('it.html', 'linesEG', 'الأرقام المصرية')}. ضيف الرقم وسلّمه للموظف.` },
      { k: ['ايميل', 'بريد', 'email', 'ايميل جديد', 'باسورد الايميل'], a: () => `إيميلات الشركة في ${link('it.html', 'mail', 'إيميلات الشركة')}. الإيميل نفسه بيتعمل من لوحة Google Workspace، والنظام بيسجّله ويتابعه. ولو نسيت باسورد إيميلك كلّم مسؤول IT.` },
      { k: ['موظف جديد', 'تعيين', 'استلام شغل', 'هيبدا', 'انضم', 'onboarding'], a: () => `من ${link('it.html', 'onboard', 'التعيينات')} ← <b>🟢 تسجيل تعيين جديد</b>: هتطلع قائمة (إيميل، جهاز، خط، اشتراكات، إقرار) وكل بند ليه زرار ينفّذه.` },
      { k: ['اخلاء طرف', 'استقال', 'هيسيب', 'هيمشي', 'ساب الشغل', 'ترك العمل', 'انهاء خدمه', 'offboarding'], a: () => `من ${link('it.html', 'offboard', 'الإخلاءات')} ← <b>🚪 تسجيل إخلاء طرف</b>: النظام بيجمع كل اللي مع الموظف (أجهزة، خطوط، إيميل، اشتراكات) وبعد التنفيذ تطبع شهادة إخلاء الطرف.` },
      { k: ['اشتراك', 'adobe', 'canva', 'تجديد', 'subscription'], a: () => `الاشتراكات في ${link('it.html', 'subs', 'الاشتراكات')}. زرار <b>🔁 تجديد</b> بيقدّم التاريخ ويسجّل المصروف في النظام المالي لوحده.` },
      { k: ['باسورد', 'كلمه السر', 'كلمه المرور', 'نسيت', 'مش عارف ادخل', 'password'], a: () => `تغيير كلمة المرور بيكون من المدير: النظام المالي ← الإعدادات ← <b>المستخدمين</b> ← "تغيير كلمة المرور". لو مش قادر تدخل خالص، اضغط "تحويل للدعم" تحت.` },
      { k: ['صلاحيه', 'مش شايف', 'مش ظاهر', 'مستخدم جديد', 'حساب'], a: () => `كل مستخدم بيشوف النظام اللي يخصه بس (محاسب ← المالي، تسويق ← التسويق، IT ← تقنية المعلومات). إضافة مستخدم أو تغيير صلاحيته من الإعدادات ← المستخدمين (للمدير).` },
      { k: ['منصه العملاء', 'حساب للعميل', 'العميل يدخل', 'بوابه'], a: () => `من ${link('marketing.html', 'clients', 'التسويق ← العملاء')} افتح العميل واضغط <b>🔑 منصة العملاء</b> واعمله حساب. العميل يدخل على clients.html ويشوف فواتيره ويوافق على المحتوى.` },
      { k: ['انجليزي', 'english', 'اللغه', 'عربي'], a: () => `زرار <b>English / العربية</b> في الشريط العلوي بيغيّر لغة الواجهة.` },
      { k: ['بحث', 'الاقي', 'دور', 'search'], a: () => `اضغط <b>Ctrl + K</b> في أي نظام واكتب اسم عميل أو رقم فاتورة أو جهاز أو رقم تليفون.` },
      { k: ['نسخه احتياطيه', 'باك اب', 'backup', 'البيانات راحت'], a: () => `النسخة الاحتياطية من النظام المالي ← الإعدادات ← "تنزيل نسخة احتياطية" (ملف JSON)، ومنها كمان الاسترجاع.` },
      { k: ['مشكله', 'عطل', 'مش شغال', 'error', 'خطا', 'بايظ', 'معلق'], a: () => `آسف إن فيه مشكلة 🙏 جرّب الأول تحديث الصفحة (<b>Ctrl + F5</b>). لو المشكلة لسه موجودة، اضغط <b>تحويل للدعم</b> تحت واكتب حصل إيه، وفريق IT هيوصله إشعار على طول.` },
    ],
    client: [
      { k: ['رصيد', 'عليا كام', 'المستحق', 'كم المبلغ', 'مديونيه'], a: c => c.balance },
      { k: ['فاتوره', 'فواتير', 'invoice', 'نسخه من الفاتوره'], a: () => `كل فواتيرك في ${link('clients.html', 'pinvoices', 'الفواتير')}، وتقدر تفتح أي فاتورة وتطبعها PDF بالـ QR الضريبي.` },
      { k: ['ادفع', 'سداد', 'تحويل', 'حساب بنكي', 'ايبان', 'iban'], a: () => `بيانات التحويل: ${esc((global.DB && DB.settings.bankDetails) || 'تواصل مع فريق الحسابات')}. اكتب رقم الفاتورة في التحويل لو سمحت 🙏` },
      { k: ['متاخر', 'متاخره', 'فاتت'], a: c => c.overdue },
      { k: ['منشور', 'موافقه', 'محتوي', 'بوست', 'اوافق'], a: c => c.content },
      { k: ['تعديل', 'غير', 'عايز اغير'], a: () => `من ${link('clients.html', 'papprove', 'موافقة المحتوى')} اضغط <b>✎ طلب تعديل</b> على المنشور واكتب التعديل، وهيوصل للمصمم على طول.` },
      { k: ['تقرير', 'نتايج', 'الحمله', 'اداء', 'leads'], a: () => `تقرير أداء حملاتك الشهري في ${link('clients.html', 'preport', 'تقرير الأداء')}، وتقدر تطبعه PDF.` },
      { k: ['كشف حساب', 'statement'], a: () => `كشف حسابك في ${link('clients.html', 'pstatement', 'كشف الحساب')}.` },
      { k: ['تواصل', 'اكلم', 'رقم', 'موظف', 'حد يكلمني'], a: () => `اضغط <b>تحويل لموظف</b> تحت واكتب طلبك، وفريقنا هيتواصل معاك 👌` },
      { k: ['شكرا', 'تمام', 'ممتاز'], a: () => `العفو 🌹 لو احتجت أي حاجة أنا هنا.` },
    ],
    site: [
      { k: ['خدمات', 'بتعملوا ايه', 'service', 'شغلكم'], a: () => `بنقدم: إدارة السوشيال ميديا، الحملات الإعلانية (Meta وسناب وتيك توك وجوجل)، إنتاج المحتوى والتصوير، التسويق عبر المؤثرين، الهوية البصرية، وSEO.` },
      { k: ['سعر', 'اسعار', 'باقه', 'باقات', 'كام', 'تكلفه', 'price'], a: () => `الباقات: <b>الأساسية 4,500 ر.س</b> شهرياً، و<b>النمو 8,500 ر.س</b> (الأكثر طلباً)، و<b>الشاملة</b> حسب الطلب. تحب نرشّحلك الأنسب لنشاطك؟` },
      { k: ['اعلان', 'حمله', 'اعلانات', 'سناب', 'تيك توك', 'ميتا'], a: () => `بندير حملاتك على Meta وسناب وتيك توك وجوجل باستهداف دقيق وتقرير أسبوعي. متوسط العائد على الإعلانات عند عملائنا 3.4x 📈` },
      { k: ['مؤثر', 'مؤثرين', 'مشاهير'], a: () => `بنختار مؤثرين مرخصين من "موثوق" ومناسبين لجمهورك، ونقيس النتائج بأكواد خصم ومشاهدات.` },
      { k: ['ابدا', 'نبدا', 'اشترك', 'استشاره', 'اتعاقد'], a: () => `نبدأ باستشارة مجانية 👌 اكتب في الشات نوع نشاطك وهدفك (مبيعات، متابعين، وعي بالعلامة)، أو املأ فورم "تواصل معنا".` },
      { k: ['مكان', 'فين', 'عنوان', 'مقر', 'الرياض', 'مصر'], a: () => `مقرنا في الرياض، وفريق الإنتاج والتصميم في القاهرة، وبنخدم عملاء في كل المملكة.` },
      { k: ['اعمالكم', 'شغل سابق', 'بورتفوليو', 'portfolio', 'عملاء'], a: () => `من شغلنا: مشروع عقاري في جدة (1,067 عميل محتمل)، عيادات تجميل في الرياض (عائد 6.7x)، ومتجر إلكتروني (+380 عملية شراء بالمؤثرين).` },
      { k: ['مده', 'امتي', 'وقت', 'كم يوم'], a: () => `بنبدأ التنفيذ خلال 3–5 أيام عمل من الاتفاق، وأول تقرير بعد أسبوع.` },
    ],
  };
  // ---- نظام تقنية المعلومات (it.html): إزاي أعمل + أسئلة عن البيانات بالكود والاسم ----
  const L = (hash, label) => link(HOST(), hash, label);
  KB.it = [
    { k: ['اسلم جهاز', 'تسليم جهاز', 'اسلم لابتوب', 'عهده جديده', 'اسلم موبايل', 'اسلم كمبيوتر'], a: () => `افتح ${L('assets', 'الأجهزة')} (أو ${L('mobiles', 'الموبايلات')}) ← الجهاز ← <b>📤 تسليم لموظف</b>. لو الموظف عنده إقرار موحد، النظام بيعمل <b>ملحق عهدة</b> لوحده. الجهاز لازم يكون "خالي / جاهز"؛ اللي راجع من موظف لازم يتمسح الأول.` },
    { k: ['جهاز جديد', 'اضيف جهاز', 'سجل جهاز', 'كود جهاز', 'الكود'], a: () => `من ${L('assets', 'الأجهزة')} ← <b>+ جهاز</b>. الكود بيتولّد لوحده بنفس شكل أكواد الشركة (الشركة-النوع-الرقم)، ولازم يبقى نفس الكود اللي في الشيت.` },
    { k: ['استلم جهاز', 'رجع جهاز', 'مسح', 'wipe', 'فورمات', 'mdm'], a: () => `الجهاز اللي بيرجع من موظف بيبقى <b>مستني المسح</b>. افتحه واضغط <b>🧽 مسح الداتا وحذف من MDM</b>، وهيرجع "خالي" وتطلع شهادة مسح داتا.` },
    { k: ['موظف جديد', 'تعيين', 'هيبدا', 'مباشره', 'onboarding', 'جهز موظف'], a: () => `${L('onboard', 'التعيين (0 – 8)')}: المرحلة 5 هي تجهيز IT (حجز جهاز، إيميل، MDM و MFA، شريحة، تولات)، و6 التسليم الفعلي بمطابقة السيريال، و7 الإقرار الموحد. لو جاي من مرشح، المراحل 0–4 بتتقفل لوحدها من ${L('cands', 'ملف المرشح')}.` },
    { k: ['اخلاء طرف', 'اخلاء', 'استقال', 'هيمشي', 'ساب الشغل', 'ترك العمل', 'offboarding'], a: () => `${L('offboard', 'الإخلاء (X1 – X9)')} ← <b>🚪 طلب إخلاء</b>: العهد بتتجمد والكشف بيتولّد لوحده، وبعدها X3 استلام الأجهزة بالسيريال وقفل الحسابات، وX4 المسح ونقل التولات. الحسابات ماتصرفش التسوية قبل توقيع إقرار تسليم العهدة.` },
    { k: ['مرشح', 'مقابله', 'تقديم', 'qr', 'وظيفه'], a: () => `${L('cands', 'المرشحين والمقابلات')}: زرار <b>▦ QR التقديم</b> للاستقبال، وكل مرشح ليه Candidate ID. سجّل المقابلات والتقييم والقرار، وبعد القبول ابعتله رابط المستندات.` },
    { k: ['شريحه', 'خط', 'رقم سعودي', 'رقم مصري', 'شحن'], a: () => `${L('linesSA', 'الشرائح السعودية')} و${L('linesEG', 'الشرائح المصرية')}: كل شريحة بكود، وميعاد التجديد (السعودي) أو الشحن (المصري) بيظهر في مركز التجديدات والتنبيهات.` },
    { k: ['ايميل', 'بريد', 'email', 'ميل'], a: () => `${L('mail', 'إيميلات الشركة')}: كل إيميل بكود. عند الإخلاء بيتقفل ثم يتأرشف ثم يتحذف بعد مدة الاحتفاظ. فعّل MFA على الحسابات المهمة من ${L('security', 'الأمان')}.` },
    { k: ['باقه', 'نت', 'انترنت', 'جيجا', 'we', 'my te'], a: () => `${L('net', 'باقات الإنترنت')} بالجنيه. القراءات بتيجي تلقائي من سكريبت WE عن طريق الشيت، أو سجّلها يدوي بزرار <b>📈 قراءة</b>.` },
    { k: ['تول', 'توكن', 'api', 'رصيد'], a: () => `${L('tools', 'التولات والتوكنات')}: المتبقي من التوكن والتوقع على متوسط آخر 7 أيام (هيكفي لحد التجديد ولا لأ).` },
    { k: ['ترخيص', 'اشتراك', 'موقع مدفوع', 'مواقع مدفوعه', 'subscription'], a: () => `${L('subs', 'التراخيص')} ← <b>+ اشتراك</b> (فيه رابط الموقع وحساب الدخول والمقاعد)، والدومينات والاستضافة من ${L('domains', 'الدومينات و SSL والهوستنج')}. للقوايم الكبيرة: استيراد CSV من ${L('itsettings', 'المزامنة والإعدادات')}.` },
    { k: ['جرد', 'سيريال', 'stocktake'], a: () => `${L('stocktake', 'الجرد والسيريالات')} ← <b>ابدأ جرد جديد</b> وامسح الباركود أو اكتب الكود، وسجّل السيريال الفعلي والمكان.` },
    { k: ['شيت', 'مزامنه', 'google sheets', 'استيراد', 'csv'], a: () => `${L('itsettings', 'المزامنة والإعدادات')}: اكتب ID الشيت وأسماء التابات، والمزامنة كل 5 دقايق. الأخطاء (كود ناقص أو مكرر) في ${L('syncerr', 'أخطاء المزامنة')} وتتصلح في الشيت.` },
    { k: ['اقرار', 'توقيع', 'كشف خلو طرف', 'مستند'], a: () => `كل المستندات في ${L('docs', 'العهد والإقرارات')}: الإقرار الموحد، ملاحق العهدة، كشف خلو الطرف، إقرار تسليم العهدة — طباعة ← توقيع ← رفع السكان.` },
    { k: ['تكلفه', 'مصروف شهري', 'كام بنصرف'], a: () => `${L('cost', 'التكلفة')}: المصروف الشهري المتكرر (تولات، باقات، شرائح، تراخيص) مقسم على الأقسام، بالجنيه أو الريال.` },
    { k: ['باسورد', 'كلمه السر', 'كلمه المرور', 'نسيت'], a: () => `🔑 باسوردات الأجهزة والخطوط والإيميلات متشفّرة في خزنة الباسوردات — من صفحة الجهاز أو زرار 🔑 جنب الخط / الإيميل، وبتتفتح بالباسورد الرئيسي بس (أنا مقدرش أشوفها). لو نسيت باسورد دخولك للنظام كلّم المدير.` },
    { k: ['مشكله', 'عطل', 'مش شغال', 'error', 'خطا', 'بايظ', 'معلق'], a: () => `جرّب تحديث الصفحة (<b>Ctrl + F5</b>). لو لسه، اضغط <b>تحويل للدعم</b> تحت واكتب حصل إيه.` },
    { k: ['انجليزي', 'english', 'اللغه'], a: () => `زرار <b>English / العربية</b> في الشريط العلوي.` },
  ];
  // إجابات من بيانات النظام: كود جهاز/شريحة/إيميل/موظف، أو أسئلة زي "التجديدات الأسبوع ده"
  function itData(q) {
    const X = global.ITX, D = global.DB; if (!X || !D) return null;
    const n = norm(q), raw = String(q || ''), nm = id => X.nm(id), hold = id => id ? `<a href="#/holder/${id}">${esc(nm(id))}</a>` : 'المخزن';
    const tokens = raw.match(/[A-Za-z][\w]*(?:-[\w]+)+/g) || [];
    for (const t of tokens) {
      const T = t.toLowerCase(), eq = v => String(v || '').toLowerCase() === T;
      const a = D.assets.find(x => eq(x.tag)); if (a) return `${esc(a.tag)}: <b>${esc(X.typeName(a))} ${esc((global.Fin && global.Fin.assetName) ? global.Fin.assetName(a) : '')}</b> · السيريال <span dir="ltr">${esc(a.serial || '—')}</span> · الحالة: <b>${esc(((global.Fin && global.Fin.ASTATUS) || {})[a.status] ? global.Fin.ASTATUS[a.status][0] : a.status)}</b> · مع: ${hold(a.holderId)}${a.reservedFor ? ' · محجوز لـ ' + hold(a.reservedFor) : ''} · ${L('asset/' + a.id, 'فتح الجهاز')}`;
      const l = D.lines.find(x => eq(x.code)); if (l) return `${esc(l.code)}: <b dir="ltr">${esc(global.Fin && global.Fin.fmtPhone ? global.Fin.fmtPhone(l.number) : l.number)}</b> (${esc(l.carrier || '')}) · مع: ${hold(l.holderId)} · ${l.renewDate ? (l.country === 'EG' ? 'الشحن ' : 'التجديد ') + X.inDays(X.days(l.renewDate)) : ''}`;
      const b = D.mailboxes.find(x => eq(x.code) || eq(x.address)); if (b) return `${esc(b.code || '')}: <b dir="ltr">${esc(b.address)}</b> · ${b.kind === 'shared' ? 'مشترك' : 'لـ ' + hold(b.holderId)} · ${b.status === 'active' ? 'نشط' : 'مش نشط'}${b.mfa ? ' · MFA ✓' : ' · من غير MFA'}`;
      const m = D.team.find(x => eq(x.empNo)); if (m) return custodyOf(m);
      const c = D.cycles.find(x => eq(x.no)); if (c) return `${esc(c.no)}: ${c.type === 'onboard' ? 'تعيين' : 'إخلاء'} ${hold(c.empId)} — المرحلة ${X.stageLabel(c, X.cycleStage(c))} · ${X.cycleDone(c)}/${c.items.length} بند · ${L('cycle/' + c.id, 'فتح')}`;
      const k = (D.tools || []).find(x => eq(x.code)); if (k) { const f = X.forecast('tool', k); return `${esc(k.code)} ${esc(k.name)}: متبقي ${f.pct}% · <b>${f.verdict}</b> · ${L('tool/' + k.id, 'فتح')}`; }
      const p = (D.netPackages || []).find(x => eq(x.code)); if (p) { const f = X.forecast('net', p); return `${esc(p.code)} ${esc(p.name)}: متبقي <b>${Math.round(f.remaining)} جيجا</b> من ${Math.round(f.quota)} · التجديد ${X.inDays(f.renewIn)}`; }
    }
    function custodyOf(m) { const c = X.custody(m.id); return `<b>${esc(m.name)}</b> <span dir="ltr">${esc(m.empNo || '')}</span> (${esc(m.dept || '')}) معاه ${c.length}: ${c.map(x => `<span dir="ltr">${esc(x.code)}</span> ${esc(x.type)}`).join('، ') || 'مفيش عهد'} · ${link(HOST(), 'holder/' + m.id, 'صفحة الموظف')}`; }
    if (/(مع مين|مين معاه|عهده|معاه ايه|بتاع)/.test(n)) { const m = D.team.filter(x => x.name && n.includes(norm(x.name))).sort((a, b) => b.name.length - a.name.length)[0]; if (m) return custodyOf(m); }
    if (/(كام جهاز|كم جهاز|عدد الاجهزه|الاجهزه كام)/.test(n)) { const A = D.assets.filter(a => !['retired', 'lost'].includes(a.status)); return `عندنا <b>${A.length}</b> جهاز: ${A.filter(a => a.status === 'assigned').length} مستخدم · ${A.filter(a => a.status === 'ready').length} خالي · ${A.filter(a => ['stock', 'wipe'].includes(a.status)).length} مخزن · ${A.filter(a => a.status === 'repair').length} صيانة.`; }
    if (/(تجديد|تجديدات)/.test(n) && /(الاسبوع|قريب|الجايه|الشهر|ايه)/.test(n)) { const r = X.renewals(/الشهر/.test(n) ? 30 : 7); return r.length ? `التجديدات ${/الشهر/.test(n) ? 'خلال 30 يوم' : 'خلال 7 أيام'}:<br>` + r.slice(0, 8).map(x => `• ${esc(x.title)} <span dir="ltr">${esc(x.code || '')}</span> — ${X.inDays(x.days)}`).join('<br>') + `<br>${L('renewals', 'مركز التجديدات')}` : 'مفيش تجديدات قريبة ✅'; }
    if (/(تنبيه|تنبيهات|عاجل)/.test(n)) { const al = X.alerts(); return al.length ? al.slice(0, 6).map(a => `${a.sev === 'urgent' ? '🔴' : '🟠'} ${esc(a.title)} <span dir="ltr">${esc(a.code)}</span>`).join('<br>') + `<br>${L('alerts', 'كل التنبيهات')}` : 'مفيش تنبيهات ✅'; }
    if (/(اخلاء|اخلاءات)/.test(n) && /(مفتوح|جاري|مين|حاليا)/.test(n)) { const o = D.cycles.filter(c => c.type === 'offboard' && c.status === 'open'); return o.length ? o.map(c => `• ${hold(c.empId)} — X${X.cycleStage(c)} · آخر يوم ${esc(c.date)} · <a href="#/cycle/${c.id}">${esc(c.no)}</a>`).join('<br>') : 'مفيش إخلاءات مفتوحة ✅'; }
    if (/(تعيين|مباشرات|موظفين جداد)/.test(n) && /(قادم|جاي|مين|جاري|حاليا)/.test(n)) { const o = D.cycles.filter(c => c.type === 'onboard' && c.status === 'open'); return o.length ? o.map(c => `• ${hold(c.empId)} — مرحلة ${X.cycleStage(c)} · المباشرة ${X.inDays(X.days(c.date))}`).join('<br>') : 'مفيش تعيينات جارية'; }
    if (/(باقه|باقات|جيجا|النت)/.test(n) && /(فاضل|متبقي|كام|باقي)/.test(n)) return (D.netPackages || []).filter(x => x.status !== 'cancelled').map(x => { const f = X.forecast('net', x); return `• ${esc(x.name)}: <b>${Math.round(f.remaining)} جيجا</b> متبقي · التجديد ${X.inDays(f.renewIn)}`; }).join('<br>') || 'مفيش باقات';
    if (/(توكن|تولات)/.test(n) && /(فاضل|متبقي|هيخلص|كام)/.test(n)) return (D.tools || []).filter(x => x.status !== 'cancelled').map(x => { const f = X.forecast('tool', x); return `• ${esc(x.code)} ${esc(x.name)}: ${f.pct}% — ${f.verdict}`; }).join('<br>') || 'مفيش تولات';
    if (/(باك اب|backup|نسخه احتياطيه)/.test(n)) return (D.backups || []).map(b => `• ${esc(b.name)}: ${X.backupOk(b) ? '✅ ناجح' : '🔴 متأخر ' + X.backupLate(b) + ' ساعة'}`).join('<br>') || 'مفيش مهام باك أب';
    if (/(من غير mfa|بدون mfa|mfa)/.test(n)) { const x = D.mailboxes.filter(b => b.status === 'active' && b.critical && !b.mfa); return x.length ? 'حسابات مهمة من غير MFA: ' + x.map(b => `<span dir="ltr">${esc(b.address)}</span>`).join('، ') : 'كل الحسابات المهمة عليها MFA ✅'; }
    return null;
  }
  const SUGGEST = {
    it: ['التنبيهات العاجلة', 'التجديدات الأسبوع ده', 'الإخلاءات المفتوحة', 'باقات النت فاضل فيها كام؟', 'إزاي أسلّم جهاز؟', 'إزاي أعمل إخلاء طرف؟'],
    staff: ['إزاي أعمل فاتورة؟', 'إزاي أسلّم لابتوب لموظف؟', 'موظف جديد هعمل إيه؟', 'إخلاء طرف', 'الفواتير المتأخرة', 'عندي مشكلة'],
    client: ['عليّا كام؟', 'المنشورات اللي مستنية موافقتي', 'إزاي أدفع؟', 'تقرير الحملات'],
    site: ['الأسعار', 'خدماتكم إيه؟', 'إزاي نبدأ؟'],
  };

  // ================= بيانات العميل (منصة العملاء) =================
  function clientCtx() {
    const L = global.Ledger, cid = global.Portal && global.Portal.cid; if (!cid || !L) return {};
    const bal = L.partyBalance(L.buildLedger(), 'customer', cid);
    const od = (DB.invoices || []).filter(i => i.customerId === cid && L.isPosted(i)).map(i => Object.assign({ i }, L.invoiceInfo(i))).filter(x => x.status === 'overdue');
    const rv = (DB.content || []).filter(x => x.customerId === cid && x.status === 'review');
    return {
      balance: bal > 0 ? `رصيدك المستحق حالياً <b>${U.money(bal)}</b>. التفاصيل في ${link('clients.html', 'pinvoices', 'الفواتير')}.` : `مفيش عليك أي مبالغ مستحقة ✅ شكراً لك.`,
      overdue: od.length ? `عندك ${od.length} فاتورة متأخرة: ${od.map(x => `<b>${esc(x.i.no)}</b> (${U.money(x.outstanding)})`).join('، ')}.` : `مفيش فواتير متأخرة ✅`,
      content: rv.length ? `فيه <b>${rv.length}</b> منشور مستني موافقتك — ${link('clients.html', 'papprove', 'راجِعها من هنا')}.` : `مفيش منشورات مستنية موافقتك دلوقتي ✅`,
    };
  }

  // ================= الإجابة =================
  function match(q, aud) {
    const n = ' ' + norm(q) + ' '; let best = null, bs = 0;
    (KB[aud] || []).forEach(e => { let s = 0; e.k.forEach(k => { const kk = norm(k); if (kk && n.includes(kk)) s += 2 + kk.length / 4; else kk.split(' ').forEach(w => { if (w.length > 2 && n.includes(' ' + w)) s += 0.8; }); }); if (s > bs) { bs = s; best = e; } });
    return bs >= 2 ? best : null;
  }
  // أسئلة عن البيانات (للموظفين) — من المساعد الذكي في platform
  const DATA_Q = /متاخر|افضل حمله|فرص|مبيعات الشهر|ايراد|الرسايل اللي|محتاجه رد|المهام المتاخره|تكلفه الاشتراكات|كام جهاز|كم جهاز/;
  function reply(q, aud) {
    aud = aud || 'staff';
    if (aud === 'it') { try { const d = itData(q); if (d) return { html: d, ok: true }; } catch (e) { console.error(e); } }
    if (aud === 'staff' && global.Platform && global.Platform.answer && DATA_Q.test(norm(q))) { const a = global.Platform.answer(q); if (a && !/^جرّب تسأل/.test(a)) return { html: a, ok: true }; }
    const e = match(q, aud);
    if (e) { const c = aud === 'client' ? clientCtx() : {}; return { html: typeof e.a === 'function' ? e.a(c) : e.a, ok: true }; }
    return { html: aud === 'site' ? 'سؤال حلو 👌 هحوّله لحد من الفريق يرد عليك هنا أو على واتساب خلال دقائق.' : `مش متأكد إني فهمت 🤔 جرّب تكتبها بطريقة تانية، أو اضغط <b>${aud === 'client' ? 'تحويل لموظف' : 'تحويل للدعم'}</b> وهيوصل سؤالك لحد من الفريق.`, ok: false };
  }
  // نموذج ذكاء اصطناعي على السيرفر (اختياري): APP_CONFIG.aiEndpoint
  async function aiFallback(q, aud) {
    const ep = (global.APP_CONFIG || {}).aiEndpoint; if (!ep) return null;
    try { const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, audience: aud }) }); const j = await r.json(); return j && j.answer ? esc(j.answer).replace(/\n/g, '<br>') : null; } catch (e) { return null; }
  }

  // ================= التحويل لإنسان =================
  function escalate(q, aud, user) {
    if (!global.DB || !global.Core) return;
    if (aud === 'client' && global.Portal && global.Portal.cid && global.Platform) {
      global.Platform.logActivity({ refType: 'customer', refId: global.Portal.cid, channel: 'chat', direction: 'in', subject: 'من مساعد منصة العملاء', body: q });
    } else if (global.Platform) {
      global.Platform.notify({ to: ['it', 'admin'], title: '🆘 طلب دعم من ' + ((user && user.name) || 'موظف') + ': ' + q.slice(0, 80), body: q, icon: '🆘', link: location.pathname.split('/').pop() + location.hash });
      global.Store.save();
    }
  }

  // ================= الواجهة =================
  let audience = 'staff', who = null;
  const KEY = 'seg_bot_hist2';
  function mount(user, aud) {
    if (document.getElementById('segBot')) return;
    who = user || null; audience = aud || (user && user.role === 'client' ? 'client' : (global.APP && global.APP.id === 'it' && global.ITX) ? 'it' : 'staff');
    const co = esc((global.DB && DB.settings.companyName) || 'SEG'), title = 'مساعد ' + co + (audience === 'it' ? ' · IT' : '');
    const w = document.createElement('div'); w.id = 'segBot'; w.className = 'bot';
    w.innerHTML = `<button class="bot-btn" aria-label="${title}" title="${title}">🤖</button>
      <div class="bot-box" hidden role="dialog" aria-label="${title}"><header><span class="bot-av">🤖</span><div><b>${title}</b><small>${audience === 'client' ? 'أسألني عن حسابك وفواتيرك ومحتواك' : audience === 'it' ? 'اسألني عن أي كود أو جهاز أو موظف، أو إزاي تعمل حاجة' : 'أسألني إزاي تعمل أي حاجة في النظام'}</small></div><button class="bot-x" aria-label="إغلاق">×</button></header>
        <div class="bot-msgs"></div><div class="bot-sug"></div>
        <form class="bot-in"><input name="q" placeholder="اكتب سؤالك..." autocomplete="off"><button aria-label="إرسال">➤</button></form>
        <div class="bot-foot"><button type="button" class="bot-esc">${audience === 'client' ? '👤 تحويل لموظف' : '🆘 تحويل للدعم'}</button></div></div>`;
    document.body.appendChild(w);
    const box = w.querySelector('.bot-box'), msgs = w.querySelector('.bot-msgs'), f = w.querySelector('.bot-in');
    const add = (html, me) => { const d = document.createElement('div'); d.className = 'bm ' + (me ? 'me' : 'ai'); d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = 1e6; save(); };
    const save = () => { try { sessionStorage.setItem(KEY + audience, msgs.innerHTML.slice(-20000)); } catch (e) {} };
    let last = '';
    const ask = async q => {
      q = String(q || '').trim(); if (!q) return; last = q; add(esc(q), true);
      const r = reply(q, audience);
      if (!r.ok) { const ai = await aiFallback(q, audience); if (ai) return add(ai); }
      add(r.html);
    };
    let restored = ''; try { restored = sessionStorage.getItem(KEY + audience) || ''; } catch (e) {}
    if (audience === 'it') { const a0 = (DB.assets || []).find(a => a.holderId && a.status === 'assigned'); if (a0 && !SUGGEST.it.some(s => s.includes(a0.tag))) SUGGEST.it.unshift('مين معاه ' + a0.tag + '؟'); }
    if (restored) msgs.innerHTML = restored; else if (audience === 'it') add(`أهلاً ${esc((who && who.name) || '')} 👋 أنا مساعد ${co} لتقنية المعلومات. اكتبلي أي كود (جهاز، شريحة، إيميل، موظف، إخلاء) وأقولك هو فين ومع مين، أو اسألني عن التجديدات والتنبيهات والباقات، أو إزاي تعمل أي حاجة.`); else add(audience === 'client' ? `أهلاً 👋 أنا مساعد ${esc((global.DB && DB.settings.companyName) || 'SEG')}. أقدر أقولك رصيدك، فواتيرك، والمنشورات اللي مستنية موافقتك.` : `أهلاً ${esc((who && who.name) || '')} 👋 أنا مساعد ${esc((global.DB && DB.settings.companyName) || 'SEG')}. اسألني إزاي تعمل أي حاجة في الأنظمة، أو عن الأرقام (الفواتير المتأخرة، أفضل حملة...).`);
    w.querySelector('.bot-sug').innerHTML = (SUGGEST[audience] || []).map(s => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('');
    w.querySelector('.bot-btn').onclick = () => { box.hidden = !box.hidden; if (!box.hidden) f.q.focus(); };
    w.querySelector('.bot-x').onclick = () => { box.hidden = true; };
    f.onsubmit = e => { e.preventDefault(); const q = f.q.value; f.q.value = ''; ask(q); };
    w.querySelector('.bot-sug').onclick = e => { const c = e.target.closest('[data-q]'); if (c) ask(c.dataset.q); };
    w.querySelector('.bot-esc').onclick = () => {
      const q = (f.q.value || last || '').trim();
      if (!q) { add('اكتب مشكلتك أو سؤالك الأول، وبعدها اضغط التحويل 🙏'); f.q.focus(); return; }
      escalate(q, audience, who); f.q.value = '';
      add(audience === 'client' ? '✅ وصل طلبك لفريقنا، وهيتواصلوا معاك قريباً.' : '✅ اتبعت طلبك لفريق IT والمدير، وهيوصلهم إشعار على طول.');
    };
    msgs.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) box.hidden = true; });
  }

  global.SEGBot = { mount, reply, match, norm, KB };
  if (global.I18N) Object.assign(global.I18N.dict, { "مساعد SEG": "SEG Assistant", "اكتب سؤالك...": "Type your question...", "🆘 تحويل للدعم": "🆘 Escalate to support", "👤 تحويل لموظف": "👤 Talk to a person", "أسألني إزاي تعمل أي حاجة في النظام": "Ask me how to do anything in the system", "أسألني عن حسابك وفواتيرك ومحتواك": "Ask about your account, invoices and content" });
})(window);
