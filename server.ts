import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json());

app.use((req, res, next) => {
  const origin = (req.headers.origin as string) || "*";
  // Echo the request origin so browsers accept the response from cross-origin pages.
  // In production you should restrict this to a whitelist of known origins.
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  // Whether to allow cookies/credentials. Keep false unless you need them and then set a specific origin.
  res.setHeader("Access-Control-Allow-Credentials", "false");

  if (req.method === "OPTIONS") {
    // Respond to preflight immediately with the CORS headers
    return res.sendStatus(204);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

interface Group {
  id: string;
  label: string;
  capacity: number;
  registered: number;
  is_active?: boolean;
}

interface Student {
  id: string;
  name: string;
  governorate: string;
  city: string;
  school: string;
  phone: string;
  father_job: string;
  father_phone: string;
  mother_phone: string;
  score: number;
  group_id: string;
  created_at: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const useServiceRole = SUPABASE_SERVICE_ROLE.trim() !== "";
const isSupabaseConfigured = SUPABASE_URL.trim() !== "" && (SUPABASE_ANON_KEY.trim() !== "" || useServiceRole);

if (!isSupabaseConfigured) {
  console.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE in .env.");
  process.exit(1);
}

const supabaseKey = useServiceRole ? SUPABASE_SERVICE_ROLE : SUPABASE_ANON_KEY;
console.log(`[Supabase] Active. URL: ${SUPABASE_URL}`);
if (useServiceRole) {
  console.log("[Supabase] Using service role key for server-side writes.");
} else {
  console.warn("[Supabase] WARNING: Service role not configured. Inserts may fail if row-level security is enabled.");
}

const supabase = createClient(SUPABASE_URL, supabaseKey);
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "123456";

const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "غير مصرح: يرجى تسجيل الدخول كمسؤول أولا" });
    return;
  }
  const token = authHeader.replace("Bearer ", "");
  if (token !== ADMIN_PASSCODE) {
    res.status(403).json({ error: "رمز المرور غير صحيح" });
    return;
  }
  next();
};

const handleError = (res: express.Response, error: any, message: string) => {
  console.error(message, error);
  res.status(500).json({ error: message });
};

app.get("/api/config", (_req, res) => {
  res.json({
    supabaseActive: isSupabaseConfigured,
    defaultPasscodeUsed: ADMIN_PASSCODE === "123456",
  });
});

app.get("/api/groups", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء تحميل المجموعات");
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      governorate,
      city,
      school,
      phone,
      father_job,
      father_phone,
      mother_phone,
      score,
    } = req.body;

    if (!name || name.trim().split(/\s+/).length < 4) {
      res.status(400).json({ error: "الاسم رباعي مطلوب لمنع تشابه الأسماء (يجب إدخال 4 أسماء على الأقل)" });
      return;
    }
    if (!governorate || !city || !school) {
      res.status(400).json({ error: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }

    const phoneRegex = /^01[0125]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      res.status(400).json({ error: "رقم تليفون الطالب غير صالح يجب أن يتكون من 11 رقما ويبدأ بـ 01" });
      return;
    }
    if (!phoneRegex.test(father_phone)) {
      res.status(400).json({ error: "رقم تليفون الأب غير صالح يجب أن يتكون من 11 رقما ويبدأ بـ 01" });
      return;
    }
    if (mother_phone && !phoneRegex.test(mother_phone)) {
      res.status(400).json({ error: "رقم تليفون الأم غير صالح يجب أن يتكون من 11 رقما ويبدأ بـ 01" });
      return;
    }

    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 280) {
      res.status(400).json({ error: "المجموع الكلي غير صالح الحد الأقصى لمجموع الشهادة الإعدادية هو 280 درجة" });
      return;
    }

    let activeGroup = null;
    const { data: activeGroups, error: activeGroupsError } = await supabase
      .from("groups")
      .select("*")
      .eq("is_active", true)
      .limit(1);

    if (activeGroupsError) throw activeGroupsError;
    if (activeGroups && activeGroups.length > 0) {
      activeGroup = activeGroups[0];
    }

    if (!activeGroup) {
      const { data: allGroups, error: allGroupsError } = await supabase
        .from("groups")
        .select("*")
        .order("id", { ascending: true })
        .limit(1);

      if (allGroupsError) throw allGroupsError;
      if (allGroups && allGroups.length > 0) {
        activeGroup = allGroups[0];
      }
    }

    if (!activeGroup) {
      const defaultGroup = {
        id: "group_default",
        label: "الصف الأول الثانوي - المجموعة العامة للتسجيل",
        capacity: 1000,
        registered: 0,
        is_active: true,
      };
      const { data: insertedGroup, error: insertGroupError } = await supabase
        .from("groups")
        .insert(defaultGroup)
        .select()
        .single();

      if (insertGroupError) throw insertGroupError;
      activeGroup = insertedGroup;
    }

    if (activeGroup.registered >= activeGroup.capacity) {
      res.status(400).json({ error: "عذرا هذه المجموعة مكتملة العدد بالفعل." });
      return;
    }

    const { data: existingStudent, error: checkError } = await supabase
      .from("students")
      .select("id")
      .or(`name.eq."${name.trim()}",phone.eq."${phone}"`)
      .limit(1);

    if (checkError) throw checkError;
    if (existingStudent && existingStudent.length > 0) {
      res.status(400).json({ error: "هذا الطالب مسجل بالفعل في المنصة (نفس الاسم أو نفس رقم الهاتف)" });
      return;
    }

    const { data: newStudent, error: insertError } = await supabase
      .from("students")
      .insert({
        name: name.trim(),
        governorate,
        city: city.trim(),
        school: school.trim(),
        phone,
        father_job: father_job.trim(),
        father_phone,
        mother_phone,
        score: parsedScore,
        group_id: activeGroup.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      const message = insertError?.message || "خطأ في Supabase";
      if (/row-level security/i.test(message) || /violates row-level security/i.test(message)) {
        res.status(500).json({
          error: "تم رفض التسجيل بسبب سياسة أمان صفوف Supabase. يرجى التأكد من أن مفتاح SUPABASE_SERVICE_ROLE موجود في .env أو تعديل سياسات Supabase لسماح الإدراج من الخادم."
        });
        return;
      }
      throw insertError;
    }

    const { data: updatedGroup } = await supabase
      .from("groups")
      .select("label")
      .eq("id", activeGroup.id)
      .single();

    res.status(201).json({
      success: true,
      student: {
        ...newStudent,
        group_label: updatedGroup?.label || activeGroup.label,
      },
    });
  } catch (error: any) {
    handleError(res, error, error.message || "حدث خطأ داخلي أثناء تسجيل البيانات");
  }
});

app.post("/api/admin/login", (req, res) => {
  const { passcode } = req.body;
  if (passcode === ADMIN_PASSCODE) {
    res.json({ success: true, token: ADMIN_PASSCODE });
  } else {
    res.status(401).json({ error: "رمز مرور الإدارة غير صحيح" });
  }
});

app.get("/api/admin/registrations", authenticateAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        groups:group_id (label)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const studentsFlat = data.map((s: any) => ({
      ...s,
      group_label: s.groups?.label || "غير محدد",
    }));

    res.json(studentsFlat);
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء تحميل كشف الحجوزات");
  }
});

app.delete("/api/admin/registrations/:id", authenticateAdmin, async (req, res) => {
  const studentId = req.params.id;
  try {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) throw error;
    res.json({ success: true, message: "تم حذف الحجز بنجاح" });
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء حذف الحجز");
  }
});

app.post("/api/admin/reset", authenticateAdmin, async (_req, res) => {
  try {
    const { error: studentDeleteErr } = await supabase
      .from("students")
      .delete()
      .neq("name", "");

    if (studentDeleteErr) throw studentDeleteErr;

    const { error: groupResetErr } = await supabase
      .from("groups")
      .update({ registered: 0 })
      .neq("id", "");

    if (groupResetErr) throw groupResetErr;

    res.json({ success: true, message: "تم إعادة تهيئة قاعدة البيانات بنجاح" });
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء إعادة تهيئة البيانات");
  }
});

app.post("/api/admin/groups", authenticateAdmin, async (req, res) => {
  const { label, capacity } = req.body;
  if (!label || !capacity) {
    res.status(400).json({ error: "اسم المجموعة والسعة مطلوبان" });
    return;
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    res.status(400).json({ error: "السعة يجب أن تكون رقما أكبر من صفر" });
    return;
  }

  try {
    const newGroup: Group = {
      id: "group_" + Math.random().toString(36).substr(2, 9),
      label: label.trim(),
      capacity: parsedCapacity,
      registered: 0,
      is_active: false,
    };

    const { data, error } = await supabase
      .from("groups")
      .insert(newGroup)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء إنشاء المجموعة");
  }
});

app.put("/api/admin/groups/:id/activate", authenticateAdmin, async (req, res) => {
  const groupId = req.params.id;
  try {
    const { error: resetErr } = await supabase
      .from("groups")
      .update({ is_active: false })
      .neq("id", "");

    if (resetErr) throw resetErr;

    const { data, error } = await supabase
      .from("groups")
      .update({ is_active: true })
      .eq("id", groupId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء تفعيل المجموعة");
  }
});

app.delete("/api/admin/groups/:id", authenticateAdmin, async (req, res) => {
  const groupId = req.params.id;
  try {
    const { data: studentsCount, error: countErr } = await supabase
      .from("students")
      .select("id")
      .eq("group_id", groupId);

    if (countErr) throw countErr;
    if (studentsCount && studentsCount.length > 0) {
      res.status(400).json({ error: "لا يمكن حذف هذه المجموعة لأنها تحتوي على طلاب مسجلين بالفعل" });
      return;
    }

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);

    if (error) throw error;
    res.json({ success: true, message: "تم حذف المجموعة بنجاح" });
  } catch (error: any) {
    handleError(res, error, "حدث خطأ أثناء حذف المجموعة");
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] running on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  });
}

startServer();
