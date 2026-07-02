import React, { useState } from "react";
import { 
  User, MapPin, School, Phone, Briefcase, Award, 
  ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertTriangle, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Student, EGYPT_GOVERNORATES } from "../types";

interface BookingFormProps {
  onSuccess: (student: Student) => void;
}

export default function BookingForm({ onSuccess }: BookingFormProps) {
  // Form Steps: 1, 2, 3
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    governorate: "",
    city: "",
    school: "",
    phone: "",
    father_job: "",
    father_phone: "",
    mother_phone: "",
    score: ""
  });

  // Validation Helpers
  const validatePhone = (num: string) => {
    const regex = /^01[0125]\d{8}$/;
    return regex.test(num);
  };

  const validateStep = () => {
    setErrorMsg(null);

    if (step === 1) {
      // Name validation: Quad name check (at least 4 words)
      const cleanName = formData.name.trim();
      const words = cleanName.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 4) {
        setErrorMsg("يرجى إدخال اسمك رباعياً بالكامل لمنع تشابه الأسماء والملفات الدراسية.");
        return false;
      }

      if (!formData.governorate) {
        setErrorMsg("يرجى اختيار المحافظة التابع لها.");
        return false;
      }

      if (!formData.city || formData.city.trim() === "") {
        setErrorMsg("يرجى كتابة اسم المركز أو المدينة يدوياً.");
        return false;
      }

      if (!formData.school || formData.school.trim() === "") {
        setErrorMsg("يرجى إدخال اسم مدرستك الإعدادية.");
        return false;
      }

      if (!validatePhone(formData.phone)) {
        setErrorMsg("رقم هاتف الطالب غير صحيح. يجب أن يتكون من 11 رقم ويبدأ بـ 01 (أورانج، اتصالات، فودافون، أو وي).");
        return false;
      }
    }

    if (step === 2) {
      if (!formData.father_job || formData.father_job.trim() === "") {
        setErrorMsg("يرجى إدخال وظيفة الأب.");
        return false;
      }

      if (!validatePhone(formData.father_phone)) {
        setErrorMsg("رقم هاتف الأب غير صحيح. يجب أن يتكون من 11 رقم ويبدأ بـ 01.");
        return false;
      }

      if (formData.father_phone === formData.phone) {
        setErrorMsg("رقم هاتف الأب لا يجب أن يكون مكرراً لنفس رقم هاتف الطالب.");
        return false;
      }

      if (formData.mother_phone) {
        if (!validatePhone(formData.mother_phone)) {
          setErrorMsg("رقم هاتف الأم غير صحيح. يجب أن يتكون من 11 رقم ويبدأ بـ 01.");
          return false;
        }
        if (formData.mother_phone === formData.phone || formData.mother_phone === formData.father_phone) {
          setErrorMsg("رقم هاتف الأم لا يجب أن يكون مكرراً لهاتف الطالب أو هاتف الأب.");
          return false;
        }
      } else {
        setErrorMsg("يرجى إدخال رقم هاتف الأم للطوارئ والمتابعة.");
        return false;
      }
    }

    if (step === 3) {
      const numericScore = parseFloat(formData.score);
      if (isNaN(numericScore) || numericScore < 0 || numericScore > 280) {
        setErrorMsg("يرجى إدخال مجموع الشهادة الإعدادية الكلي بشكل صحيح (من 0 إلى 280 درجة).");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep(prev => prev - 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      // Safely handle JSON and non-JSON responses (HTML error pages produce parse errors)
      let data: any = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || `خطأ من الخادم (${res.status}): ${data?.error || 'استجابة غير صالحة'}`);
      }

      onSuccess(data.student);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء إرسال البيانات");
    } finally {
      setSubmitting(false);
    }
  };

  // Percent progress
  const progressPercent = ((step - 1) / 2) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-5 md:p-8 text-right max-w-xl mx-auto" id="booking-form-container">
      {/* Step Title Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
          <span>الخطوة {step} من 3</span>
          <span className="text-amber-600">
            {step === 1 && "البيانات الشخصية والتعليمية"}
            {step === 2 && "بيانات أولياء الأمور"}
            {step === 3 && "تحديد المجموع الكلي للحجز"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent === 0 ? 10 : progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Main Error Box */}
      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 leading-relaxed"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step Content with transitions */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  الاسم رباعياً <span className="text-red-500">*</span>
                  <User className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="مثال: أحمد محمد علي حسن"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  required
                />
                <span className="text-[10px] text-slate-500 block text-left">يرجى التأكد من كتابة 4 أسماء لتجنب تجميد التسجيل.</span>
              </div>

              {/* Governorate Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                    المحافظة <span className="text-red-500">*</span>
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  </label>
                  <select
                    name="governorate"
                    value={formData.governorate}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none transition-colors appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%2364748b' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'left 10px center', backgroundRepeat: 'no-repeat' }}
                    required
                  >
                    <option value="" disabled className="text-slate-400">اختر المحافظة...</option>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g} className="bg-white text-slate-900">{g}</option>
                    ))}
                  </select>
                </div>

                {/* City/Center Selection (Manual only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                    المركز / المدينة <span className="text-red-500">*</span>
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="اكتب المركز أو المدينة يدويّاً..."
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* School Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  المدرسة <span className="text-red-500">*</span>
                  <School className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  placeholder="مثال: مدرسة السعيدية الإعدادية بنين"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Student Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  رقم تليفون الطالب (متصل بـ WhatsApp) <span className="text-red-500">*</span>
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="tel"
                  name="phone"
                  maxLength={11}
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 text-left font-mono focus:outline-none tracking-wider transition-colors"
                  required
                />
                <span className="text-[10px] text-slate-500 block text-right">رقم هاتف متاح لاستلام تفاصيل وجداول المجموعات والمتابعة الدراسية.</span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Father Job Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  وظيفة الأب <span className="text-red-500">*</span>
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="text"
                  name="father_job"
                  value={formData.father_job}
                  onChange={handleInputChange}
                  placeholder="مثال: معلم، مهندس، محاسب، إلخ"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Father Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  رقم تليفون الأب <span className="text-red-500">*</span>
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="tel"
                  name="father_phone"
                  maxLength={11}
                  value={formData.father_phone}
                  onChange={handleInputChange}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 text-left font-mono focus:outline-none tracking-wider transition-colors"
                  required
                />
              </div>

              {/* Mother Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  رقم تليفون الأم <span className="text-red-500">*</span>
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="tel"
                  name="mother_phone"
                  maxLength={11}
                  value={formData.mother_phone}
                  onChange={handleInputChange}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 text-left font-mono focus:outline-none tracking-wider transition-colors"
                  required
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Middle School Grade Score */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  المجموع الكلي في الصف الثالث الإعدادي (من 280) <span className="text-red-500">*</span>
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                </label>
                <input
                  type="number"
                  name="score"
                  step="0.1"
                  min="0"
                  max="280"
                  value={formData.score}
                  onChange={handleInputChange}
                  placeholder="مثال: 275.5"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-colors"
                  required
                />
                <span className="text-[10px] text-slate-500 block text-right">درجة الشهادة الإعدادية لتقييم مستويات التأسيس.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Buttons Navigation */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              السابق
            </button>
          ) : (
            <div></div> // Placeholder to keep layout correct
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors shadow-md shadow-amber-500/10 shrink-0"
            >
              التالي
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تأكيد الحجز...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4.5 h-4.5" />
                  إرسال وتأكيد الحجز
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
