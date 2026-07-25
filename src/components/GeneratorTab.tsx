import React, { useState, useRef } from "react";
import { HelpCircle, Sparkles, BookOpen, FilePlus, ChevronDown, ChevronUp, CheckCircle2, Paperclip, FileText, FileUp, X, Loader2, AlertCircle, Mic, MicOff } from "lucide-react";
import { Question } from "../types";
import { Language, translations } from "../translations";

interface GeneratorTabProps {
  onAddQuestion: (q: Question) => void;
  lang: Language;
}

export default function GeneratorTab({ onAddQuestion, lang }: GeneratorTabProps) {
  const t = translations[lang].generator;
  const isRtl = lang === "ar";

  const [content, setContent] = useState(
    isRtl
      ? "تُعدّ الاختبارات الإلكترونية التحصيلية من أهم أدوات التقييم الإلكتروني. تختلف الأسئلة المقدمة من خلال الاختبار الإلكتروني تبعًا لنوع الاختبار ونوع المهارة المراد قياسها. يجب أن يحتوي سؤال الاختيار من متعدد على فكرة واحدة فقط، وأن تكون صياغته موجزة وواضحة. كما ينبغي تجنّب تكرار جزء من السؤال عند كل خيار، وتجنّب إعطاء الطالب دليلًا على مفتاح الإجابة. يجب أن تكون الخيارات متشابهة في الطول والنمط لتقليل عملية التخمين لدى الطالب."
      : "Electronic achievement testing is one of the key tools in digital assessment. Items vary depending on test purpose and target learning skill. A multiple choice item stem must express a single idea with conciseness and clarity. Repeated common phrases should be placed in the stem rather than in every option, avoiding giving students clue hints. Options must be parallel in length and grammatical structure to reduce guessing."
  );
  const [qType, setQType] = useState<"mcq" | "tf" | "fill">("mcq");
  const [bloom, setBloom] = useState<"تذكر" | "فهم" | "تطبيق" | "تحليل" | "تقويم" | "إبداع">("فهم");
  const [qCount, setQCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [visibleAnswers, setVisibleAnswers] = useState<{ [key: string]: boolean }>({});
  const [visibleReviews, setVisibleReviews] = useState<{ [key: string]: boolean }>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // File Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Speech Recognition states
  const [activeListeningId, setActiveListeningId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleToggleListening = (id: string, onSpeechText: (text: string) => void) => {
    if (activeListeningId === id) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setActiveListeningId(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        isRtl
          ? "خاصية الإملاء الصوتي غير مدعومة في متصفحك الحالي. يرجى تجربة Google Chrome."
          : "Voice dictation is not supported in your browser. Please try Google Chrome."
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang === "ar" ? "ar-EG" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setActiveListeningId(id);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          onSpeechText(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        if (event.error !== "no-speech") {
          setSpeechError(
            isRtl
              ? "حدث خطأ في الميكروفون. يرجى التأكد من السماح بالوصول للميكروفون."
              : "Microphone error. Please check mic permissions."
          );
        }
        setActiveListeningId(null);
      };

      recognition.onend = () => {
        setActiveListeningId(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setSpeechError(
        isRtl ? "تعذر تشغيل الميكروفون." : "Could not activate microphone."
      );
      setActiveListeningId(null);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    setSelectedFileName(file.name);
    setSelectedFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setIsExtracting(true);
    setUploadSuccessMsg(null);
    setUploadErrorMsg(null);

    const isTextFile =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".json");

    if (isTextFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setContent(text);
          const wordCount = text.trim().split(/\s+/).length;
          setUploadSuccessMsg(`${t.extractSuccess} (${wordCount} ${isRtl ? "كلمة" : "words"})`);
        } else {
          setUploadErrorMsg(t.extractError);
        }
        setIsExtracting(false);
      };
      reader.onerror = () => {
        setUploadErrorMsg(t.extractError);
        setIsExtracting(false);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        try {
          const res = await fetch("/api/extract-file-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileData: base64Data,
              mimeType: file.type,
              fileName: file.name,
              lang,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || t.extractError);
          }

          if (data.extractedText) {
            setContent(data.extractedText);
            const wordCount = data.extractedText.trim().split(/\s+/).length;
            setUploadSuccessMsg(`${t.extractSuccess} (${wordCount} ${isRtl ? "كلمة" : "words"})`);
          } else {
            throw new Error(t.extractError);
          }
        } catch (err: any) {
          setUploadErrorMsg(err.message || t.extractError);
        } finally {
          setIsExtracting(false);
        }
      };
      reader.onerror = () => {
        setUploadErrorMsg(t.extractError);
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setUploadSuccessMsg(null);
    setUploadErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      setError(isRtl ? "يرجى إدخال محتوى علمي أولاً للتوليد." : "Please enter scientific content first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setGenerated([]);
    setVisibleAnswers({});
    setVisibleReviews({});

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          qType,
          bloomTarget: bloom,
          qCount,
          lang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isRtl ? "فشل التوليد" : "Generation failed"));
      }

      if (data.questions && Array.isArray(data.questions)) {
        const formatted: Question[] = data.questions.map((q: any, idx: number) => {
          const diffIdx = typeof q.difficultyIndex === "number" ? q.difficultyIndex : (q.difficulty === "سهلة" ? 0.80 : q.difficulty === "صعبة" ? 0.35 : 0.60);
          const discIdx = typeof q.discriminationIndex === "number" ? q.discriminationIndex : 0.42;
          const discStatus = q.discriminationStatus || (isRtl ? "ممتاز" : "Excellent");

          return {
            id: `gen-${Date.now()}-${idx}`,
            qType: q.qType || qType,
            stem: q.stem || "",
            options: q.options || undefined,
            correctAnswer: q.correctAnswer || "",
            bloom: q.bloom || bloom,
            difficulty: q.difficulty || (isRtl ? "متوسطة" : "Moderate"),
            difficultyIndex: diffIdx,
            discriminationIndex: discIdx,
            discriminationStatus: discStatus,
            notes: q.notes || [],
          };
        });
        setGenerated(formatted);
      } else {
        throw new Error(isRtl ? "تنسيق الاستجابة من الخادم غير صالح." : "Invalid response format from server.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isRtl ? "حدث خطأ غير متوقع أثناء الاتصال." : "An unexpected error occurred."));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnswer = (id: string) => {
    setVisibleAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleReview = (id: string) => {
    setVisibleReviews((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = (q: Question) => {
    onAddQuestion(q);
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(q.id);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Control panel */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-24 space-y-4">
        <div className="flex items-center gap-2 mb-2 text-slate-900 pb-3 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-display font-bold text-lg">{t.title}</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label htmlFor="contentInput" className="block text-xs font-semibold text-slate-700">
                {t.contentLabel}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleListening("contentInput", (text) =>
                      setContent((prev) => (prev ? `${prev}\n${text}` : text))
                    )
                  }
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
                    activeListeningId === "contentInput"
                      ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  }`}
                  title={isRtl ? "إملاء صوتي / تحويل الصوت إلى نص المادة العلمية" : "Voice dictation for course text"}
                >
                  {activeListeningId === "contentInput" ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                      <span>{isRtl ? "إيقاف الإملاء..." : "Stop Dictation..."}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isRtl ? "إملاء المحتوى بالميكروفون" : "Voice Dictation"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100/90 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-blue-200/80 shadow-2xs"
                >
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t.uploadFileBtn}</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* File Dropzone / Selected File Banner */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !selectedFileName && fileInputRef.current?.click()}
              className={`mb-2.5 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center relative ${
                isDragging
                  ? "border-blue-500 bg-blue-50/80"
                  : selectedFileName
                  ? "border-blue-300 bg-blue-50/40"
                  : "border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              {isExtracting ? (
                <div className="flex items-center justify-center gap-2 py-1 text-xs font-semibold text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>{t.extractingText}</span>
                </div>
              ) : selectedFileName ? (
                <div className="flex items-center justify-between gap-2 px-1 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800 truncate">{selectedFileName}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">({selectedFileSize})</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFile();
                    }}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
                    title={t.clearFile}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-1">
                  <FileUp className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium">{t.uploadFileHint}</span>
                </div>
              )}
            </div>

            {uploadSuccessMsg && (
              <div className="mb-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {uploadErrorMsg && (
              <div className="mb-2 text-[11px] font-semibold text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{uploadErrorMsg}</span>
              </div>
            )}

            <textarea
              id="contentInput"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.contentPlaceholder}
              className={`w-full min-h-[160px] p-3 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none text-slate-900 transition-all leading-relaxed ${
                activeListeningId === "contentInput" ? "border-rose-400 bg-rose-50/60 font-medium" : "border-slate-300"
              }`}
            />
            {activeListeningId === "contentInput" && (
              <div className="mt-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold animate-pulse">
                <Mic className="w-4 h-4 text-rose-600 animate-bounce shrink-0" />
                <span>
                  {isRtl
                    ? "جاري الاستماع بالميكروفون... تحدث الآن لإملاء نص المحتوى العلمي مباشرة"
                    : "Listening via microphone... Speak now to dictate course text directly"}
                </span>
              </div>
            )}
            {speechError && (
              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold">
                {speechError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label htmlFor="qType" className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.qTypeLabel}
              </label>
              <select
                id="qType"
                value={qType}
                onChange={(e) => setQType(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
              >
                <option value="mcq">{t.mcqOpt}</option>
                <option value="tf">{t.tfOpt}</option>
                <option value="fill">{t.fillOpt}</option>
                <option value="matching">{t.matchingOpt}</option>
                <option value="essay">{t.essayOpt}</option>
                <option value="multi_mcq">{t.multiMcqOpt}</option>
                <option value="ordering">{t.orderingOpt}</option>
                <option value="diagram_labeling">{t.diagramOpt}</option>
              </select>
            </div>

            <div>
              <label htmlFor="bloomTarget" className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.bloomLabel}
              </label>
              <select
                id="bloomTarget"
                value={bloom}
                onChange={(e) => setBloom(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
              >
                <option value="تذكر">{isRtl ? "تذكر" : "Remember"}</option>
                <option value="فهم">{isRtl ? "فهم" : "Understand"}</option>
                <option value="تطبيق">{isRtl ? "تطبيق" : "Apply"}</option>
                <option value="تحليل">{isRtl ? "تحليل" : "Analyze"}</option>
                <option value="تقويم">{isRtl ? "تقويم" : "Evaluate"}</option>
                <option value="إبداع">{isRtl ? "إبداع" : "Create"}</option>
              </select>
            </div>

            <div>
              <label htmlFor="qCount" className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.qCountLabel}
              </label>
              <select
                id="qCount"
                value={qCount}
                onChange={(e) => setQCount(parseInt(e.target.value, 10))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-700 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all border border-white/10"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? t.genBtnLoading : t.genBtn}
          </button>
        </div>
      </div>

      {/* Generated output display */}
      <div className="lg:col-span-7 space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[300px] border border-slate-200 bg-white rounded-2xl p-8 text-center text-slate-600 space-y-4 animate-pulse shadow-sm">
            <Sparkles className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-900">{t.loadingTitle}</p>
            <p className="text-xs text-slate-500 max-w-sm">{t.loadingSub}</p>
          </div>
        )}

        {!isLoading && generated.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[350px] border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-display font-semibold text-lg text-slate-900 mb-1">{t.emptyTitle}</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{t.emptySub}</p>
          </div>
        )}

        {!isLoading && generated.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-display text-lg font-bold text-slate-900 mb-2 px-1">
              {t.questionsHeading} ({generated.length} {t.itemWord})
            </h4>

            {generated.map((q, idx) => {
              const isAdded = addedIds.has(q.id);
              const showAns = !!visibleAnswers[q.id];
              const showReview = !!visibleReviews[q.id];

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {/* Accent strip */}
                  <div className="absolute top-0 bottom-0 start-0 w-1.5 bg-gradient-to-b from-blue-600 via-indigo-600 to-violet-600"></div>

                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-semibold text-slate-500">
                      {t.questionWord} {idx + 1} · {
                        q.qType === "mcq" ? t.mcqOpt :
                        q.qType === "tf" ? t.tfOpt :
                        q.qType === "fill" ? t.fillOpt :
                        q.qType === "matching" ? t.matchingOpt :
                        q.qType === "essay" ? t.essayOpt :
                        q.qType === "multi_mcq" ? t.multiMcqOpt :
                        q.qType === "ordering" ? t.orderingOpt :
                        q.qType === "diagram_labeling" ? t.diagramOpt : q.qType
                      }
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                        {t.bloomWord}: {q.bloom}
                      </span>
                      <span className="bg-violet-50 text-violet-700 font-bold border border-violet-200 px-2 py-0.5 rounded-full text-[10px]">
                        {t.diffWord}: {q.difficulty}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                        {isRtl ? "السهولة (p):" : "Facility (p):"}{" "}
                        {typeof q.difficultyIndex === "number"
                          ? `${Math.round(q.difficultyIndex * 100)}%`
                          : "60%"}
                      </span>
                      <span className="bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 px-2 py-0.5 rounded-full text-[10px]">
                        {isRtl ? "التمييز (D):" : "Discrimination (D):"}{" "}
                        {typeof q.discriminationIndex === "number"
                          ? q.discriminationIndex.toFixed(2)
                          : "0.42"}{" "}
                        ({q.discriminationStatus || (isRtl ? "ممتاز" : "Excellent")})
                      </span>
                    </div>
                  </div>

                  <p className="text-base font-bold text-slate-900 mb-4 leading-relaxed">
                    {q.qType === "fill" ? (
                      <span dangerouslySetInnerHTML={{ __html: q.stem.replace("___", `<span class="inline-block px-3 py-0.5 border-b-2 border-dotted border-blue-600 text-blue-700 font-bold mx-1">${t.blankWord || "blank"}</span>`) }} />
                    ) : (
                      q.stem
                    )}
                  </p>

                  {q.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 max-w-lg">
                      <img src={q.imageUrl} alt="Diagram" className="max-h-64 object-contain rounded-lg mx-auto shadow-2xs" />
                    </div>
                  )}

                  {/* Options for MCQ / Multi MCQ / Matching / Ordering / Diagram Labeling */}
                  {(q.qType === "mcq" || q.qType === "multi_mcq" || q.qType === "matching" || q.qType === "ordering" || q.qType === "diagram_labeling") && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.qType === "mcq" ? opt === q.correctAnswer : false;
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm transition-all ${
                              isCorrect && showAns
                                ? "border-blue-500 bg-blue-50 text-blue-950 font-bold shadow-sm"
                                : "border-slate-200 bg-slate-50/60 text-slate-800"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              isCorrect && showAns ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                            }`}>
                              {isCorrect && showAns && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.qType === "tf" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={`p-3 rounded-xl border text-center text-xs sm:text-sm font-semibold transition-all ${showAns && (q.correctAnswer === "صواب" || q.correctAnswer.toLowerCase() === "true") ? "border-blue-500 bg-blue-50 text-blue-950 font-bold" : "border-slate-200 bg-slate-50/60"}`}>
                        {isRtl ? "صواب" : "True"}
                      </div>
                      <div className={`p-3 rounded-xl border text-center text-xs sm:text-sm font-semibold transition-all ${showAns && (q.correctAnswer === "خطأ" || q.correctAnswer.toLowerCase() === "false") ? "border-blue-500 bg-blue-50 text-blue-950 font-bold" : "border-slate-200 bg-slate-50/60"}`}>
                        {isRtl ? "خطأ" : "False"}
                      </div>
                    </div>
                  )}

                  {/* Text Answer */}
                  {showAns && q.qType !== "mcq" && (
                    <div className="mt-3 text-xs sm:text-sm font-bold text-blue-800 bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                      {t.modelAnswer} {q.correctAnswer}
                    </div>
                  )}

                  {/* Quality Checklist */}
                  {showReview && q.notes && q.notes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-900 block">{t.autoAuditNotes}</span>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {q.notes.map((note, nIdx) => (
                          <li key={nIdx} className="flex gap-2 items-start">
                            <span className="text-blue-600 font-bold">✓</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAnswer(q.id)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold"
                      >
                        {showAns ? t.hideAnswer : t.showAnswer}
                      </button>
                      <button
                        onClick={() => toggleReview(q.id)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold flex items-center gap-1"
                      >
                        {showReview ? t.hideReview : t.showReview}
                        {showReview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => handleAdd(q)}
                      disabled={isAdded}
                      className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAdded
                          ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-default"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      }`}
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      {isAdded ? t.addedBtn : t.addBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
