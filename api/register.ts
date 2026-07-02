import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

function sendCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  sendCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
    } = body || {};

    if (!name || String(name).trim().split(/\s+/).length < 4) {
      return res.status(400).json({ error: 'الاسم رباعي مطلوب (٤ أسماء على الأقل)' });
    }
    if (!governorate || !city || !school) {
      return res.status(400).json({ error: 'يرجى ملء الحقول المطلوبة' });
    }

    const phoneRegex = /^01[0125]\d{8}$/;
    if (!phoneRegex.test(String(phone))) {
      return res.status(400).json({ error: 'رقم التليفون غير صالح' });
    }

    const parsedScore = parseFloat(String(score || ''));
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 280) {
      return res.status(400).json({ error: 'المجموع غير صالح' });
    }

    // Find active group
    let activeGroup: any = null;
    try {
      const { data: activeGroups, error: agErr } = await supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .limit(1);
      if (agErr) throw agErr;
      if (activeGroups && activeGroups.length) activeGroup = activeGroups[0];
    } catch (e) {
      console.error('Error finding active group:', e);
    }

    if (!activeGroup) {
      const { data: firstGroups, error: fgErr } = await supabase
        .from('groups')
        .select('*')
        .order('id', { ascending: true })
        .limit(1);
      if (fgErr) console.error('Error finding fallback group:', fgErr);
      if (firstGroups && firstGroups.length) activeGroup = firstGroups[0];
    }

    if (!activeGroup) {
      // Seed default group
      const defaultGroup = {
        id: 'group_default',
        label: 'المجموعة الافتراضية',
        capacity: 1000,
        registered: 0,
        is_active: true,
      };
      const { data: inserted, error: insertErr } = await supabase
        .from('groups')
        .insert(defaultGroup)
        .select()
        .single();
      if (insertErr) {
        console.error('Error inserting default group:', insertErr);
      } else {
        activeGroup = inserted;
      }
    }

    if (!activeGroup) return res.status(500).json({ error: 'No active group available' });
    if (activeGroup.registered >= activeGroup.capacity) {
      return res.status(400).json({ error: 'المجموعة مكتملة' });
    }

    // Check duplicate
    const { data: existing, error: checkErr } = await supabase
      .from('students')
      .select('id')
      .or(`name.eq."${String(name).trim()}",phone.eq."${String(phone)}"`)
      .limit(1);
    if (checkErr) console.error('checkErr', checkErr);
    if (existing && existing.length) return res.status(400).json({ error: 'مسجل بالفعل' });

    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert({
        name: String(name).trim(),
        governorate,
        city: String(city).trim(),
        school: String(school).trim(),
        phone: String(phone),
        father_job: String(father_job || '').trim(),
        father_phone: String(father_phone || ''),
        mother_phone: String(mother_phone || ''),
        score: parsedScore,
        group_id: activeGroup.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      if (/row-level security/i.test(insertError.message || '')) {
        return res.status(500).json({ error: 'RLS error: ensure SUPABASE_SERVICE_ROLE is set' });
      }
      return res.status(500).json({ error: insertError.message || 'Supabase error' });
    }

    return res.status(201).json({ success: true, student: newStudent });
  } catch (err: any) {
    console.error('Register handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
