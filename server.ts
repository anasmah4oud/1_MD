import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json());

// Allow cross-origin requests when preview or frontend runs from another origin
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Simple request logger for debugging API routing
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// --- Interfaces ---
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

// --- Database Configuration & Fallback Engine ---
const DATA_FILE = path.join(process.cwd(), "data.json");
const DEFAULT_GROUPS: Group[] = [
  { id: 'group_first', label: 'الصف الأول الثانوي - مجموعة السبت والأربعاء (الساعة 4:00 مساءً)', capacity: 150, registered: 0, is_active: true },
  { id: 'group_second', label: 'الصف الأول الثانوي - مجموعة الأحد والثلاثاء (الساعة 6:00 مساءً)', capacity: 150, registered: 0, is_active: false }
];

// Helper to load local database if Supabase is not configured
function loadLocalData(): { groups: Group[]; students: Student[] } {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { groups: DEFAULT_GROUPS, students: [] as Student[] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading data.json, resetting to defaults...", e);
    const initialData = { groups: DEFAULT_GROUPS, students: [] as Student[] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

// Helper to save local database
function saveLocalData(data: { groups: Group[]; students: Student[] }) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const useServiceRole = SUPABASE_SERVICE_ROLE.trim() !== "";
const isSupabaseConfigured = SUPABASE_URL.trim() !== "" && (SUPABASE_ANON_KEY.trim() !== "" || useServiceRole);
let supabase: any = null;

if (isSupabaseConfigured) {
  const supabaseKey = useServiceRole ? SUPABASE_SERVICE_ROLE : SUPABASE_ANON_KEY;
  console.log(`[Supabase] Active. URL: ${SUPABASE_URL}`);
  if (useServiceRole) {
    console.log("[Supabase] Using service role key for server-side writes.");
  } else {
    console.warn("[Supabase] WARNING: Service role key not configured. Inserts may fail if row-level security is enabled.");
  }
  supabase = createClient(SUPABASE_URL, supabaseKey);
} else {
  console.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE in .env.");
  process.exit(1);
}

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "123456";

// --- Authorization Middleware for Admin Operations ---
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "غير مصرح: يرجى تسجيل الدخول كمسؤول أولاً" });
    return;
  }
  const token = authHeader.replace("Bearer ", "");
  if (token !== ADMIN_PASSCODE) {
    res.status(403).json({ error: "رمز المرور غير صحيح" });
    return;
  }
  next();
};

// --- API Endpoints ---

// 1. Get system configuration state
app.get("/api/config", (req, res) => {
  res.json({
    supabaseActive: isSupabaseConfigured,
    defaultPasscodeUsed: ADMIN_PASSCODE === "123456",
  });
});

// 2. Fetch available groups
app.get("/api/groups", async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      res.json(data);
    } else {
      const localData = loadLocalData();
      res.json(localData.groups);
    }
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تحميل المجموعات" });
  }
});

// 3. Register a new student
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

    // --- Server-Side Validation ---
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
      res.status(400).json({ error: "رقم تليفون الطالب غير صالح، يجب أن يتكون من 11 رقمًا ويبدأ بـ 01" });
      return;
    }
    if (!phoneRegex.test(father_phone)) {
      res.status(400).json({ error: "رقم تليفون الأب غير صالح، يجب أن يتكون من 11 رقمًا ويبدأ بـ 01" });
      return;
    }
    if (mother_phone && !phoneRegex.test(mother_phone)) {
      res.status(400).json({ error: "رقم تليفون الأم غير صالح، يجب أن يتكون من 11 رقمًا ويبدأ بـ 01" });
      return;
    }

    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 280) {
      res.status(400).json({ error: "المجموع الكلي غير صالح، الحد الأقصى لمجموع الشهادة الإعدادية هو 280 درجة" });
      return;
    }

    if (isSupabaseConfigured) {
      // Find the active group
      let activeGroup;
      try {
        const { data: activeGroups } = await supabase
          .from("groups")
          .select("*")
          .eq("is_active", true)
          .limit(1);

        if (activeGroups && activeGroups.length > 0) {
          activeGroup = activeGroups[0];
        } else {
          // Fallback to first available group
          const { data: allGroups } = await supabase
            .from("groups")
            .select("*")
            .order("id", { ascending: true })
            .limit(1);
          if (allGroups && allGroups.length > 0) {
            activeGroup = allGroups[0];
          }
        }
      } catch (e) {
        console.error("Error finding active group on Supabase:", e);
      }

      if (!activeGroup) {
        // Create default group
        activeGroup = {
          id: "group_default",
          label: "الصف الأول الثانوي - المجموعة العامة للتسجيل",
          capacity: 1000,
          registered: 0,
          is_active: true
        };
        try {
          await supabase.from("groups").insert(activeGroup);
        } catch (e) {
          console.error("Error seeding default group:", e);
        }
      }

      if (activeGroup.registered >= activeGroup.capacity) {
        res.status(400).json({ error: "عذرًا، هذه المجموعة مكتملة العدد بالفعل." });
        return;
      }

      // Check if student with same name or same student phone is already registered
      const { data: existingStudent, error: checkError } = await supabase
        .from("students")
        .select("id")
        .or(`name.eq."${name.trim()}",phone.eq."${phone}"`)
        .limit(1);

      if (existingStudent && existingStudent.length > 0) {
        res.status(400).json({ error: "هذا الطالب مسجل بالفعل في المنصة (نفس الاسم أو نفس رقم الهاتف)" });
        return;
      }

      // Insert student with the active group
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
            error: "تم رفض التسجيل بسبب سياسة أمان صفوف Supabase. يرجى التأكد من أن مفتاح SUPABASE_SERVICE_ROLE موجود في .env أو تعديل سياسات Supabase للسماح بالإدراج من الخادم."
          });
          return;
        }
        throw insertError;
      }

      // Group counts are automatically incremented by the Supabase DB trigger we provided!
      const { data: updatedGroup } = await supabase
        .from("groups")
        .select("label")
        .eq("id", activeGroup.id)
        .single();

      res.status(201).json({
        success: true,
        student: {
          ...newStudent,
          group_label: updatedGroup?.label || activeGroup.label
        }
      });

    } else {
      // Local fallback mode
      const localData = loadLocalData();
      let activeGroup = localData.groups.find((g) => g.is_active);

      if (!activeGroup) {
        activeGroup = localData.groups[0];
      }

      if (!activeGroup) {
        // Create default
        activeGroup = {
          id: "group_default",
          label: "الصف الأول الثانوي - المجموعة العامة للتسجيل",
          capacity: 1000,
          registered: 0,
          is_active: true
        };
        localData.groups.push(activeGroup);
      }

      if (activeGroup.registered >= activeGroup.capacity) {
        res.status(400).json({ error: "عذرًا، هذه المجموعة مكتملة العدد بالفعل." });
        return;
      }

      // Check duplicate
      const duplicate = localData.students.find(
        (s) => s.name.toLowerCase() === name.trim().toLowerCase() || s.phone === phone
      );
      if (duplicate) {
        res.status(400).json({ error: "هذا الطالب مسجل بالفعل في المنصة (نفس الاسم أو نفس رقم الهاتف)" });
        return;
      }

      // Create new student record with the active group_id
      const newStudent: Student = {
        id: "student_" + Math.random().toString(36).substr(2, 9),
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
        created_at: new Date().toISOString()
      };

      // Update structures
      activeGroup.registered += 1;
      localData.students.push(newStudent);
      saveLocalData(localData);

      res.status(201).json({
        success: true,
        student: {
          ...newStudent,
          group_label: activeGroup.label
        }
      });
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ داخلي أثناء تسجيل البيانات" });
  }
});

// 4. Admin Sign-In (check passcode)
app.post("/api/admin/login", (req, res) => {
  const { passcode } = req.body;
  if (passcode === ADMIN_PASSCODE) {
    res.json({ success: true, token: ADMIN_PASSCODE });
  } else {
    res.status(401).json({ error: "رمز مرور الإدارة غير صحيح" });
  }
});

// 5. Fetch registered students (Admin Only)
app.get("/api/admin/registrations", authenticateAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          groups:group_id (label)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform to flat schema for frontend convenience
      const studentsFlat = data.map((s: any) => ({
        ...s,
        group_label: s.groups?.label || "غير محدد"
      }));

      res.json(studentsFlat);
    } else {
      const localData = loadLocalData();
      // Combine with group labels
      const studentsFlat = localData.students.map((s) => {
        const g = localData.groups.find((grp) => grp.id === s.group_id);
        return {
          ...s,
          group_label: g ? g.label : "غير محدد"
        };
      });
      // Sort desc
      studentsFlat.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(studentsFlat);
    }
  } catch (error: any) {
    console.error("Admin fetch error:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تحميل كشف الحجوزات" });
  }
});

// 6. Delete a student registration (Admin Only)
app.delete("/api/admin/registrations/:id", authenticateAdmin, async (req, res) => {
  const studentId = req.params.id;
  try {
    if (isSupabaseConfigured) {
      // Supabase trigger will automatically decrement groups.registered!
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;
      res.json({ success: true, message: "تم حذف الحجز بنجاح" });
    } else {
      const localData = loadLocalData();
      const studentIdx = localData.students.findIndex((s) => s.id === studentId);

      if (studentIdx === -1) {
        res.status(404).json({ error: "لم يتم العثور على الطالب المحدد" });
        return;
      }

      const student = localData.students[studentIdx];
      // Decrement group count
      const group = localData.groups.find((g) => g.id === student.group_id);
      if (group) {
        group.registered = Math.max(0, group.registered - 1);
      }

      // Remove student
      localData.students.splice(studentIdx, 1);
      saveLocalData(localData);

      res.json({ success: true, message: "تم حذف الحجز بنجاح" });
    }
  } catch (error: any) {
    console.error("Admin delete error:", error);
    res.status(500).json({ error: "حدث خطأ أثناء حذف الحجز" });
  }
});

// 7. Reset all data (Admin Only)
app.post("/api/admin/reset", authenticateAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      // Delete all students first
      const { error: studentDeleteErr } = await supabase
        .from("students")
        .delete()
        .neq("name", ""); // Delete all

      if (studentDeleteErr) throw studentDeleteErr;

      // Reset group registered counts manually in case triggers didn't fire or just to be safe
      const { error: groupResetErr } = await supabase
        .from("groups")
        .update({ registered: 0 })
        .neq("id", "");

      if (groupResetErr) throw groupResetErr;

      res.json({ success: true, message: "تم إعادة تهيئة قاعدة البيانات بنجاح" });
    } else {
      const localData = {
        groups: DEFAULT_GROUPS.map((g) => ({ ...g, registered: 0 })),
        students: []
      };
      saveLocalData(localData);
      res.json({ success: true, message: "تم إعادة تهيئة قاعدة البيانات بنجاح" });
    }
  } catch (error: any) {
    console.error("Admin reset error:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إعادة تهيئة البيانات" });
  }
});

// 8. Add a new group (Admin Only)
app.post("/api/admin/groups", authenticateAdmin, async (req, res) => {
  const { label, capacity } = req.body;
  if (!label || !capacity) {
    res.status(400).json({ error: "اسم المجموعة والسعة مطلوبان" });
    return;
  }
  const parsedCapacity = parseInt(capacity);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    res.status(400).json({ error: "السعة يجب أن تكون رقماً أكبر من صفر" });
    return;
  }

  try {
    const newGroup: Group = {
      id: "group_" + Math.random().toString(36).substr(2, 9),
      label: label.trim(),
      capacity: parsedCapacity,
      registered: 0,
      is_active: false
    };

    if (isSupabaseConfigured) {
      // If we use Supabase, we insert the group
      // First check if table has is_active, let's try inserting it
      const { data, error } = await supabase
        .from("groups")
        .insert(newGroup)
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } else {
      const localData = loadLocalData();
      // If no groups exist or no group is active, make this active
      if (localData.groups.length === 0 || !localData.groups.some(g => g.is_active)) {
        newGroup.is_active = true;
      }
      localData.groups.push(newGroup);
      saveLocalData(localData);
      res.status(201).json(newGroup);
    }
  } catch (error: any) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء المجموعة" });
  }
});

// 9. Activate a group (Admin Only)
app.put("/api/admin/groups/:id/activate", authenticateAdmin, async (req, res) => {
  const groupId = req.params.id;
  try {
    if (isSupabaseConfigured) {
      // Set all groups to is_active = false
      const { error: resetErr } = await supabase
        .from("groups")
        .update({ is_active: false })
        .neq("id", "");
      if (resetErr) throw resetErr;

      // Set current to is_active = true
      const { data, error } = await supabase
        .from("groups")
        .update({ is_active: true })
        .eq("id", groupId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } else {
      const localData = loadLocalData();
      localData.groups.forEach(g => {
        g.is_active = g.id === groupId;
      });
      saveLocalData(localData);
      res.json({ success: true, message: "تم تفعيل المجموعة بنجاح" });
    }
  } catch (error: any) {
    console.error("Error activating group:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تفعيل المجموعة" });
  }
});

// 10. Delete a group (Admin Only)
app.delete("/api/admin/groups/:id", authenticateAdmin, async (req, res) => {
  const groupId = req.params.id;
  try {
    if (isSupabaseConfigured) {
      // Check if group is active or has students
      const { data: studentsCount, error: countErr } = await supabase
        .from("students")
        .select("id")
        .eq("group_id", groupId);

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
    } else {
      const localData = loadLocalData();
      const groupIdx = localData.groups.findIndex(g => g.id === groupId);
      if (groupIdx === -1) {
        res.status(404).json({ error: "المجموعة غير موجودة" });
        return;
      }

      const group = localData.groups[groupIdx];
      const hasStudents = localData.students.some(s => s.group_id === groupId);
      if (hasStudents) {
        res.status(400).json({ error: "لا يمكن حذف هذه المجموعة لأنها تحتوي على طلاب مسجلين بالفعل" });
        return;
      }

      localData.groups.splice(groupIdx, 1);
      // If we deleted the active group, make another active
      if (group.is_active && localData.groups.length > 0) {
        localData.groups[0].is_active = true;
      }
      saveLocalData(localData);
      res.json({ success: true, message: "تم حذف المجموعة بنجاح" });
    }
  } catch (error: any) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "حدث خطأ أثناء حذف المجموعة" });
  }
});

// --- Bootstrapping Server / Vite Configuration ---
async function startServer() {
  // Integrate Vite for asset bundling in Development Mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend build assets in Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] running on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  });
}

startServer();
