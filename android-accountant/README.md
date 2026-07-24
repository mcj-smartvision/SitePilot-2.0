# Liparta Accountant — Android App

اپ اندروید حرفه‌ای حسابداری که از اینترنت به داشبورد SitePilot وصل می‌شود.

## پیش‌نیاز

1. **Android Studio** (با Android SDK)
2. سرور SitePilot در دسترس روی اینترنت یا شبکه محلی (`npm run dev` یا دیپلوی)
3. حساب کاربر با نقش حسابدار پروژه

## پیش‌نمایش UI موبایل در مرورگر

```bash
npm run dev
```

باز کنید: [http://localhost:3000/accountant-app](http://localhost:3000/accountant-app)

یا با فلگ نیتیو: `/login?redirect=/accountant-app&native=1`

## ساخت APK

1. پوشه `android-accountant` را در Android Studio باز کنید.
2. آدرس سرور را تنظیم کنید:
   - امولاتور → پیش‌فرض `http://10.0.2.2:3000` (همان `localhost` روی PC)
   - گوشی واقعی روی Wi‑Fi:
     ```bash
     ./gradlew assembleDebug -PserverUrl=http://192.168.x.x:3000
     ```
   - دمو برای کارفرما (سرور عمومی):
     ```bash
     ./gradlew assembleRelease -PserverUrl=https://YOUR-DOMAIN
     ```
3. Run روی دستگاه یا خروجی APK:
   - Debug: `app/build/outputs/apk/debug/app-debug.apk`

## رفتار اپ

- Splash برند Liparta
- WebView تمام‌صفحه با کوکی لاگین
- شروع از `/login?redirect=/accountant-app&native=1`
- داشبورد موبایل با KPI، صورت‌وضعیت، هزینه، بدهی/انبار
- کار کاملاً آنلاین (اینترنت لازم است)

## Capacitor (اختیاری)

اگر بخواهید بعداً به Capacitor مهاجرت کنید، `capacitor.config.ts` و `capacitor-www/` آماده است.
برای دموی فعلی، پروژه Kotlin داخل `android-accountant/` مسیر اصلی است.
