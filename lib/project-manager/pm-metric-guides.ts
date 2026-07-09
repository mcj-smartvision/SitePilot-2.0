export type PmMetricGuideId =
  | 'control-kpis'
  | 'wsi'
  | 'mrs'
  | 'csi'
  | 'wsi-mrs-trend'
  | 'due-activities'
  | 'readiness-donut'
  | 'risk-alerts'
  | 'insights'
  | 'plan-compliance'
  | 'data-gaps'
  | 'recent-reports'
  | 'action-now'
  | 'executive'

export interface PmMetricGuide {
  id: PmMetricGuideId
  titleFa: string
  titleEn: string
  subtitleFa: string
  subtitleEn: string
  /** Plain-language what it is */
  whatFa: string
  whatEn: string
  /** Where the numbers come from */
  sourceFa: string
  sourceEn: string
  /** How we calculate */
  howFa: string
  howEn: string
  /** How to read good vs bad */
  goodBadFa: string
  goodBadEn: string
  /** Why you might see the current number */
  whyFa: string
  whyEn: string
  /** What to change to improve */
  improveFa: string[]
  improveEn: string[]
  /** Common mistakes / caveats */
  caveatsFa: string[]
  caveatsEn: string[]
}

const GUIDES: Record<PmMetricGuideId, PmMetricGuide> = {
  executive: {
    id: 'executive',
    titleFa: 'خلاصه مدیریتی (لایه ۱)',
    titleEn: 'Executive summary (Layer 1)',
    subtitleFa: 'اولین چیزی که مدیر پروژه باید در چند ثانیه بفهمد',
    subtitleEn: 'What a PM should grasp in seconds',
    whatFa:
      'این بخش وضعیت کلی پروژه را به زبان ساده می‌گوید: پروژه در چه فازی است، امروز جمع‌بندی چیست، ۳ ریسک اصلی و ۳ اقدام فوری کدام‌اند. هدف این نیست که همه جزئیات را ببینید؛ هدف این است که بدانید «الان حالمان خوب است یا نه».',
    whatEn:
      'A plain-language snapshot: phase, today’s conclusion, top 3 risks and top 3 actions. Not every detail—just whether things are OK right now.',
    sourceFa:
      'از جمع‌بندی زمان‌بندی (تعداد فعالیت، پیشرفت، تأخیر)، هشدارهای میدانی، کمبود مصالح انبار و تأییدهای معلق ساخته می‌شود.',
    sourceEn:
      'Built from schedule summary, field alerts, warehouse shortages, and pending approvals.',
    howFa:
      'وضعیت کلی (پایدار / هشدار / بحرانی) از ترکیب تأخیرها، کمبودها و تأییدهای باز تعیین می‌شود. فاز پروژه تقریبی است و از درصد پیشرفت کلی فعالیت‌ها حدس زده می‌شود (مثلاً زیر ۲۵٪ = تجهیز/شروع).',
    howEn:
      'Overall status blends delays, shortages, and open approvals. Phase is inferred from overall % complete.',
    goodBadFa:
      'سبز/پایدار یعنی فعلاً کنترل در دست است. هشدار یعنی باید امروز پیگیری کنید. بحرانی یعنی مسیر بحرانی یا منابع در خطر جدی است و نباید به فردا موکول شود.',
    goodBadEn:
      'Stable = under control. Warning = follow up today. Critical = critical path/resources at serious risk.',
    whyFa:
      'اگر تأخیر زیاد، مصالح کم، یا چند تأیید باز دارید، جمع‌بندی امروز منفی‌تر می‌شود حتی اگر یک بخش پروژه خوب پیش برود.',
    whyEn:
      'Many delays, low stock, or open approvals make today’s conclusion worse even if one area looks fine.',
    improveFa: [
      'تأییدهای معلق مرکز تأیید را همان روز ببندید',
      'فعالیت‌های مسیر بحرانی عقب‌مانده را با سرپرست مرور کنید',
      'کمبود مصالح را به تدارکات بسپارید',
      'گزارش روزانه کارگاه را به‌روز نگه دارید تا تصویر واقعی باشد',
    ],
    improveEn: [
      'Clear pending approvals the same day',
      'Review delayed critical-path activities with the supervisor',
      'Escalate material shortages to procurement',
      'Keep daily reports current so the picture is real',
    ],
    caveatsFa: [
      'این لایه خلاصه است؛ برای جزئیات به نمودارها و جدول انطباق نگاه کنید',
      'اگر برنامه یا شروع واقعی ثبت نشده باشد، جمع‌بندی ناقص است',
    ],
    caveatsEn: [
      'This is a summary—use charts and compliance for detail',
      'Without schedule/actual start, the summary is incomplete',
    ],
  },

  'control-kpis': {
    id: 'control-kpis',
    titleFa: 'شاخص‌های کنترل پروژه (حلقه‌ها)',
    titleEn: 'Project control KPI rings',
    subtitleFa: 'شش عدد کلیدی برای کنترل روزانه',
    subtitleEn: 'Six daily control numbers',
    whatFa:
      'این کارت‌ها مثل داشبورد ماشین هستند: SPI (عملکرد زمان)، پیشرفت واقعی در برابر برنامه، انطباق فعالیت‌های موعد، تأخیر مسیر بحرانی، کمبود مصالح، و عملیات باز (تأیید/هشدار). هر حلقه نشان می‌دهد چقدر از وضعیت ایده‌آل فاصله دارید.',
    whatEn:
      'Dashboard-style rings: SPI, actual vs planned progress, due-activity compliance, critical delay, material shortages, and open ops (approvals/alerts).',
    sourceFa:
      'برنامه زمان‌بندی (project_tasks)، تاریخ واقعی شروع پروژه، درصد پیشرفت فعالیت‌ها، موجودی انبار، هشدارها و تأییدهای معلق.',
    sourceEn:
      'Schedule tasks, actual start, task %, warehouse stock, alerts, pending approvals.',
    howFa:
      'SPI ≈ (میانگین پیشرفت واقعی فعالیت‌های موعد تا امروز) ÷ (میانگین پیشرفت برنامه‌ای همان فعالیت‌ها) × ۱۰۰. پیشرفت برنامه‌ای خطی است: از تاریخ شروع تا پایان فعالیت، هر روز سهمی از ۱۰۰٪. انطباق = سهم فعالیت‌هایی که انجام شده‌اند از بین فعالیت‌هایی که باید تا امروز شروع شده باشند.',
    howEn:
      'SPI ≈ average actual % of due tasks ÷ average planned % of those tasks × 100. Planned % is linear across each task’s start–finish. Compliance = share of due tasks that are done.',
    goodBadFa:
      'SPI نزدیک ۱۰۰٪ یا بالاتر خوب است. زیر ۹۵٪ یعنی کمی عقب؛ زیر ۸۰٪ جدی است. کمبود مصالح صفر خوب است. تأخیر روز هرچه کمتر بهتر. تأییدهای باز زیاد یعنی گلوگاه مدیریتی دارید نه فقط اجرایی.',
    goodBadEn:
      'SPI near/above 100% is good; under 95% slight lag; under 80% serious. Zero shortages good. Fewer delay days better. Many open approvals = management bottleneck.',
    whyFa:
      'اگر شروع واقعی قبل از امروز باشد ولی پیشرفت فعالیت‌ها صفر مانده باشد، SPI و انطباق پایین می‌آید. اگر انبار خالی باشد فقط کارت مصالح قرمز می‌شود.',
    whyEn:
      'Actual start in the past with 0% progress tanks SPI/compliance. Empty warehouse only hits the materials card.',
    improveFa: [
      'در صفحه زمان‌بندی، گزارش کارهای تا امروز را تأیید/اصلاح کنید',
      'سرپرست کارگاه با گزارش سریع درصد واقعی را به‌روز کند',
      'اقلام زیر حداقل موجودی را خریداری/تأمین کنید',
      'تأیید دستورات و گزارش‌های معلق را در مرکز تأیید ببندید',
      'روی فعالیت‌های «عقب» و «شروع‌نشده» در جدول انطباق تمرکز کنید',
    ],
    improveEn: [
      'Confirm/correct the until-today catch-up on Schedule',
      'Have the supervisor update % via quick report',
      'Restock items below min stock',
      'Clear pending approvals',
      'Focus on Behind / Not started rows in compliance',
    ],
    caveatsFa: [
      'SPI اینجا تقریبی و مبتنی بر زمان‌بندی خطی است؛ منحنی EV رسمی (اگر وارد شود) دقیق‌تر است',
      'اگر فعالیت‌ها درصد واقعی نداشته باشند، عدد گمراه‌کننده می‌شود',
    ],
    caveatsEn: [
      'SPI here is a linear-schedule estimate; a true EV curve would be more accurate',
      'Missing actual % makes numbers misleading',
    ],
  },

  wsi: {
    id: 'wsi',
    titleFa: 'WSI — کفایت نیرو',
    titleEn: 'WSI — Workforce Sufficiency',
    subtitleFa: 'آیا نیروی کار برای جبهه‌های فعال کافی است؟',
    subtitleEn: 'Is crew capacity enough for active fronts?',
    whatFa:
      'WSI (Workforce Sufficiency Index) عددی از ۰ تا ۱۰۰ است که می‌گوید پوشش نیروی کار نسبت به فشار اجرایی چقدر کافی به نظر می‌رسد. عدد پایین یعنی احتمال دارد کار به‌خاطر کمبود نیرو یا تأخیرهای مرتبط با نیرو عقب بیفتد.',
    whatEn:
      'WSI (0–100) estimates whether workforce coverage matches execution pressure. Low = labor-related slip risk.',
    sourceFa:
      'تعداد فعالیت‌های تأخیردار، فعالیت‌های بحرانی، و سهم فعالیت‌های عقب/شروع‌نشده در چک‌لیست تا امروز. فعلاً از شمارش نفرات واقعی کارگاه استفاده نمی‌شود مگر بعداً وصل شود.',
    sourceEn:
      'Delayed tasks, critical tasks, and behind/not-started share. Not yet from real headcount unless later wired.',
    howFa:
      'تقریباً: از ۱۰۰ کم می‌کنیم جریمه تأخیرها، کمبود نیروی تخمینی، فعالیت‌های بحرانی و سهم عقب‌ماندگی. آستانه هشدار حدود ۷۰ و بحرانی حدود ۵۵ است.',
    howEn:
      'Start at 100 and subtract penalties for delays, estimated labor shortage, critical tasks, and behind share. Warn ~70, critical ~55.',
    goodBadFa:
      'بالای ۷۰ معمولاً قابل قبول است. بین ۵۵–۷۰ هشدار. زیر ۵۵ یعنی باید فوراً نیرو/پیمانکار/اولویت جبهه‌ها را بازچینید.',
    goodBadEn: 'Above 70 OK; 55–70 warning; below 55 reallocate crews/subs/priorities now.',
    whyFa:
      'اگر خیلی از فعالیت‌ها تأخیر دارند یا مسیر بحرانی شلوغ است، WSI حتی با انبار پر هم پایین می‌آید.',
    whyEn: 'Many delays or a crowded critical path pull WSI down even with full materials.',
    improveFa: [
      'جبهه‌های غیرضروری را موقتاً کم کنید و نیرو را روی مسیر بحرانی بگذارید',
      'پیمانکار/گروه کاری اضافه برای فعالیت‌های عقب معرفی کنید',
      'علت تأخیر (دسترسی، مصالح، دستور کار) را جدا کنید تا فقط «کمبود نیرو» فرض نشود',
    ],
    improveEn: [
      'Pause noncritical fronts; put crews on critical path',
      'Add subcontractor/crew for behind activities',
      'Separate true labor shortage from access/material blockers',
    ],
    caveatsFa: [
      'WSI فعلاً شاخص تقریبی است نه شمارش دقیق نفر-روز',
      'روند چندروزه تا وقتی تاریخچه روزانه ذخیره نشود، مدل تقریبی است',
    ],
    caveatsEn: [
      'WSI is approximate, not exact man-days',
      'Multi-day trend is modeled until daily history exists',
    ],
  },

  mrs: {
    id: 'mrs',
    titleFa: 'MRS — آمادگی مصالح',
    titleEn: 'MRS — Material Readiness',
    subtitleFa: 'آیا انبار جلوی توقف کار را می‌گیرد؟',
    subtitleEn: 'Will the warehouse prevent stoppages?',
    whatFa:
      'MRS (Material Readiness Score) نشان می‌دهد موجودی انبار نسبت به حداقل تعریف‌شده چقدر سالم است. عدد پایین یعنی خطر توقف جبهه به‌خاطر کمبود مصالح.',
    whatEn:
      'MRS reflects warehouse health vs min stock. Low = stoppage risk from materials.',
    sourceFa: 'اقلام انبار (موجودی فعلی و حداقل موجودی) از داشبورد انباردار.',
    sourceEn: 'Inventory items (current vs min stock) from storekeeper data.',
    howFa:
      'از ۱۰۰ به‌ازای هر قلم زیر حداقل موجودی کم می‌شود. اگر چند قلم همزمان کم باشد، جریمه بیشتر می‌شود. آستانه هشدار حدود ۷۵ است.',
    howEn:
      'Start at 100; subtract per item below min stock (extra penalty if many). Warn around 75.',
    goodBadFa:
      'نزدیک ۱۰۰ عالی است. زیر ۷۵ یعنی باید خرید/تأمین را جدی بگیرید. صفر یا خیلی پایین یعنی چند قلم بحرانی خالی است.',
    goodBadEn: 'Near 100 excellent; under 75 needs procurement; very low = several critical stockouts.',
    whyFa: 'اگر انباردار حداقل موجودی را درست تعریف نکرده باشد، MRS می‌تواند گمراه‌کننده شود (خیلی خوش‌بین یا بدبین).',
    whyEn: 'Bad min-stock settings make MRS misleading.',
    improveFa: [
      'اقلام قرمز انبار را در تدارکات به درخواست خرید تبدیل کنید',
      'حداقل موجودی را واقعی تنظیم کنید',
      'مصالح مسیر بحرانی را جداگانه اولویت‌بندی کنید',
    ],
    improveEn: [
      'Turn red stock items into purchase requests',
      'Set realistic min stock',
      'Prioritize critical-path materials',
    ],
    caveatsFa: [
      'MRS کیفیت مصالح یا زمان تحویل تأمین‌کننده را نمی‌سنجد؛ فقط موجودی فعلی را',
      'اگر انبار خالی از داده باشد، سیستم MRS را ناقص/هشدار نشان می‌دهد',
    ],
    caveatsEn: [
      'MRS does not measure quality or supplier lead time—only current stock',
      'Empty inventory data makes MRS incomplete',
    ],
  },

  csi: {
    id: 'csi',
    titleFa: 'CSI — یکپارچگی کنترل زمان‌بندی',
    titleEn: 'CSI — Schedule Control Integrity',
    subtitleFa: 'آیا برنامه و واقعیت هنوز به هم وصل‌اند؟',
    subtitleEn: 'Are plan and reality still connected?',
    whatFa:
      'CSI می‌گوید کنترل زمان‌بندی چقدر سالم است: فاصله برنامه و واقعیت، تأخیر روز، فعالیت‌های بحرانی و سهم عقب‌ماندگی. کنارش معمولاً SPI تقریبی هم دیده می‌شود.',
    whatEn:
      'CSI measures schedule-control health: plan–actual gap, delay days, critical tasks, behind share. Often shown with approximate SPI.',
    sourceFa: 'همان داده‌های برنامه، پیشرفت واقعی، و چک‌لیست انطباق تا امروز.',
    sourceEn: 'Schedule, actual progress, until-today compliance.',
    howFa:
      'از ۱۰۰ کم می‌کنیم: فاصله برنامه−واقعی، روزهای تأخیر، تعداد بحرانی‌ها، و سهم عقب/شروع‌نشده. آستانه هشدار حدود ۷۰–۷۲ است.',
    howEn:
      'From 100 subtract plan−actual gap, delay days, critical count, behind share. Warn ~70–72.',
    goodBadFa:
      'بالای ۷۰ یعنی برنامه هنوز قابل اتکاست. پایین‌تر یعنی یا برنامه به‌روز نیست یا اجرا از برنامه جدا شده و باید بازبرنامه‌ریزی/بازیابی کنید.',
    goodBadEn:
      'Above 70 means the plan is still trustworthy; lower means replan/recovery is needed.',
    whyFa:
      'اگر همه فعالیت‌های گذشته «تأخیر» نشان بدهند ولی درصد واقعی صفر باشد، CSI خیلی پایین می‌آید—اغلب یعنی پیشرفت واقعی ثبت نشده، نه لزوماً فاجعه میدانی.',
    whyEn:
      'All past tasks overdue with 0% progress tanks CSI—often missing progress entry, not only field failure.',
    improveFa: [
      'پیشرفت واقعی را ثبت کنید (گزارش سریع / catch-up)',
      'برنامه جاری را با شروع واقعی هم‌راستا کنید',
      'فعالیت‌های بحرانی عقب را بازیابی یا بازتعریف کنید',
    ],
    improveEn: [
      'Enter actual progress (quick report / catch-up)',
      'Align live schedule with actual start',
      'Recover or redefine delayed critical activities',
    ],
    caveatsFa: ['CSI جایگزین جلسه کنترل پروژه نیست؛ فقط سیگنال است'],
    caveatsEn: ['CSI is a signal, not a substitute for a control meeting'],
  },

  'wsi-mrs-trend': {
    id: 'wsi-mrs-trend',
    titleFa: 'نمودار روند WSI و MRS',
    titleEn: 'WSI & MRS trend chart',
    subtitleFa: 'آیا نیرو و مصالح در چند روز اخیر بهتر شده یا بدتر؟',
    subtitleEn: 'Are workforce and materials improving or worsening?',
    whatFa:
      'این نمودار خطی چند روز اخیر را برای WSI، MRS و CSI نشان می‌دهد. خطوط نقطه‌چین آستانه هشدار هستند. اگر دو خط با هم پایین بیایند، خطر تأخیر زنجیره‌ای بالاست.',
    whatEn:
      'Line chart of recent WSI, MRS, CSI. Dashed lines are thresholds. Both falling = chain-delay risk.',
    sourceFa:
      'همان شاخص‌های روز جاری؛ سری چندروزه فعلاً تا ذخیره تاریخچه روزانه، به‌صورت مدل تقریبی از مقدار امروز ساخته می‌شود.',
    sourceEn:
      'Today’s indices; multi-day series is approximated from today’s values until daily history is stored.',
    howFa:
      'هر نقطه یک روز است. مقدار امروز دقیق‌تر است؛ روزهای قبل برای نمایش روند تقریبی پر می‌شوند. آستانه WSI=۷۰ و MRS=۷۵ روی نمودار کشیده شده.',
    howEn:
      'Each point is a day. Today is most accurate; prior days are filled for trend display. Thresholds WSI=70, MRS=75.',
    goodBadFa:
      'روند صعودی خوب است. روند نزولی هم‌زمان WSI و MRS بد است. اگر فقط یکی پایین باشد، مشکل را همان حوزه (نیرو یا مصالح) پیگیری کنید.',
    goodBadEn:
      'Upward good; both falling bad. If only one falls, chase that domain.',
    whyFa:
      'ممکن است خط صاف یا کمی مصنوعی به نظر برسد چون هنوز API تاریخچه زنده وصل نشده—عدد امروز را جدی‌تر از شکل دقیق منحنی بگیرید.',
    whyEn:
      'The curve may look synthetic until live history exists—trust today’s level more than exact shape.',
    improveFa: [
      'اگر MRS نزولی است: خرید و تحویل مصالح',
      'اگر WSI نزولی است: نیرو/پیمانکار و اولویت جبهه',
      'اگر هر دو نزولی‌اند: جلسه هماهنگی فوری سرپرست + تدارکات + مدیر پروژه',
    ],
    improveEn: [
      'Falling MRS → buy/deliver materials',
      'Falling WSI → crew/sub + front priority',
      'Both falling → urgent SS + procurement + PM sync',
    ],
    caveatsFa: ['تا وقتی تاریخچه روزانه ذخیره نشود، این نمودار بیشتر آموزشی/تقریبی است'],
    caveatsEn: ['Until daily history is stored, treat this chart as approximate'],
  },

  'due-activities': {
    id: 'due-activities',
    titleFa: 'وضعیت فعالیت‌های موعد تا امروز',
    titleEn: 'Due activities status chart',
    subtitleFa: 'از کارهایی که باید تا امروز جلو می‌رفتند، چند تا کجا هستند؟',
    subtitleEn: 'Of work that should have progressed by today, where are they?',
    whatFa:
      'این نمودار میله‌ای چهار سطل دارد: انجام‌شده، مطابق برنامه، عقب از برنامه، شروع‌نشده (در حالی که باید شروع می‌شد). درصد هر ستون سهم آن سطل از فعالیت‌های موعد است.',
    whatEn:
      'Bars for Done / On track / Behind / Not started (but should have started). Each bar is % of due activities.',
    sourceFa:
      'فعالیت‌هایی که تاریخ شروع مؤثرشان ≤ امروز است، از برنامه جاری (بعد از شروع واقعی).',
    sourceEn: 'Tasks whose effective start ≤ today on the live schedule.',
    howFa:
      'برای هر فعالیت موعد: پیشرفت برنامه‌ای خطی تا امروز محاسبه می‌شود و با درصد واقعی مقایسه می‌شود. اگر واقعی≈برنامه → مطابق؛ اگر خیلی کمتر → عقب؛ اگر ۱۰۰٪ → انجام‌شده؛ اگر واقعی≈۰ و برنامه>۰ → شروع‌نشده.',
    howEn:
      'Compare linear planned % to actual %. Near plan = on track; much lower = behind; 100% = done; ~0 with planned>0 = not started.',
    goodBadFa:
      'میله «انجام‌شده» و «مطابق» بزرگ خوب است. «عقب» و «شروع‌نشده» اولویت پیگیری مدیر پروژه است.',
    goodBadEn: 'Large Done/On track good; Behind/Not started are PM priorities.',
    whyFa:
      'اگر شروع واقعی ماه‌ها قبل باشد و پیشرفت ثبت نشده باشد، میله «عقب/شروع‌نشده» خیلی بزرگ می‌شود.',
    whyEn: 'Old actual start with no progress entry inflates Behind/Not started.',
    improveFa: [
      'جدول انطباق زیر همین داشبورد را ردیف‌به‌ردیف ببندید',
      'برای هر فعالیت عقب، یک مسئول و تاریخ بازیابی تعیین کنید',
      'اگر واقعاً انجام شده، درصد را ثبت کنید تا نمودار درست شود',
    ],
    improveEn: [
      'Work the compliance table row by row',
      'Assign owner + recovery date per behind task',
      'If done in field, enter % so the chart corrects',
    ],
    caveatsFa: ['این نمودار جایگزین Gantt نیست؛ فقط وضعیت کنترل تا امروز است'],
    caveatsEn: ['Not a Gantt—only control status through today'],
  },

  'readiness-donut': {
    id: 'readiness-donut',
    titleFa: 'آمادگی کلی پروژه (دونات)',
    titleEn: 'Overall readiness donut',
    subtitleFa: 'ترکیب نیرو، مصالح، زمان‌بندی و حاشیه ریسک',
    subtitleEn: 'Mix of workforce, materials, schedule, and risk buffer',
    whatFa:
      'این دونات چهار بخش دارد: نیرو (WSI)، مصالح (MRS)، زمان‌بندی (CSI) و «حاشیه ریسک». حاشیه ریسک یعنی چقدر از وضعیت پایدار فاصله دارید—هرچه بزرگ‌تر، شکننده‌تر.',
    whatEn:
      'Donut of Workforce (WSI), Materials (MRS), Schedule (CSI), and Risk buffer. Larger risk slice = more fragile.',
    sourceFa: 'مستقیماً از مقادیر WSI/MRS/CSI همان لحظه.',
    sourceEn: 'Directly from current WSI/MRS/CSI.',
    howFa:
      'سه بخش اول همان اعداد شاخص‌ها هستند. حاشیه ریسک ≈ ۱۰۰ − حداقل(WSI, MRS, CSI). یعنی ضعیف‌ترین حلقه، اندازه ریسک را بزرگ می‌کند.',
    howEn:
      'First three slices are the indices. Risk buffer ≈ 100 − min(WSI,MRS,CSI).',
    goodBadFa:
      'اگر سه بخش رنگی بزرگ و حاشیه ریسک کوچک باشد خوب است. حاشیه ریسک خیلی بزرگ یعنی حداقل یکی از شاخص‌ها خراب است.',
    goodBadEn: 'Large colored slices + small risk buffer = good. Huge risk buffer = at least one index is bad.',
    whyFa: 'اگر WSI=۰ باشد، حاشیه ریسک تقریباً کل دونات را می‌گیرد—یعنی ضعیف‌ترین حلقه صفر است.',
    whyEn: 'If WSI=0, risk buffer dominates—the weakest link is zero.',
    improveFa: [
      'ضعیف‌ترین شاخص را پیدا کنید (معمولاً همان که دونات را خراب کرده) و همان را درست کنید',
      'بهبود همزمان هر سه حوزه لازم نیست؛ اول گلوگاه',
    ],
    improveEn: [
      'Fix the weakest index first',
      'You do not need to improve all three at once',
    ],
    caveatsFa: ['دونات نسبت‌ها را نشان می‌دهد نه بودجه یا هزینه'],
    caveatsEn: ['Shows readiness mix, not cost/budget'],
  },

  'risk-alerts': {
    id: 'risk-alerts',
    titleFa: 'هشدارهای ریسک',
    titleEn: 'Risk alerts',
    subtitleFa: 'لیست رنگی چیزهایی که باید همین هفته حواس‌تان باشد',
    subtitleEn: 'Color-coded items to watch this week',
    whatFa:
      'این پنل ریسک‌های استخراج‌شده از داده را فهرست می‌کند: تأخیر بحرانی، کمبود نیرو، کمبود مصالح، انحراف برنامه، و سیگنال‌های میدانی.',
    whatEn:
      'Lists derived risks: critical delay, labor, materials, schedule deviation, field signals.',
    sourceFa: 'شاخص‌ها + هشدارهای جدول alerts + وضعیت انبار و تأخیرها.',
    sourceEn: 'Indices + alerts table + warehouse + delays.',
    howFa:
      'اگر شرطی برقرار باشد (مثلاً تأخیر روز > ۰ یا MRS پایین)، یک کارت ریسک با شدت critical/warning/info ساخته می‌شود.',
    howEn:
      'If a condition holds (delay days > 0, low MRS, etc.), a risk card is created with severity.',
    goodBadFa:
      'لیست خالی یا فقط «بدون ریسک بالا» خوب است. چند کارت قرمز یعنی باید اولویت‌بندی کنید نه اینکه همه را همزمان حل کنید.',
    goodBadEn: 'Empty/low-risk list good. Many red cards → prioritize, do not boil the ocean.',
    whyFa:
      'عددهایی مثل «۱۶۸ روز تأخیر تجمعی» ممکن است از جمع تأخیر فعالیت‌های قدیمی بیاید—یعنی سیگنال قوی است که برنامه/پیشرفت نیاز به پاکسازی دارد.',
    whyEn:
      'Huge aggregate delay often means many old unfinished tasks—clean schedule/progress.',
    improveFa: [
      'هر هشدار قرمز را به یک اقدام در «الان باید چه کار کنم» وصل کنید',
      'هشدارهای میدانی را با سرپرست ببندید یا escalate کنید',
    ],
    improveEn: [
      'Map each red alert to an Action Now item',
      'Close or escalate field alerts with the supervisor',
    ],
    caveatsFa: ['شدت هشدار خودکار است؛ قضاوت نهایی با مدیر پروژه است'],
    caveatsEn: ['Severity is automatic; final judgment is the PM’s'],
  },

  insights: {
    id: 'insights',
    titleFa: 'بینش‌های عملیاتی',
    titleEn: 'Operational insights',
    subtitleFa: 'جملات کوتاه که معنی اعداد را به زبان اقدام می‌گویند',
    subtitleEn: 'Short sentences that turn numbers into actions',
    whatFa:
      'این کارت‌ها خلاصه تفسیری هستند: مثلاً چند فعالیت موعد انجام شده، SPI تقریبی چند است، آیا چک‌لیست فعال است یا نه.',
    whatEn:
      'Narrative cards: due-task counts, approximate SPI, whether compliance checklist is active.',
    sourceFa: 'خروجی همان موتور تحلیل و جدول انطباق.',
    sourceEn: 'Same analytics engine + compliance summary.',
    howFa: 'بر اساس آستانه‌ها متن فارسی/انگلیسی تولید می‌شود؛ عددها از داده زنده می‌آیند.',
    howEn: 'Threshold-based copy with live numbers.',
    goodBadFa: 'بینش سبز/آبی اطلاع است؛ نارنجی/قرمز یعنی اقدام.',
    goodBadEn: 'Info vs warning/critical = act.',
    whyFa: 'اگر شروع واقعی ثبت نشده باشد، بینش می‌گوید چک‌لیست فعال نیست—این یک راهنماست نه ایراد نرم‌افزار.',
    whyEn: 'Missing actual start yields “checklist inactive”—guidance, not a bug.',
    improveFa: ['هر بینش هشدار را به یک اقدام مشخص تبدیل کنید و مسئول بگذارید'],
    improveEn: ['Turn each warning insight into an owned action'],
    caveatsFa: ['بینش جایگزین جلسه فنی نیست'],
    caveatsEn: ['Not a substitute for a technical meeting'],
  },

  'plan-compliance': {
    id: 'plan-compliance',
    titleFa: 'جدول انطباق برنامه تا امروز',
    titleEn: 'Plan compliance through today',
    subtitleFa: 'تیک بزنید ببینید چه کارهایی باید تا امروز جلو می‌رفت',
    subtitleEn: 'Check which work should have progressed by today',
    whatFa:
      'جدولی از فعالیت‌هایی که طبق برنامه جاری باید تا امروز شروع شده باشند. برای هر ردیف: درصد برنامه، درصد واقعی، مانده، و وضعیت تیک (انجام / مطابق / عقب / شروع‌نشده).',
    whatEn:
      'Tasks that should have started by today: planned %, actual %, remaining, check status.',
    sourceFa:
      'project_tasks + تاریخ واقعی شروع پروژه. فقط وقتی شروع واقعی ≤ امروز باشد جدول فعال است.',
    sourceEn:
      'project_tasks + project actual start. Active only if actual start ≤ today.',
    howFa:
      'پیشرفت برنامه‌ای خطی بین start و finish مؤثر. مقایسه با percent_complete. تلرانس حدود ۵٪ برای «مطابق».',
    howEn:
      'Linear planned % between effective start/finish vs percent_complete. ~5% tolerance for on track.',
    goodBadFa:
      'تیک سبز/آبی خوب است. قرمز (عقب) و نارنجی (شروع‌نشده) باید پیگیری شوند. انحراف منفی میانگین یعنی پروژه از برنامه عقب است.',
    goodBadEn: 'Green/blue good; red/amber need follow-up. Negative average variance = behind plan.',
    whyFa:
      'اگر همه ردیف‌ها تأخیر باشند، یا اجرا عقب است یا پیشرفت ثبت نشده. اول ثبت واقعیت، بعد قضاوت.',
    whyEn: 'All delayed rows may mean lag or missing progress entry—enter reality first.',
    improveFa: [
      'در ادمین → زمان‌بندی، گزارش catch-up را پر کنید',
      'سرپرست با گزارش سریع درصد را به‌روز کند',
      'برای هر عقب‌مانده یک اقدام بازیابی بنویسید',
    ],
    improveEn: [
      'Fill catch-up on admin Schedule',
      'Supervisor updates % via quick report',
      'Write a recovery action per behind row',
    ],
    caveatsFa: [
      'برنامه خطی فرض می‌کند کار یکنواخت پیش می‌رود؛ در واقعیت ممکن است جلو/عقب باشد',
      'بدون شروع واقعی این جدول عمداً خاموش است',
    ],
    caveatsEn: [
      'Linear plan assumes steady work',
      'Without actual start the table stays off on purpose',
    ],
  },

  'data-gaps': {
    id: 'data-gaps',
    titleFa: 'وضعیت داده برای گزارش کامل',
    titleEn: 'Data readiness for full reporting',
    subtitleFa: 'اگر چیزی نیست، صریح می‌گوید نیست و از کجا بیاورید',
    subtitleEn: 'Explicitly says what is missing and where to get it',
    whatFa:
      'چک‌لیست سلامت داده: برنامه، شروع واقعی، انبار، گزارش روزانه، پیشرفت/هزینه EV، هزینه‌های واقعی. برای هر مورد وضعیت موجود / ناقص / نیست و مسیر تکمیل.',
    whatEn:
      'Data health checklist: schedule, actual start, inventory, daily reports, EV progress/cost, actual costs—with where to fill gaps.',
    sourceFa: 'وجود ردیف در جداول مربوط + متادیتای پروژه.',
    sourceEn: 'Row existence in related tables + project schedule meta.',
    howFa: 'اگر جدول خالی یا فیلد خالی باشد → نیست/ناقص؛ وگرنه موجود.',
    howEn: 'Empty table/field → missing/partial; else OK.',
    goodBadFa: 'هرچه موارد «موجود» بیشتر، شاخص‌ها قابل اعتمادتر. موارد critical missing یعنی کنترل پروژه فعلاً ناقص است.',
    goodBadEn: 'More OK items = more trustworthy KPIs. Critical missing = incomplete control.',
    whyFa: 'مثلاً بدون شروع واقعی، چک‌لیست انطباق روشن نمی‌شود—عمدی است تا عدد جعلی نشان ندهیم.',
    whyEn: 'Without actual start, compliance stays off—on purpose.',
    improveFa: [
      'لینک «از کجا» را باز کنید و داده را وارد کنید',
      'اول criticalها را ببندید (برنامه و شروع واقعی)',
    ],
    improveEn: [
      'Follow the Where links',
      'Close critical gaps first (schedule + actual start)',
    ],
    caveatsFa: ['این پنل کیفیت داده را تضمین نمی‌کند؛ فقط وجود داده را'],
    caveatsEn: ['Checks presence, not data quality'],
  },

  'recent-reports': {
    id: 'recent-reports',
    titleFa: 'گزارش‌های اخیر / آرشیو',
    titleEn: 'Recent reports / archive',
    subtitleFa: 'آخرین گزارش‌های روزانه کارگاه که به سیستم رسیده‌اند',
    subtitleEn: 'Latest site daily reports in the system',
    whatFa:
      'فهرست کوتاه آخرین گزارش‌های روزانه سرپرست کارگاه. برای دیدن اینکه کارگاه دارد واقعیت را ثبت می‌کند یا نه.',
    whatEn: 'Short list of latest supervisor daily reports—proof the site is logging reality.',
    sourceFa: 'جدول daily_reports پروژه.',
    sourceEn: 'Project daily_reports table.',
    howFa: 'آخرین چند گزارش بر اساس تاریخ/زمان ایجاد مرتب می‌شوند.',
    howEn: 'Latest few reports sorted by created time.',
    goodBadFa:
      'گزارش منظم روزانه خوب است. خالی بودن لیست یعنی داده میدانی نمی‌آید و شاخص‌های پیشرفت ضعیف می‌شوند.',
    goodBadEn: 'Regular daily reports good; empty list means weak progress signals.',
    whyFa: 'اگر سرپرست گزارش ندهد، مدیر پروژه دیرتر از واقعیت باخبر می‌شود.',
    whyEn: 'No supervisor reports → PM learns late.',
    improveFa: [
      'از سرپرست بخواهید هر روز گزارش سریع/روزانه بزند',
      'گزارش‌های معلق را در مرکز تأیید ببندید',
    ],
    improveEn: [
      'Require daily/quick reports from the supervisor',
      'Clear pending report approvals',
    ],
    caveatsFa: ['این آرشیو کامل همه گزارش‌ها نیست؛ میانبر است'],
    caveatsEn: ['Shortcut list, not the full archive'],
  },

  'action-now': {
    id: 'action-now',
    titleFa: 'الان باید چه کار کنم؟',
    titleEn: 'What should I do now?',
    subtitleFa: 'لیست اولویت‌دار اقدام، نه فقط اطلاعات',
    subtitleEn: 'Prioritized actions, not just information',
    whatFa:
      '۵ اقدام پیشنهادی بر اساس وضعیت امروز: مثلاً مدیریت مسیر بحرانی، ثبت گزارش، بررسی تأییدها، پیگیری مصالح.',
    whatEn:
      'Up to five suggested actions from today’s state: critical path, reports, approvals, materials.',
    sourceFa: 'خروجی لایه اجرایی (ریسک‌ها و اولویت‌ها).',
    sourceEn: 'Executive layer risks/priorities.',
    howFa: 'بر اساس شدت ریسک و نوع مشکل، اقدام‌ها مرتب می‌شوند (فوری / مهم / عادی).',
    howEn: 'Sorted by severity/type (urgent / important / normal).',
    goodBadFa: 'داشتن اقدام فوری بد نیست—یعنی سیستم اولویت را روشن کرده. بی‌عملی نسبت به اقدام فوری بد است.',
    goodBadEn: 'Urgent items are clarity, not failure—ignoring them is the failure.',
    whyFa: 'اگر ۲ تأیید معلق دارید، یکی از اقدام‌ها همان بررسی مرکز تأیید است.',
    whyEn: 'Two pending approvals → an action points at the approval center.',
    improveFa: [
      'دکمه انجام را بزنید و همان روز ببندید',
      'اگر اقدام تکراری است، ریشه را درست کنید (مثلاً کمبود نیرو) تا فردا برنگردد',
    ],
    improveEn: [
      'Use Do and close it the same day',
      'Fix root causes so actions do not repeat',
    ],
    caveatsFa: ['اقدام‌ها پیشنهاد سیستم‌اند؛ ترتیب نهایی با شماست'],
    caveatsEn: ['Suggestions—you set final order'],
  },
}

export function getPmMetricGuide(id: string): PmMetricGuide | null {
  if (id in GUIDES) return GUIDES[id as PmMetricGuideId]
  return null
}

export function listPmMetricGuides(): PmMetricGuide[] {
  return Object.values(GUIDES)
}

export function pmMetricHelpHref(id: PmMetricGuideId): string {
  return `/help/pm-metrics/${id}`
}
