-- ==========================================
-- منصة الحجز الإلكتروني الذكية – الأستاذ محمود الديب
-- مخطط قاعدة البيانات (Database Schema) لـ Supabase
-- للعام الدراسي 2026 - 2027
-- ==========================================

-- 1. إنشاء جدول المجموعات المتاحة
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(50) PRIMARY KEY,
    label TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    registered INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. تمكين الحماية لجدول المجموعات (اختياري)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة المجموعات (Students and Admins)
CREATE POLICY "Allow public read for groups" ON groups
    FOR SELECT USING (true);

-- السماح للإداريين بتحديث المجموعات
CREATE POLICY "Allow all actions for admins on groups" ON groups
    FOR ALL USING (true);


-- 3. إنشاء جدول الطلاب المسجلين
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    governorate TEXT NOT NULL,
    city TEXT NOT NULL,
    school TEXT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    father_job TEXT NOT NULL,
    father_phone VARCHAR(15) NOT NULL,
    mother_phone VARCHAR(15) NOT NULL,
    score NUMERIC(5,2) NOT NULL, -- يقبل درجات مثل 275.50
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. تمكين الحماية لجدول الطلاب
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بتقديم طلب حجز (Insert)
CREATE POLICY "Allow public insert for students" ON students
    FOR INSERT WITH CHECK (true);

-- السماح بالوصول الكامل للإداريين لقراءة وتعديل وحذف بيانات الطلاب
CREATE POLICY "Allow select for all (or Admin only depending on use-case)" ON students
    FOR SELECT USING (true); -- للتسهيل، أو يمكن تقييدها بـ auth.role() = 'authenticated'

CREATE POLICY "Allow all actions for admins on students" ON students
    FOR ALL USING (true);


-- 5. وظيفة وتريجر لتحديث عدد الطلاب المسجلين في المجموعة تلقائياً عند تسجيل طالب جديد
CREATE OR REPLACE FUNCTION increment_group_registered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups
    SET registered = registered + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_group_registered
AFTER INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION increment_group_registered();


-- 6. وظيفة وتريجر لتقليص عدد الطلاب المسجلين عند حذف طالب
CREATE OR REPLACE FUNCTION decrement_group_registered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups
    SET registered = GREATEST(0, registered - 1)
    WHERE id = OLD.group_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_group_registered
AFTER DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION decrement_group_registered();


-- 7. إدخال المجموعات الافتراضية للأستاذ محمود الديب
INSERT INTO groups (id, label, capacity, registered) VALUES
('group_sat_2pm', 'السبت - الساعة 02:00 مساءً', 60, 0),
('group_sat_4pm', 'السبت - الساعة 04:00 مساءً', 60, 0),
('group_sun_2pm', 'الأحد - الساعة 02:00 مساءً', 60, 0),
('group_sun_4pm', 'الأحد - الساعة 04:00 مساءً', 60, 0),
('group_tue_2pm', 'الثلاثاء - الساعة 02:00 مساءً', 60, 0),
('group_tue_4pm', 'الثلاثاء - الساعة 04:00 مساءً', 60, 0),
('group_wed_2pm', 'الأربعاء - الساعة 02:00 مساءً', 60, 0),
('group_wed_4pm', 'الأربعاء - الساعة 04:00 مساءً', 60, 0)
ON CONFLICT (id) DO UPDATE 
SET label = EXCLUDED.label, capacity = EXCLUDED.capacity;
