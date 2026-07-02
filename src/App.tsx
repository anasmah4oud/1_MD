import React, { useState, useEffect } from "react";
import { BookOpen, Award, CheckSquare, Sparkles } from "lucide-react";
import IntroBanner from "./components/IntroBanner";
import BookingForm from "./components/BookingForm";
import Receipt from "./components/Receipt";
import AdminDashboard from "./components/AdminDashboard";
import { Student } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Hidden admin routing based on /a/a/a/a/2/0/0/2/3
  const [isAdminPath, setIsAdminPath] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path.includes("/a/a/a/a/2/0/0/2/3") || hash.includes("/a/a/a/a/2/0/0/2/3");
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      setIsAdminPath(path.includes("/a/a/a/a/2/0/0/2/3") || hash.includes("/a/a/a/a/2/0/0/2/3"));
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    
    // Fallback interval to capture any direct JS-driven updates in complex iframe systems
    const interval = setInterval(handleUrlChange, 1000);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  // Return AdminDashboard directly if path is matched
  if (isAdminPath) {
    return (
      <AdminDashboard 
        onClose={() => {
          // Reset hash/path back to home
          window.location.hash = "";
          if (window.history.pushState) {
            window.history.pushState(null, "", "/");
          }
          setIsAdminPath(false);
        }} 
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-850 flex flex-col justify-between py-6 px-4 md:px-8 overflow-x-hidden selection:bg-amber-100 selection:text-amber-900 relative" id="main-app-container">
      
      {/* Soft Elegant Blur Blobs */}
      <div className="absolute top-12 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none select-none"></div>
      <div className="absolute bottom-1/4 right-5 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none select-none"></div>

      {/* Top Main Navigation Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-3 border-b border-slate-200 mb-6 no-print" id="navigation-header">
        <div className="flex items-center gap-1">
          {/* Subtle logo detail */}
          <span className="text-[10px] font-mono text-slate-400">الصف الأول الثانوي</span>
        </div>

        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <h1 className="text-sm md:text-base font-black text-slate-800 leading-none">الأستاذ محمود الديب</h1>
            <span className="text-[10px] text-amber-600 font-bold">رائد تدريس اللغة العربية للثانوية العامة</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/10">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center gap-8 py-2">
        <AnimatePresence mode="wait">
          {!selectedStudent ? (
            <motion.div 
              key="booking-flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Introduction Instructions Banner */}
              <div className="no-print">
                <IntroBanner />
              </div>

              {/* Booking form */}
              <div className="no-print">
                <BookingForm 
                  onSuccess={(student) => setSelectedStudent(student)} 
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="receipt-flow"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-2"
            >
              {/* Electronic Receipt */}
              <Receipt 
                student={selectedStudent} 
                onReset={() => setSelectedStudent(null)} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding section */}
      <footer className="max-w-4xl w-full mx-auto border-t border-slate-200 pt-6 mt-12 text-center text-[11px] text-slate-400 space-y-2 no-print" id="branding-footer">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-bold text-slate-500">
            <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
            حجز ذكي ومؤمن
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 font-bold text-slate-500">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            العام الدراسي 2026 - 2027
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            مع لغة الضاد نتميز
          </span>
        </div>
        <p className="font-semibold text-slate-400">
          جميع الحقوق محفوظة © منصة الحجز الإلكتروني - الأستاذ محمود الديب 2026
        </p>
      </footer>
    </div>
  );
}
