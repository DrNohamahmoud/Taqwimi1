# نشر النسخة الفعلية (مع Gemini حقيقي)

GitHub Pages يستضيف ملفات ثابتة فقط، ولا يستطيع تشغيل خادم Node (`server.ts`) الذي يتصل بـ Gemini. لتشغيل التطبيق الحقيقي بكل ميزاته، استضيفيه على منصة تدعم تشغيل خوادم Node.

## الخيار الأول: Glitch (لا يتطلب بطاقة ائتمان إطلاقًا)

1. سجّلي دخول على [glitch.com](https://glitch.com) (يمكن بحساب GitHub مباشرة).
2. **New Project → Import from GitHub**.
3. الصقي رابط مستودعك: `https://github.com/<username>/taqwimi`
4. سينسخ Glitch المشروع تلقائيًا، وينفّذ `npm install` — وبفضل سكربت `postinstall` المُضاف، سيقوم ببناء المشروع (`npm run build`) تلقائيًا في نفس الخطوة.
5. من القائمة الجانبية اضغطي على **.env** (ملف الأسرار الخاص بالمشروع، لا يُرفع لـ GitHub تلقائيًا)، وأضيفي فيه:
   ```
   GEMINI_API_KEY=مفتاحك_الحقيقي_هنا
   ```
6. Glitch سيشغّل المشروع تلقائيًا (`npm start`)، وسيعطيك رابطًا مباشرًا مثل:
   `https://taqwimi.glitch.me`
   هذا الرابط يشغّل **التطبيق الحقيقي كاملاً** بالتوليد والتحكيم عبر Gemini فعليًا.

**ملاحظة:** المشروع المجاني على Glitch "ينام" بعد ٥ دقائق من عدم الاستخدام، ويستغرق نحو ٣٠ ثانية للاستيقاظ عند أول زيارة تالية — هذا طبيعي.

## الخيار الثاني: Render (قد يطلب بطاقة للتحقق الأمني أحيانًا)

1. سجّلي / سجّلي دخول على [render.com](https://render.com) (يمكن الدخول مباشرة بحساب GitHub).
2. **New → Web Service**.
3. اختاري مستودع `taqwimi` من قائمة مستودعاتك على GitHub (اربطي حسابك إن لم يكن مربوطًا).
4. في إعدادات الخدمة:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free يكفي للتجربة.
5. من تبويب **Environment**، أضيفي متغير بيئة:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** مفتاح Gemini API الحقيقي الخاص بك (من [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
6. اضغطي **Create Web Service**.
7. بعد انتهاء النشر (Deploy) ستحصلين على رابط مثل:
   `https://taqwimi.onrender.com`

## ملاحظات عامة

- كل مرة تعملين فيها `git push` لفرع main، كل من Render وGlitch (عند ربطه بـ GitHub) يعيدان النشر تلقائيًا بنفس الطريقة.
- رابط GitHub Pages (`drnohamahmoud.github.io/taqwimi`) يبقى صالحًا كعرض تفاعلي تجريبي منفصل بدون اتصال حقيقي بالذكاء الاصطناعي؛ لا حاجة لحذفه.
- لا تشاركي مفتاح `GEMINI_API_KEY` مع أي شخص، ولا تضعيه أبدًا داخل الكود أو أي ملف يُرفع لـ GitHub — فقط في خانة الأسرار/البيئة الخاصة بالمنصة (.env في Glitch، أو Environment في Render).

