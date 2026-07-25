import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import LoginGate from "./components/LoginGate";
import Hero from "./components/Hero";
import Flow from "./components/Flow";
import QuestionTypes from "./components/QuestionTypes";
import BloomPyramid from "./components/BloomPyramid";
import GeneratorTab from "./components/GeneratorTab";
import ImproveTab from "./components/ImproveTab";
import SupportTools from "./components/SupportTools";
import BloomChartDashboard from "./components/BloomChartDashboard";
import { Question } from "./types";
import { Language, translations } from "./translations";
import {
  Award,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Sparkles,
  X,
  AlertCircle,
  Info,
  Wand2,
  ArrowRight,
} from "lucide-react";

function generateSmartQuestionTips(q: Question, isRtl: boolean): string[] {
  const tips: string[] = [];

  // Check stem length
  if (q.stem.length < 20) {
    tips.push(
      isRtl
        ? "جذع السؤال قصير جداً؛ يُفضل توضيح السياق أو المسألة بشكل أكثر تحديداً لتجنب إرباك الطالب."
        : "Question stem is very short; consider providing clearer context."
    );
  } else if (q.stem.length > 260) {
    tips.push(
      isRtl
        ? "جذع السؤال طويل جداً؛ احرص على إزالة الكلمات الزائدة والتركيز على مشكلة السؤال المباشرة."
        : "Question stem is quite long; trim non-essential introductory text."
    );
  }

  // Check negative phrasing
  if (
    q.stem.includes("ليس") ||
    q.stem.includes("ما عدا") ||
    q.stem.includes("غير") ||
    q.stem.includes("لا ") ||
    q.stem.includes("NOT") ||
    q.stem.includes("EXCEPT")
  ) {
    tips.push(
      isRtl
        ? "تنبيه الصياغة المنفية: يتضمن السؤال أداة نفي (ليس / ما عدا / غير). يُوصى بتظليل كلمة النفي بخط عريض لإنذار الطالب."
        : "Contains negative phrasing. Highlight or bold negative keywords like NOT or EXCEPT."
    );
  }

  // Check options balance for MCQ
  if (q.qType === "mcq" && q.options && q.options.length > 0) {
    const optionLengths = q.options.map((o) => o.length);
    const maxLen = Math.max(...optionLengths);
    const minLen = Math.min(...optionLengths);
    if (maxLen > minLen * 2.5 && maxLen > 25) {
      tips.push(
        isRtl
          ? "توازن البدائل: أحد الخيارات أطول بكثير من باقي البدائل، وقد يوحِي للطالب بأنه الإجابة الصحيحة. يفضل موازنة الأطوال."
          : "Option length imbalance: avoid making the correct option significantly longer than distractors."
      );
    }
    const hasAllAbove = q.options.some(
      (o) =>
        o.includes("جميع ما سبق") ||
        o.includes("كل ما ذكر") ||
        o.includes("لا شيء مما سبق") ||
        o.includes("All of the above") ||
        o.includes("None of the above")
    );
    if (hasAllAbove) {
      tips.push(
        isRtl
          ? "تجنب استخدام 'جميع ما سبق' أو 'لا شيء مما سبق': يقلل من القوة التمييزية للبند السيكومتري ويشجع التخمين."
          : "Avoid using 'All of the above' or 'None of the above' as it reduces item discrimination."
      );
    }
  }

  // Difficulty Index (p-value)
  if (typeof q.difficultyIndex === "number") {
    if (q.difficultyIndex > 0.82) {
      tips.push(
        isRtl
          ? "معامل السهولة مرتفع (p > 80%): السؤال سهل جداً، صمم مشتتات أكثر جاذبية أو ارفع مستوى الصعوبة المعرفية."
          : "High facility index (p > 80%): item is too easy. Strengthen distractors."
      );
    } else if (q.difficultyIndex < 0.28) {
      tips.push(
        isRtl
          ? "معامل السهولة منخفض (p < 28%): السؤال صعب جداً، تحقق من عدم وجود إبهام في الصياغة أو خطأ في المفتاح."
          : "Low facility index (p < 28%): item is very difficult. Verify clarity and key accuracy."
      );
    }
  }

  // Discrimination Index (D-value)
  if (typeof q.discriminationIndex === "number" && q.discriminationIndex < 0.35) {
    tips.push(
      isRtl
        ? "معامل التمييز يحتاج تحسيناً (D < 0.35): السؤال لا يفرق بفاعلية كافية بين الطلبة المتميزين والضعاف. راجع جاذبية المشتتات."
        : "Low discrimination index (D < 0.35): item needs review to better differentiate students."
    );
  }

  // Notes attached from AI evaluation
  if (q.notes && q.notes.length > 0) {
    q.notes.forEach((note) => {
      if (!tips.includes(note)) tips.push(note);
    });
  }

  // Fallback positive tip
  if (tips.length === 0) {
    tips.push(
      isRtl
        ? "صياغة السؤال متوازنة ومطابقة لمعايير الجودة التربوية والسيكومترية المعتمدة."
        : "Question meets core quality and psychometric guidelines."
    );
  }

  return tips;
}

export default function App() {
  const [lang, setLang] = useState<Language>("ar");
  const [userEmail, setUserEmail] = useState("");
  const [currentAxis, setCurrentAxis] = useState<"1" | "2" | "3" | "4">("1");
  const [questionsList, setQuestionsList] = useState<Question[]>([]);
  const [selectedAdviceQuestion, setSelectedAdviceQuestion] = useState<Question | null>(null);

  const t = translations[lang];
  const isRtl = lang === "ar";

  // Synchronize document dir and lang attribute
  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  // Check existing login session
  useEffect(() => {
    const savedEmail = localStorage.getItem("taqwimi-remember-email");
    const sessionOk = sessionStorage.getItem("taqwimi-session-ok");
    if (savedEmail || sessionOk === "1") {
      setUserEmail(savedEmail || (isRtl ? "عضو هيئة التدريس" : "Faculty Member"));
    }
  }, [isRtl]);

  const handleToggleLang = () => {
    setLang((prev) => (prev === "ar" ? "en" : "ar"));
  };

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("taqwimi-remember-email");
    sessionStorage.removeItem("taqwimi-session-ok");
    setUserEmail("");
  };

  const handleAddQuestion = (q: Question) => {
    setQuestionsList((prev) => {
      // Prevent duplicates in final list
      if (prev.some((item) => item.stem === q.stem)) return prev;
      return [...prev, q];
    });
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestionsList((prev) => prev.filter((q) => q.id !== id));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans transition-colors duration-300">
      {/* 1. Login Gate Overlay */}
      {!userEmail && (
        <LoginGate
          onLoginSuccess={handleLoginSuccess}
          lang={lang}
          onToggleLang={handleToggleLang}
        />
      )}

      {/* 2. Top Header and Navigation */}
      <Header
        userEmail={userEmail}
        onLogout={handleLogout}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* 3. Hero Band */}
      <Hero
        lang={lang}
        onStartClick={() => {
          setCurrentAxis("1");
          scrollToSection("interactive-board");
        }}
        onExploreClick={() => {
          setCurrentAxis("2");
          scrollToSection("interactive-board");
        }}
      />

      {/* 4. Educational Workflow */}
      <Flow
        lang={lang}
        onSelectAxis={(axis) => {
          setCurrentAxis(axis);
          scrollToSection("interactive-board");
        }}
      />

      {/* 5. Standards Guides & Bloom Hierarchy */}
      <QuestionTypes lang={lang} />
      <BloomPyramid lang={lang} />

      {/* 6. Active Interactive Board (The four main axes) */}
      <main id="interactive-board" className="py-16 bg-blue-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Axis Subheader */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
              {t.board.badge}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t.board.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.board.subtitle}
            </p>
          </div>

          {/* Sticky Tab Bar with Blue and Violet accents */}
          <div className="sticky top-16 z-30 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 shadow-2xl mb-8 max-w-4xl mx-auto flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setCurrentAxis("1")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 ${
                currentAxis === "1"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.board.tab1}
            </button>
            <button
              onClick={() => setCurrentAxis("2")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 ${
                currentAxis === "2"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.board.tab2}
            </button>
            <button
              onClick={() => setCurrentAxis("3")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 ${
                currentAxis === "3"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.board.tab3}
            </button>
            <button
              onClick={() => setCurrentAxis("4")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 ${
                currentAxis === "4"
                  ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white shadow-lg shadow-blue-700/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.board.tab4}
            </button>
          </div>

          {/* Grid Layout: Active Tab Panel + Approved Question Bank Column */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Active tool column */}
            <div className="xl:col-span-8">
              {currentAxis === "1" && <GeneratorTab onAddQuestion={handleAddQuestion} lang={lang} />}
              {currentAxis === "2" && <ImproveTab stage="2" onAddQuestion={handleAddQuestion} lang={lang} />}
              {currentAxis === "3" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 border border-violet-200 rounded-2xl p-4 flex gap-3 items-center">
                    <span className="w-8 h-8 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      {t.board.stage3Note}
                    </p>
                  </div>
                  <ImproveTab stage="3" onAddQuestion={handleAddQuestion} lang={lang} />
                </div>
              )}
              {currentAxis === "4" && <SupportTools questionsList={questionsList} lang={lang} />}
            </div>

            {/* Approved question bank column */}
            <div className="xl:col-span-4 bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-md space-y-5 sticky top-36">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h3 className="font-display font-bold text-base">{t.bank.title}</h3>
                </div>
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {questionsList.length}
                </span>
              </div>

              {/* Bloom's Taxonomy Cognitive Distribution Dashboard */}
              <BloomChartDashboard questionsList={questionsList} lang={lang} />

              {questionsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[160px] text-center text-xs text-slate-500 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 opacity-80" />
                  <p className="font-medium text-slate-700">{t.bank.emptyTitle}</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">
                    {t.bank.emptySub}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
                  {questionsList.map((q, idx) => (
                    <div
                      key={q.id}
                      className="group border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 hover:bg-slate-50 transition-colors relative"
                    >
                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="absolute top-2 end-2 text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {t.bank.deleteBtn}
                      </button>

                      <div className="text-[10px] text-slate-500 font-bold mb-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>
                          {t.bank.itemWord} {idx + 1} · {t.bank.bloomWord}: {q.bloom} · {t.bank.diffWord}: {q.difficulty}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          p: {typeof q.difficultyIndex === "number" ? `${Math.round(q.difficultyIndex * 100)}%` : "60%"}
                        </span>
                        <span className="text-indigo-700 font-bold">
                          D: {typeof q.discriminationIndex === "number" ? q.discriminationIndex.toFixed(2) : "0.42"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-2 pe-12 ps-1 leading-relaxed">
                        {q.stem}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedAdviceQuestion(q)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300/90 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                          title={isRtl ? "مساعدة ذكية وتوصيات الجودة بالسؤال" : "Smart advice and quality tips"}
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
                          <span>{isRtl ? "مساعدة ذكية" : "Smart Advice"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {questionsList.length > 0 && (
                <button
                  onClick={() => {
                    setCurrentAxis("4");
                    setTimeout(() => scrollToSection("interactive-board"), 200);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {t.bank.exportBtn}
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 7. Footer Seal and Band */}
      <section className="py-16 bg-slate-950 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="lg:col-span-8 space-y-3 text-start">
              <h3 className="font-display font-bold text-2xl text-white">
                {t.footer.sealHeading}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.footer.sealDesc}
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-display font-bold text-base text-white mb-1">
                {t.footer.cardTitle}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {t.footer.cardDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-slate-400 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-white">
              {isRtl ? "تقويمي" : "Taqwimi"}
            </span>
            <span className="text-[10px] text-slate-500">{t.footer.rights}</span>
          </div>
          <p className="text-xs text-slate-400 text-center sm:text-start">
            {t.footer.affiliation}
          </p>
        </div>
      </footer>

      {/* Smart Advice Modal Dialog */}
      {selectedAdviceQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between border-b border-amber-400">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-100">
                  <Lightbulb className="w-5 h-5 fill-amber-200" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base">
                    {isRtl ? "وحدة المساعدة الذكية وتوصيات الجودة" : "Smart Pedagogical Assistance"}
                  </h3>
                  <p className="text-[11px] text-amber-100 font-medium">
                    {isRtl ? "تحليل صياغة السؤال وفق المعايير السيكومترية" : "Analysis based on psychometric standards"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdviceQuestion(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Question Stem Box */}
              <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span>{isRtl ? "نص السؤال الحالي:" : "Current Question Stem:"}</span>
                  <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                    {selectedAdviceQuestion.qType.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-relaxed">
                  {selectedAdviceQuestion.stem}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                  <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200 px-2 py-0.5 rounded-md">
                    {isRtl ? "بلوم:" : "Bloom:"} {selectedAdviceQuestion.bloom}
                  </span>
                  <span className="bg-violet-50 text-violet-700 font-bold border border-violet-200 px-2 py-0.5 rounded-md">
                    {isRtl ? "الصعوبة:" : "Difficulty:"} {selectedAdviceQuestion.difficulty}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 px-2 py-0.5 rounded-md">
                    {isRtl ? "السهولة (p):" : "Facility (p):"}{" "}
                    {typeof selectedAdviceQuestion.difficultyIndex === "number"
                      ? `${Math.round(selectedAdviceQuestion.difficultyIndex * 100)}%`
                      : "60%"}
                  </span>
                  <span className="bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 px-2 py-0.5 rounded-md">
                    {isRtl ? "التمييز (D):" : "Discrimination (D):"}{" "}
                    {typeof selectedAdviceQuestion.discriminationIndex === "number"
                      ? selectedAdviceQuestion.discriminationIndex.toFixed(2)
                      : "0.42"}
                  </span>
                </div>
              </div>

              {/* Options review if available */}
              {selectedAdviceQuestion.options && selectedAdviceQuestion.options.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">
                    {isRtl ? "الخيارات والبدائل المتاحة:" : "Options & Distractors:"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedAdviceQuestion.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-xl border-2 font-medium ${
                          opt === selectedAdviceQuestion.correctAnswer
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                            : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <span className="text-slate-400 font-bold me-1.5">
                          ({String.fromCharCode(isRtl ? 1571 + oIdx : 65 + oIdx)})
                        </span>
                        {opt}
                        {opt === selectedAdviceQuestion.correctAnswer && (
                          <span className="ms-1.5 text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">
                            {isRtl ? "المفتاح" : "Key"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Quality Tips */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs border-b border-amber-200 pb-2">
                  <Sparkles className="w-4 h-4 text-amber-600 fill-amber-300" />
                  <span>{isRtl ? "التوصيات والتلميحات التربوية المباشرة:" : "Pedagogical Advice & Quality Hints:"}</span>
                </div>

                <div className="space-y-2">
                  {generateSmartQuestionTips(selectedAdviceQuestion, isRtl).map((tip, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3 bg-amber-50/80 border-2 border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950 font-semibold leading-relaxed shadow-xs"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        {tIdx + 1}
                      </div>
                      <div>{tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedAdviceQuestion(null)}
                className="px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>

              <button
                onClick={() => {
                  setSelectedAdviceQuestion(null);
                  setCurrentAxis("2");
                  setTimeout(() => {
                    const el = document.getElementById("interactive-board");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 200);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border-2 border-blue-500/30"
              >
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>{isRtl ? "تحسين وتطوير هذا السؤال في وحدة التحكيم" : "Improve in Refinement Unit"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
