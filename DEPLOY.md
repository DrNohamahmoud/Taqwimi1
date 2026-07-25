# نشر النسخة الفعلية (مع Gemini حقيقي)

GitHub Pages يستضيف ملفات ثابتة فقط، ولا يستطيع تشغيل خادم Node (`server.ts`) الذي يتصل بـ Gemini. لتشغيل التطبيق الحقيقي بكل ميزاته، استضيفيه على منصة تدعم تشغيل خوادم Node — الأسهل مجانًا: **Render**.

## خطوات النشر على Render

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
6. اضغطي **Create Web Service**. سيقوم Render تلقائيًا بتثبيت الاعتماديات، بناء المشروع، وتشغيله.
7. بعد انتهاء النشر (Deploy) ستحصلين على رابط مثل:
   `https://taqwimi.onrender.com`
   هذا الرابط يشغّل **التطبيق الحقيقي كاملاً**، بما في ذلك التوليد والتحكيم عبر Gemini فعليًا.

## ملاحظات

- كل مرة تعملين فيها `git push` لفرع main، Render يعيد النشر تلقائيًا (Auto-Deploy) بنفس الطريقة.
- الخطة المجانية على Render "تنام" بعد فترة خمول ثم تستغرق نحو ٣٠-٥٠ ثانية لتبدأ من جديد عند أول زيارة — هذا طبيعي وليس عطلاً.
- رابط GitHub Pages (`drnohamahmoud.github.io/taqwimi`) يبقى صالحًا كعرض تفاعلي تجريبي منفصل بدون اتصال حقيقي بالذكاء الاصطناعي؛ لا حاجة لحذفه.
- لا تشاركي مفتاح `GEMINI_API_KEY` مع أي شخص، ولا تضعيه أبدًا داخل الكود أو أي ملف يُرفع لـ GitHub — فقط في خانة Environment الخاصة بـ Render.
