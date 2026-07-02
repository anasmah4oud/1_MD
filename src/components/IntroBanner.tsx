import React from "react";
import { BookOpen, Sparkles, Calendar, Bell } from "lucide-react";
import { motion } from "motion/react";

export default function IntroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-xl shadow-slate-100 relative overflow-hidden text-right"
      id="intro-banner"
    >
      {/* Soft elegant radial blur decoration for first-grade feeling */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
              <Sparkles className="w-3 h-3 animate-pulse text-amber-500" />
              حجز موعد جديد
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              العام الدراسي 2026 - 2027
            </span>
          </div>

          <div className="text-center md:text-right space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              منصة الحجز الإلكتروني
            </h1>
            <h2 className="text-xl md:text-2xl font-bold text-amber-600">
              الأستاذ محمود الديب
            </h2>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
              مرحباً بكم طلابنا الأعزاء طلاب الصف الأول الثانوي. يسرنا إطلاق نظام الحجز الإلكتروني لتسهيل عملية التسجيل وتأكيد حضوركم بمجموعات العام الجديد بمختلف السناتر التعليمية.
            </p>
          </div>
        </div>

        {/* Visual Badge representing Arabic Excellence */}
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 w-36 h-36 md:w-44 md:h-44 rounded-full shadow-inner p-4 relative shrink-0">
          <BookOpen className="w-10 h-10 text-amber-500 mb-2" />
          <span className="text-lg md:text-xl font-bold text-slate-800 text-center">لغة الضاد</span>
          <span className="text-[10px] md:text-xs text-amber-600 font-medium tracking-widest text-center mt-1">الصف الأول الثانوي</span>
          <div className="absolute inset-2 border border-dashed border-slate-200 rounded-full pointer-events-none animate-[spin_40s_linear_infinite]"></div>
        </div>
      </div>
    </motion.div>
  );
}
