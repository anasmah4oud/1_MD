# دليل ربط منصة الحجز بـ Supabase وتشغيلها بالكامل 🚀

تم تصميم هذه المنصة لتشغيل وتخزين بيانات حجوزات الطلاب ومجموعات الأستاذ محمود الديب إما محلياً (كخيار احتياطي للتجربة) أو بشكل سحابي كامل ومؤمن بالاعتماد على قاعدة بيانات **Supabase (PostgreSQL)**.

---

## 📌 الخطوة 1: إنشاء مشروع على Supabase
1. توجه إلى موقع [Supabase](https://supabase.com) وسجل دخولك.
2. قم بإنشاء مشروع جديد (**New Project**) واختر اسماً للمشروع وكلمة مرور قوية لقاعدة البيانات.
3. انتظر بضع ثوانٍ حتى يتم تهيئة المشروع بالكامل.

---

## 📌 الخطوة 2: تهيئة الجداول وتشغيل الـ Triggers (مهم جداً للعدّ التلقائي للسعة)
لتشغيل المنصة بالشكل الصحيح والعد التلقائي للطلاب المقبولين داخل كل مجموعة، انتقل إلى قسم **SQL Editor** في لوحة تحكم Supabase، ثم افتح استعلاماً جديداً (**New Query**) وانسخ الكود التالي بالكامل ثم اضغط على **Run**:

```sql
-- 1. إنشاء جدول المجموعات لتتبع السعات الاستيعابية المتاحة لكل موعد
CREATE TABLE groups (
    id VARCHAR(50) PRIMARY KEY,
    label TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    registered INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. إنشاء جدول بيانات الطلاب المحجوزين بالربط مع المجموعات
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    governorate TEXT NOT NULL,
    city TEXT NOT NULL,
    school TEXT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    father_job TEXT NOT NULL,
    father_phone VARCHAR(15) NOT NULL,
    mother_phone VARCHAR(15) NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. دالة ومحفّز تلقائي (Trigger) لزيادة عدد المسجلين في المجموعة بمقدار 1 عند تسجيل طالب جديد
CREATE OR REPLACE FUNCTION increment_group_registered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups SET registered = registered + 1 WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_group_registered
AFTER INSERT ON students FOR EACH ROW EXECUTE FUNCTION increment_group_registered();

-- 4. دالة ومحفّز تلقائي (Trigger) لتقليل عدد المسجلين في المجموعة عند حذف طالب من لوحة التحكم الإدارية
CREATE OR REPLACE FUNCTION decrement_group_registered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups SET registered = GREATEST(0, registered - 1) WHERE id = OLD.group_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_group_registered
AFTER DELETE ON students FOR EACH ROW EXECUTE FUNCTION decrement_group_registered();

-- 5. إدراج المجموعات الافتراضية المفعلة والمتاحة للحجز (يمكنك تعديلها لاحقاً من لوحة التحكم الإدارية)
INSERT INTO groups (id, label, capacity, registered, is_active) VALUES
('group_first', 'الصف الأول الثانوي - مجموعة السبت والأربعاء (الساعة 4:00 مساءً)', 150, 0, TRUE),
('group_second', 'الصف الأول الثانوي - مجموعة الأحد والثلاثاء (الساعة 6:00 مساءً)', 150, 0, FALSE);
```

---

## 📌 الخطوة 3: إدخال بيانات الاتصال في لوحة التحكم (مفاتيح البيئة Environment Variables)
لكي يتصل التطبيق بقاعدة بياناتك السحابية، تحتاج إلى إضافة المتغيرات التالية في إعدادات المنصة لديك (أو في ملف `.env` في بيئة التشغيل):

1. **SUPABASE_URL**:
   * احصل عليه من لوحة تحكم Supabase بالذهاب إلى: **Project Settings** -> **API**.
   * انسخ الرابط الموجود تحت اسم `Project URL` (يبدأ بـ `https://`).

2. **SUPABASE_ANON_KEY**:
   * احصل عليه من لوحة تحكم Supabase بالذهاب إلى: **Project Settings** -> **API**.
   * انسخ المفتاح الموجود تحت اسم `Project API keys` بنوع `anon` و `public`.

3. **ADMIN_PASSCODE**:
   * رمز المرور الإداري الخاص بك للدخول إلى لوحة التحكم واستعراض كشوفات الحجز (القيمة الافتراضية هي `123456` ويمكنك تغييرها لأي رمز ترغب به للحماية).

---

## 📌 الخطوة 4: كيفية إدارة وحذف السجلات من لوحة التحكم الإدارية المدمجة
* للدخول بأمان وتصفح كشوفات الطلاب، قم بإضافة المسار التالي لعنوان المنصة:
  `https://your-domain.com/a/a/a/a/2/0/0/2/3` أو من خلال إضافة الرمز `#a/a/a/a/2/0/0/2/3` لنهاية الرابط.
* سيطلب منك النظام إدخال رمز المرور الإداري (`ADMIN_PASSCODE`).
* بمجرد الدخول، يمكنك تفعيل مجموعات معينة لتلقي الحجوزات عليها، أو إضافة مجموعات بمواعيد وسعات مختلفة، أو تصدير الكشوفات فوراً إلى ملف إكسل CSV بترميز متوافق مع كافة أنظمة الحواسيب والهواتف بمجرد الضغط على زر **"تصدير إكسل CSV"**.
* لحذف طالب من الكشف، اضغط على أيقونة الحذف بجانب اسم الطالب، وسيقوم النظام تلقائياً بتحديث السعة الاستيعابية المتبقية للمجموعة المرتبطة به.
* لتصفير جميع الحجوزات وإعادة تهيئة السعة لجميع المجموعات والبدء من جديد، يمكنك استخدام زر **"تهيئة البيانات وتصفير السجلات"**.

---

## 📌 معلومات تقنية إضافية وحفظ أمن البيانات
* تعمل المنصة بنظام حماية وإدارة الأخطاء؛ في حال تعطل اتصال الإنترنت أو عدم توفر مفاتيح البيئة، ستقوم تلقائياً بالتحويل على الحفظ المحلي المؤقت لضمان عدم توقف تسجيل الطلاب بأي شكل من الأشكال.
* جميع الأزرار والعمليات البرمجية بالموقع مفعلة وتعمل بنسبة 100% ومربوطة بأحداث حية تؤكد نجاح التسجيل فوراً وتوليد الإيصال المعتمد للطباعة وتصوير الشاشة.
