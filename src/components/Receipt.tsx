import React, { useRef } from "react";
import { CheckCircle2, Calendar, User, Phone, MapPin, School, ArrowRight, Printer, Scissors } from "lucide-react";
import { motion } from "motion/react";
import { Student } from "../types";

interface ReceiptProps {
  student: Student;
  onReset: () => void;
}

export default function Receipt({ student, onReset }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Parse booking date
  const bookingDate = student.created_at 
    ? new Date(student.created_at).toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true
      })
    : new Date().toLocaleString("ar-EG");

  const handlePrint = () => {
    window.print();
  };

  const renderBarcode = () => {
    const code = student.phone || "01000000000";
    const bars = [];
    for (let i = 0; i < code.length * 2; i++) {
      const isThick = i % 3 === 0 || i % 5 === 0;
      const isSpace = i % 2 === 0;
      bars.push(
        <div 
          key={i} 
          className={`h-12 ${isSpace ? "bg-transparent" : "bg-slate-900"} ${isThick ? "w-[3px]" : "w-[1px]"}`}
        />
      );
    }
    return (
      <div className="flex items-center justify-center gap-[1px] mt-2 mb-1" dir="ltr">
        {bars}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-right no-print" id="receipt-screen">
      {/* Success Notification Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center space-y-2"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-1">
          <CheckCircle2 className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-black text-emerald-800">تم تأكيد الحجز الإلكتروني بنجاح!</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          تم إرسال بياناتك وحفظ استمارتك الإلكترونية بالكامل. يرجى الاحتفاظ بنسخة من الإيصال أدناه لإظهاره عند حضور الحصة الأولى لتأكيد انضمامك للمجموعة.
        </p>
      </motion.div>

      {/* Printable Digital Receipt / Ticket */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        ref={receiptRef}
        className="relative bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400 print-only"
        style={{ direction: "rtl" }}
      >
        {/* Scissor Cut Line simulation */}
        <div className="absolute top-0 inset-x-0 h-4 flex items-center justify-between px-4 select-none opacity-40">
          <div className="border-t border-dashed border-slate-300 w-full"></div>
          <Scissors className="w-3.5 h-3.5 text-slate-400 rotate-180 -mr-1" />
        </div>

        {/* Ticket Header (Dark Navy & Gold) */}
        <div className="bg-[#0b1329] text-white p-5 pt-8 text-center border-b-4 border-amber-400 relative">
          <div className="absolute top-1.5 left-3 text-[9px] text-amber-400 font-mono">2026 - 2027</div>
          <h4 className="text-sm font-semibold text-amber-400 tracking-wider">إيصال حجز إلكتروني معتمد</h4>
          <h2 className="text-xl font-black mt-1 text-white">الأستاذ محمود الديب</h2>
          <p className="text-[10px] text-gray-300 mt-1">مادة اللغة العربية – الصف الأول الثانوي</p>
          
          {/* Booking serial ID */}
          <div className="mt-3.5 inline-block bg-slate-950/60 border border-amber-400/30 px-3 py-1 rounded-lg text-xs font-mono text-amber-300">
            رقم الحجز: <span className="font-bold tracking-widest">{student.id?.substring(0, 8).toUpperCase() || "N/A"}</span>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-5 space-y-4 relative bg-amber-500/[0.01]">
          
          {/* Main Details Grid */}
          <div className="space-y-3">
            
            {/* Student Name */}
            <div className="border-b border-dashed border-slate-150 pb-2.5 flex items-start gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 block">اسم الطالب رباعياً</span>
                <span className="text-sm font-black text-slate-800">{student.name}</span>
              </div>
            </div>

            {/* Selected Group (Big Banner Highlight) */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] text-amber-800 font-bold block">موعد الحصة والمجموعة المحجوزة</span>
                <span className="text-sm font-black text-slate-900">{student.group_label || "مجموعة عامة مفعّلة"}</span>
              </div>
            </div>

            {/* Personal Academic Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block">المحافظة والمدينة</span>
                <span className="text-xs font-bold text-slate-700">{student.governorate}، {student.city}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 block">مجموع الإعدادية</span>
                <span className="text-xs font-bold text-slate-700">
                  <strong className="text-sm font-extrabold text-amber-600 font-mono">{student.score}</strong> / 280
                </span>
              </div>
            </div>

            {/* School */}
            <div className="border-b border-dashed border-slate-150 pb-2.5 flex items-start gap-2.5">
              <School className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 block">المدرسة المقيد بها</span>
                <span className="text-xs font-bold text-slate-700">{student.school}</span>
              </div>
            </div>

            {/* Contact Phones */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex-1">
                  <span className="text-[9px] text-slate-400 block">رقم الطالب</span>
                  <span className="text-xs font-mono font-bold text-slate-700">{student.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex-1">
                  <span className="text-[9px] text-slate-400 block">رقم تليفون الأب</span>
                  <span className="text-xs font-mono font-bold text-slate-700">{student.father_phone}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Golden Seal stamp simulation */}
          <div className="absolute bottom-16 left-6 opacity-80 pointer-events-none select-none rotate-12">
            <div className="w-18 h-18 rounded-full border-2 border-dashed border-amber-600 flex flex-col items-center justify-center p-1.5">
              <div className="w-full h-full rounded-full border border-amber-600 bg-amber-400/5 flex flex-col items-center justify-center">
                <span className="text-[7px] text-amber-700 font-black">مكتب الأستاذ</span>
                <span className="text-[9px] text-amber-700 font-extrabold -my-0.5">محمود الديب</span>
                <span className="text-[6px] text-amber-600 font-bold">تأكيد رقمي</span>
              </div>
            </div>
          </div>

          {/* Barcode and Timestamp Area */}
          <div className="border-t border-slate-100 pt-3 text-center space-y-1">
            {renderBarcode()}
            <span className="text-[9px] font-mono tracking-widest text-slate-500 block" dir="ltr">{student.phone}</span>
            <span className="text-[9px] text-slate-400 block mt-1">تاريخ الحجز: {bookingDate}</span>
          </div>

        </div>

        {/* Ticket Footer Ribbon */}
        <div className="bg-slate-50 p-3 text-center text-[10px] text-slate-500 font-semibold border-t border-slate-100">
          تنبيه: الرجاء تصوير هذه الشاشة أو طباعتها وإحضار الإيصال للمساعدين بالسنتر لتفعيل اشتراكك ومقعدك.
        </div>
      </motion.div>

      {/* Receipt Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          طباعة / حفظ بصيغة PDF
        </button>

        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          حجز طالب آخر
        </button>
      </div>

      <p className="text-[10px] text-center text-slate-400 leading-relaxed">
        * ملحوظة: يمكنك استخدام زر "طباعة" لحفظ الإيصال كملف PDF على هاتفك أو الكمبيوتر بسهولة لعرضه في أي وقت.
      </p>
    </div>
  );
}
