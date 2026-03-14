# WhatsApp Bot Server - FIRST Shipping

سيرفر واتساب تلقائي لنظام FIRST Shipping.

## 🚀 طريقة التشغيل على Render.com (مجاني)

### الخطوة 1: ارفع الكود على GitHub
1. افتح [github.com](https://github.com) من هاتفك
2. سجل دخول أو أنشئ حساب
3. اضغط **"+"** ثم **"New repository"**
4. سمّيه `whatsapp-bot`
5. ارفع ملفات هذا المجلد (package.json + index.js)

### الخطوة 2: انشر على Render.com
1. افتح [render.com](https://render.com) من هاتفك
2. سجل بحساب GitHub
3. اضغط **"New +"** ثم **"Web Service"**
4. اختر ريبو `whatsapp-bot`
5. الإعدادات:
   - **Name:** `whatsapp-bot`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
6. اضغط **"Deploy"**

### الخطوة 3: امسح QR Code
1. بعد النشر، Render يعطيك رابط مثل: `https://whatsapp-bot-xxxx.onrender.com`
2. افتح: `https://whatsapp-bot-xxxx.onrender.com/qr`
3. امسح الكود من واتساب (الإعدادات → الأجهزة المرتبطة → ربط جهاز)

### الخطوة 4: اربط بالنظام
1. في نظام FIRST، روح صفحة **"رسائل واتساب"**
2. اضغط **"إعدادات السيرفر"**
3. الصق رابط Render: `https://whatsapp-bot-xxxx.onrender.com`
4. اضغط حفظ ✅

بعد كده كل أوردر جديد هيروح رسالة واتساب تلقائياً للعميل! 🎉

## ⚠️ ملاحظات مهمة
- سيرفر Render المجاني **يتوقف بعد 15 دقيقة بدون نشاط** ويعيد التشغيل تلقائياً
- عند إعادة التشغيل قد تحتاج مسح QR مرة أخرى
- لتجنب ذلك: استخدم [UptimeRobot](https://uptimerobot.com) لعمل ping كل 5 دقائق (مجاني)
