import React, { useState, useRef } from "react";
import { Sparkles, HelpCircle, FileCheck, Copy, Check, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, RefreshCw, ListChecks, Mic, MicOff, Volume2, Image as ImageIcon, Upload, Trash2, FileImage, Wand2, Zap, CheckCheck, FileEdit } from "lucide-react";
import { Question } from "../types";
import { Language, translations } from "../translations";

interface ImproveTabProps {
  onAddQuestion: (q: Question) => void;
  lang: Language;
  stage?: "2" | "3";
}

export interface ChecklistCriterion {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  evaluate: (stem: string, options: string[], correctAnswer: string) => "pass" | "warn";
}

// Stage 2 Criteria: Focus on Item Writing & Language Refinement Guidelines
const STAGE2_CHECKLISTS: Record<string, ChecklistCriterion[]> = {
  mcq: [
    {
      id: "declarative_stem",
      titleAr: "رأس السؤال جملة خبرية لا تبدأ بصيغة سؤال",
      titleEn: "Stem is a declarative statement, not a question",
      descAr: "أن يصاغ الجذع كجملة خبرية واضحة تنتهي بنقطتين (:) وتجنب البدء بأدوات الاستفهام (مثل: أي مما يلي، ما هو، كيف) أو الانتهاء بعلامة (؟).",
      descEn: "Formulate stem as a declarative statement ending with a colon (:) avoiding question words (e.g. Which of the following, What is) or ending in '?'.",
      evaluate: (stem) => {
        const text = stem.trim().toLowerCase();
        const startsWithQuestion = ["أي مما يلي", "ما هو", "ما هي", "كيف", "لماذا", "ما الفرق", "أيها", "هل", "which of the following", "what is", "how does", "why"].some((q) => text.startsWith(q));
        const endsWithQuestionMark = text.endsWith("؟") || text.endsWith("?");
        return startsWithQuestion || endsWithQuestionMark ? "warn" : "pass";
      },
    },
    {
      id: "single_concept",
      titleAr: "يتضمن الجذع فكرة واحدة محددة",
      titleEn: "Stem expresses a single core concept",
      descAr: "صياغة الجذع كجملة خبرية توجه الطالب لأداء محدد وتجنب الحشو والاستطراد.",
      descEn: "Formulate stem as a concise declarative statement with one focal educational objective.",
      evaluate: (stem) => (stem.trim().length > 10 && !stem.includes("؟ و") ? "pass" : "warn"),
    },
    {
      id: "no_option_repeat",
      titleAr: "تجنب تكرار كلمات الجذع بالخيارات",
      titleEn: "Avoid repeating stem words in options",
      descAr: "وضع الألفاظ المشتركة في الجذع بدلاً من تكرارها داخل كل بديل لمنع الحشو.",
      descEn: "Place common words in the item stem rather than repeating in every choice.",
      evaluate: (stem, options) => {
        if (!options || options.length === 0) return "pass";
        const words = stem.split(/\s+/).filter((w) => w.length > 4);
        let repeatCount = 0;
        options.forEach((opt) => {
          words.forEach((w) => {
            if (opt.includes(w)) repeatCount++;
          });
        });
        return repeatCount >= options.length * 2 ? "warn" : "pass";
      },
    },
    {
      id: "no_absolutes",
      titleAr: "تجنب الكلمات المطلقة وعبارة (كل ما سبق)",
      titleEn: "No absolute terms or 'All/None of Above'",
      descAr: "خلو الخيارات والجذع من عبارات (دائماً، أبداً، كل ما سبق، لا شيء مما سبق، جميع ما سبق).",
      descEn: "STRICTLY avoid 'All of the above', 'None of the above', and absolute terms like 'always/never'.",
      evaluate: (stem, options) => {
        const fullText = (stem + " " + (options ? options.join(" ") : "")).toLowerCase();
        const banned = [
          "كل ما سبق",
          "جميع ما سبق",
          "جميع ماذكر",
          "جميع الاجابات",
          "لا شيء مما سبق",
          "دائماً",
          "أبداً",
          "all of the above",
          "none of the above",
          "always",
          "never",
        ];
        return banned.some((b) => fullText.includes(b)) ? "warn" : "pass";
      },
    },
    {
      id: "no_clues",
      titleAr: "خلو السؤال من الإيحاء بمفتاح الإجابة",
      titleEn: "No verbal or grammatical clues to answer key",
      descAr: "تجنب التلميحات النحوية أو اللفظية المعطاة بالطبيعة والتي تؤشر للخيار الصحيح.",
      descEn: "No grammatical agreement or verbal hints pointing to the correct choice.",
      evaluate: (_, options, correct) => {
        if (!correct || !options || options.length === 0) return "pass";
        const avgLen = options.reduce((acc, curr) => acc + curr.length, 0) / options.length;
        if (correct.length > avgLen * 2.2) return "warn";
        return "pass";
      },
    },
    {
      id: "equal_length",
      titleAr: "تكافئ وتجانس الخيارات في الطول والنمط",
      titleEn: "Equal and parallel choice length & structure",
      descAr: "أن تكون جميع البدائل متقاربة ومتساوية في عدد الكلمات والنمط التركيبي لتقليل التخمين.",
      descEn: "Choices should be parallel in length and grammatical structure to minimize guessing.",
      evaluate: (_, options) => {
        if (!options || options.length < 2) return "pass";
        const lens = options.map((o) => o.trim().length);
        const minL = Math.min(...lens);
        const maxL = Math.max(...lens);
        return maxL > 0 && minL / maxL < 0.3 ? "warn" : "pass";
      },
    },
    {
      id: "single_correct",
      titleAr: "وجود إجابة واحدة صحيحة ومحددة تماماً",
      titleEn: "Single clear, indisputable correct answer",
      descAr: "تأكيد أن خياراً واحداً فقط صحيح بدقة مع كون المشتتات الأخرى جذابة ولكنها غير صحيحة.",
      descEn: "Exactly one correct key with plausible but incorrect distractors.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
  ],
  tf: [
    {
      id: "tf_single_idea",
      titleAr: "احتواء العبارة على فكرة علمية واحدة فقط",
      titleEn: "Single factual idea per statement",
      descAr: "تجنب العبارات المركبة أو التي تجمع أكثر من قضية علمية في وقت واحد.",
      descEn: "Limit statement to a single factual concept without compound clauses.",
      evaluate: (stem) => (stem.includes(" و ") && stem.length > 80 ? "warn" : "pass"),
    },
    {
      id: "tf_no_absolutes",
      titleAr: "تجنب كلمات التعميم المطلق (دائماً، أبداً)",
      titleEn: "No absolute terms (always, never, all)",
      descAr: "الكلمات المطلقة تشير غالباً للخطأ وسهلة التخمين من الطالب.",
      descEn: "Absolute words tend to clue 'False' to savvy test takers.",
      evaluate: (stem) => {
        const text = stem.toLowerCase();
        const banned = ["دائماً", "أبداً", "جميع", "كلياً", "إطلاقاً", "always", "never", "completely"];
        return banned.some((b) => text.includes(b)) ? "warn" : "pass";
      },
    },
    {
      id: "tf_no_double_negatives",
      titleAr: "تجنب النفي والنفي المزدوج",
      titleEn: "No double negatives or confusing phrasing",
      descAr: "الصياغة بعبارة إثبات مباشرة بدلاً من صياغة نفي المعرفة.",
      descEn: "Use direct positive phrasing rather than confusing negative constructions.",
      evaluate: (stem) => {
        const text = stem.toLowerCase();
        return text.includes("لا يعتبر غير") || text.includes("ليس من غير") || text.includes("not un") ? "warn" : "pass";
      },
    },
  ],
  fill: [
    {
      id: "fill_sufficient_context",
      titleAr: "توفير سياق كافٍ يحدد الإجابة بدقة",
      titleEn: "Sufficient context to determine required term",
      descAr: "أن تعطي الجملة معنى كاملاً يوجه نحو الكلمة أو المصطلح المستهدف.",
      descEn: "Sentence provides enough background so the correct word is obvious.",
      evaluate: (stem) => (stem.length >= 25 ? "pass" : "warn"),
    },
    {
      id: "fill_single_blank",
      titleAr: "اقتصار الجملة على فراغ واحد '___'",
      titleEn: "Single blank ('___') per sentence",
      descAr: "عدم تشتيت الطالب بأكثر من فراغ في السطر الواحد لتحديد الاستجابة.",
      descEn: "Limit to one blank per item to keep question focused.",
      evaluate: (stem) => {
        const count = (stem.match(/___/g) || []).length;
        return count === 1 ? "pass" : "warn";
      },
    },
    {
      id: "fill_key_term",
      titleAr: "تخصيص الفراغ للكلمة أو المصطلح الجوهري",
      titleEn: "Blank targets essential key term only",
      descAr: "أن يكون الفراغ لمفهوم أو مصطلح محوري وليس لكلمات عامة عابرة.",
      descEn: "Target the main concept or technical term, not filler words.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
  ],
  matching: [
    {
      id: "match_more_responses",
      titleAr: "زيادة خيارات العمود ب عن مثيرات العمود أ",
      titleEn: "Column B responses outnumber Column A premises",
      descAr: "إضافة خيارات استجابة غير قابلة للمزاوجة للحد من التخمين بالاستبعاد.",
      descEn: "Include extra response options to prevent process-of-elimination guessing.",
      evaluate: () => "pass",
    },
    {
      id: "match_homogeneity",
      titleAr: "تجانس المفردات والخيارات في القائمة الواحدة",
      titleEn: "Homogeneous items in each column",
      descAr: "تجمع عناصر العمود حول موضوع واحد متجانس (أعلام، تعاريف، تواريخ).",
      descEn: "Keep premises and responses aligned around a consistent topic.",
      evaluate: () => "pass",
    },
  ],
  essay: [
    {
      id: "essay_clear_prompt",
      titleAr: "صياغة المطلوب بوضوح ومباشرة",
      titleEn: "Clear and direct prompt instructions",
      descAr: "تحديد طبيعة الاستجابة المطلوبة وحجمها والزمن المستهدف لها.",
      descEn: "Specify the expected response scope and key evaluation focus.",
      evaluate: (stem) => (stem.length >= 20 ? "pass" : "warn"),
    },
    {
      id: "essay_rubric",
      titleAr: "وجود دليل تصحيح وإجابة نموذجية معاييرية",
      titleEn: "Model rubric and reference answer key",
      descAr: "توفير الإجابة النموذجية المعتمدة لضمان العدالة والموضوعية عند التقييم.",
      descEn: "Include a scoring rubric to ensure grading consistency.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
  ],
  multi_mcq: [
    {
      id: "multi_notice",
      titleAr: "التنويه الصريح بوجود أكثر من إجابة صحيحة",
      titleEn: "Clear instruction to select all correct answers",
      descAr: "تنبيه الطالب في متن السؤال إلى إمكانية اختيار أكثر من إجابة.",
      descEn: "Explicitly inform student to select all applicable correct options.",
      evaluate: (stem) => (stem.includes("أكثر") || stem.includes("كافة") || stem.includes("جميع الإجابات") || stem.includes("select all") ? "pass" : "warn"),
    },
    {
      id: "multi_balanced",
      titleAr: "تكافئ الخيارات وتحديد الإجابات الصحيحة",
      titleEn: "Balanced options with clear correct answers",
      descAr: "أن تكون جميع البدائل متسقة ومحددة الإجابات الصحيحة بوضوح.",
      descEn: "Ensure options are homogeneous and correct choices are identified.",
      evaluate: (_, options) => (options && options.length >= 4 ? "pass" : "warn"),
    },
  ],
  ordering: [
    {
      id: "order_scheme",
      titleAr: "وضوح معيار الترتيب (زمني، منطقي، إجرائي)",
      titleEn: "Clear ordering scheme (chronological, logical, procedural)",
      descAr: "بيان أساس الترتيب المطلوبة بعبارة صريحة ودقيقة لا تحتمل اللبس.",
      descEn: "State the sequence logic explicitly in the item stem.",
      evaluate: (stem) => (stem.includes("ترتيب") || stem.includes("تسلسل") || stem.includes("ارتب") || stem.includes("order") || stem.includes("sequence") ? "pass" : "warn"),
    },
  ],
  diagram_labeling: [
    {
      id: "diagram_clarity",
      titleAr: "وضوح الصورة أو المخطط التوضيحي وخلوه من الإجابة المباشرة",
      titleEn: "Diagram resolution & absence of embedded direct answers",
      descAr: "التأكد من جودة الصورة أو المخطط التوضيحي وإزالة أي نصوص تكشف الإجابات.",
      descEn: "Verify image quality and remove any text embedded in the image that gives away keys.",
      evaluate: (stem) => (stem.length > 5 ? "pass" : "warn"),
    },
    {
      id: "diagram_key_explicit",
      titleAr: "وضوح مفتاح الإجابات ودليل التصحيح للأجزاء المشار إليها",
      titleEn: "Explicit answer key & rubric for numbered callout labels",
      descAr: "تحديد مسمى وإجابة نموذجية صريحة لكل رقم أو رمز في الرسم التوضيحي.",
      descEn: "Include an explicit model answer key for every numbered target callout.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
  ],
};

// Stage 3 Criteria: Focus on Comprehensive Psychometric Audit, Bloom Alignment & Academic Certification
const STAGE3_CHECKLISTS: Record<string, ChecklistCriterion[]> = {
  mcq: [
    {
      id: "stage3_bloom_alignment",
      titleAr: "التوافق مع مستوى بلوم ونواتج التعلم المستهدفة",
      titleEn: "Alignment with Bloom's level & learning outcomes",
      descAr: "مطابقة الفعل الإجرائي ومستوى التفكير المعرفي المطلوب في المنهج (تذكر، فهم، تطبيق، تحليل، تقويم، إبداع) وعدم الهبوط لمستوى أدنى.",
      descEn: "Verify procedural verb aligns with targeted Bloom level and course learning outcome without cognitive drop.",
      evaluate: (stem) => (stem.trim().length >= 15 ? "pass" : "warn"),
    },
    {
      id: "stage3_scientific_truth",
      titleAr: "الصدق العلمي والدقة الموضوعية للمفهوم المحكّم",
      titleEn: "Scientific validity & indisputable accuracy",
      descAr: "دقة الحقائق والمفاهيم العلمية المطروحة مع كون الإجابة النموذجية صحيحة قطعيًا دون احتمالية الاختلاف الأكاديمي.",
      descEn: "Ensure factual correctness of the key without ambiguity or academic controversy.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
    {
      id: "stage3_distractor_misconceptions",
      titleAr: "فاعلية المشتتات والقدرة التشخيصية للمفاهيم الخاطئة",
      titleEn: "Distractor quality & diagnostic misconception power",
      descAr: "بناء الخيارات الخاطئة على الأخطاء الشائعة والأنماط التفكيرية غير المتمكنة وليس على استبعاد عشوائي أو شكلي.",
      descEn: "Distractors must be plausible, targeting common student misconceptions rather than random filler.",
      evaluate: (_, options) => (options && options.length >= 4 ? "pass" : "warn"),
    },
    {
      id: "stage3_fairness_bias_free",
      titleAr: "العدالة السيكومترية وخلو السؤال من التحيّز",
      titleEn: "Psychometric fairness & bias-free wording",
      descAr: "خلو البند من التحيّز الثقافي أو الاجتماعي أو الجندري أو السياقي لضمان فرصة متكافئة لجميع الطلاب.",
      descEn: "Ensure wording is culturally neutral and free of gender/regional bias for all test-takers.",
      evaluate: () => "pass",
    },
    {
      id: "stage3_scoring_rubric_time",
      titleAr: "وضوح مفتاح الإجابة والتقدير الزمني والدرجة المستحقة",
      titleEn: "Clear answer key, rubric & estimated completion time",
      descAr: "تحديد مفتاح التصحيح المعياري والوزن النسبي والزمن التقديري المخصص لإجابة الطالب.",
      descEn: "Provide definitive answer key, point weight, and estimated completion time.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
    {
      id: "stage3_item_bank_readiness",
      titleAr: "جاهزية البند للأرشفة والاعتماد في بنك الأسئلة",
      titleEn: "Item bank compliance & export certification readiness",
      descAr: "استيفاء البند لكافة الشروط السيكومترية الأكاديمية وصلاحتيه للاعتماد والتصدير المباشر في الاختبار الأكاديمي.",
      descEn: "Item meets all psychometric audit criteria and is ready for institutional bank indexing.",
      evaluate: () => "pass",
    },
  ],
  tf: [
    {
      id: "stage3_tf_validity",
      titleAr: "الصدق الظاهري ودقة العبارة التقريرية",
      titleEn: "Face validity & factual accuracy",
      descAr: "صياغة عبارة حقيقية أو خاطئة بشكل قطعي ومباشر دون تأويلات مزدوجة.",
      descEn: "Statement is strictly True or False with zero factual ambiguity.",
      evaluate: (stem) => (stem.length >= 15 ? "pass" : "warn"),
    },
    {
      id: "stage3_tf_bloom",
      titleAr: "قياس الفهم والتحليل وتجنب التذكر السطحي",
      titleEn: "Targeting comprehension & analysis over rote recall",
      descAr: "قياس الاستدلال والفهم المفاهيمي بدلاً من استدعاء الكلمات بالنص.",
      descEn: "Measures conceptual understanding rather than verbatim memory.",
      evaluate: () => "pass",
    },
  ],
  fill: [
    {
      id: "stage3_fill_precision",
      titleAr: "دقة الكلمة المفتاحية وقابليتها للتقييم الآلي",
      titleEn: "Key phrase precision & auto-grading clarity",
      descAr: "تحديد الكلمة المطلوبة بدقة تضمن عدم تعدد المرادفات أو التشتت في التقييم.",
      descEn: "Target answer is concise and unambiguous for reliable computer grading.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
  ],
  matching: [
    {
      id: "stage3_match_homogeneity",
      titleAr: "التجانس السيكومتري بين مثيرات واستجابات المزاوجة",
      titleEn: "Psychometric homogeneity across premises & responses",
      descAr: "أن تكون كافة مفردات العمودين تنتمي إلى مجال معرفي واحد محدد بدقة.",
      descEn: "Premises and responses must belong to a single coherent domain.",
      evaluate: () => "pass",
    },
  ],
  essay: [
    {
      id: "stage3_essay_rubric",
      titleAr: "اعتماد سلم التقدير اللفظي (Rubric) ومعايير التقدير",
      titleEn: "Approved scoring rubric & criterion breakdown",
      descAr: "توفير معايير التقييم وتوزيع الدرجات على عناصر الإجابة لضمان التقدير الموضوعي.",
      descEn: "Explicit scoring rubric mapping point allocations to required response elements.",
      evaluate: (_, __, correct) => (correct && correct.trim().length > 0 ? "pass" : "warn"),
    },
  ],
  multi_mcq: [
    {
      id: "stage3_multi_key",
      titleAr: "تحديد مفاتيح الإجابة المتعددة والوزن النسبي لكل خيار",
      titleEn: "Multi-key identification & partial credit weighting",
      descAr: "وضوح البدائل الصحيحة المتعددة وآلية احتساب الدرجة الجزئية أو الكلية.",
      descEn: "Identify all correct options and define partial scoring logic.",
      evaluate: (_, options) => (options && options.length >= 4 ? "pass" : "warn"),
    },
  ],
  ordering: [
    {
      id: "stage3_order_validity",
      titleAr: "حتمية التسلسل المنطقي والصحة الأكاديمية للترتيب",
      titleEn: "Strict logical sequence & academic correctness",
      descAr: "أن يكون الترتيب صحيحاً أكاديمياً ومحتوماً زمنيًا أو إجرائيًا دون أي ترتيب بديل مقبول.",
      descEn: "Sequence order is strictly linear and undisputed in academic literature.",
      evaluate: () => "pass",
    },
  ],
};

export default function ImproveTab({ onAddQuestion, lang, stage = "2" }: ImproveTabProps) {
  const t = translations[lang].improve;
  const isRtl = lang === "ar";

  const [qType, setQType] = useState<"mcq" | "tf" | "fill" | "matching" | "essay" | "multi_mcq" | "ordering" | "diagram_labeling">("mcq");
  const [diagramImage, setDiagramImage] = useState<string | null>(null);
  const diagramImgInputRef = useRef<HTMLInputElement>(null);

  const handleDiagramImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError(isRtl ? "يرجى اختيار صورة صحيحة (PNG, JPG, SVG, WebP)." : "Please select a valid image (PNG, JPG, SVG, WebP).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDiagramImage(event.target.result as string);
          setError("");
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const [stem, setStem] = useState(
    isRtl
      ? "تعتبر الاختبارات التحصيلية دائما افضل طريقة لقياس أهداف الطالب في المنهج أليس كذلك؟"
      : "Are achievement tests always the best way to measure student learning objectives in the curriculum, right?"
  );
  const [options, setOptions] = useState<string[]>([
    isRtl ? "نعم هي الأفضل دائما وأبدا" : "Yes, they are always the best",
    isRtl ? "لا ليست الأفضل إطلاقاً" : "No, they are never the best",
    isRtl ? "تعتمد على الهدف والموقف التعليمي" : "It depends on the objective and educational context",
    isRtl ? "جميع ما سبق صحيح" : "All of the above are correct",
  ]);
  const [correctAnswer, setCorrectAnswer] = useState(
    isRtl ? "تعتمد على الهدف والموقف التعليمي" : "It depends on the objective and educational context"
  );
  const [tfAnswer, setTfAnswer] = useState(isRtl ? "خطأ" : "False");
  const [fillSentence, setFillSentence] = useState(
    isRtl
      ? "يقيس معامل ___ مدى اتساق نتائج الاختبار عند إعادة تطبيقه."
      : "The ___ coefficient measures test score consistency upon retesting."
  );
  const [fillTarget, setFillTarget] = useState(isRtl ? "الثبات" : "reliability");

  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [isAltLoading, setIsAltLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdded, setIsAdded] = useState(false);
  const [copiedAltIndex, setCopiedAltIndex] = useState<number | null>(null);

  // Per-criterion Direct Fix Approval State & Notification Toast
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});
  const [fixToast, setFixToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setFixToast(msg);
    setTimeout(() => setFixToast(null), 3500);
  };

  const handleApplyFix = (
    criterionKey: string,
    targetField: "stem" | "options" | "correctAnswer" | "all",
    suggestedFixText?: string,
    suggestedOptions?: string[]
  ) => {
    if (!analysisResult) return;

    const stemVal = suggestedFixText || analysisResult.enhancedStem;
    const optionsVal = suggestedOptions && suggestedOptions.length > 0 ? suggestedOptions : analysisResult.enhancedOptions;
    const correctVal = suggestedFixText || analysisResult.enhancedCorrectAnswer;

    if (targetField === "stem" || targetField === "all") {
      if (qType === "fill") {
        setFillSentence(stemVal);
      } else {
        setStem(stemVal);
      }
    }

    if (targetField === "options" || targetField === "all") {
      if (optionsVal && optionsVal.length > 0) {
        setOptions(optionsVal);
      }
    }

    if (targetField === "correctAnswer" || targetField === "all") {
      if (qType === "tf") {
        setTfAnswer(correctVal);
      } else if (qType === "fill") {
        setFillTarget(correctVal);
      } else {
        setCorrectAnswer(correctVal);
      }
    }

    setAppliedFixes((prev) => ({ ...prev, [criterionKey]: true }));

    triggerToast(
      isRtl
        ? "✓ تم قبول واقتباس التعديل المقترح وتحديث محرر السؤال بنجاح!"
        : "✓ Proposed edit approved and applied to item editor successfully!"
    );
  };

  const handleApplyAllFixes = () => {
    if (!analysisResult) return;

    if (qType === "fill") {
      if (analysisResult.enhancedStem) setFillSentence(analysisResult.enhancedStem);
      if (analysisResult.enhancedCorrectAnswer) setFillTarget(analysisResult.enhancedCorrectAnswer);
    } else if (qType === "tf") {
      if (analysisResult.enhancedStem) setStem(analysisResult.enhancedStem);
      if (analysisResult.enhancedCorrectAnswer) setTfAnswer(analysisResult.enhancedCorrectAnswer);
    } else {
      if (analysisResult.enhancedStem) setStem(analysisResult.enhancedStem);
      if (analysisResult.enhancedOptions && analysisResult.enhancedOptions.length > 0) {
        setOptions(analysisResult.enhancedOptions);
      }
      if (analysisResult.enhancedCorrectAnswer) setCorrectAnswer(analysisResult.enhancedCorrectAnswer);
    }

    const newApplied: Record<string, boolean> = {};
    currentChecklist.forEach((item) => {
      newApplied[item.id] = true;
    });
    if (analysisResult.criterionFixes) {
      analysisResult.criterionFixes.forEach((cf: any) => {
        newApplied[cf.criterionId] = true;
      });
    }
    setAppliedFixes(newApplied);

    triggerToast(
      isRtl
        ? "✨ تم قبول وتطبيق جميع الاقتراحات والتعديلات المعيارية الشاملة بضغطة زر واحدة!"
        : "✨ All suggested quality improvements applied to item editor with one click!"
    );
  };

  // Teacher Voice Dictation / Speech-to-text State
  const [activeListeningId, setActiveListeningId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleToggleListening = (targetId: string, onAppendText: (text: string) => void) => {
    if (activeListeningId === targetId) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setActiveListeningId(null);
      return;
    }

    // Stop existing if running on another target
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        isRtl
          ? "خاصية تحويل الصوت إلى نص غير مدعومة في هذا المتصفح. يُنصح بفتح التطبيق عبر متصفح Google Chrome."
          : "Speech recognition is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    setSpeechError(null);
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = lang === "ar" ? "ar-EG" : "en-US";

      recognition.onstart = () => {
        setActiveListeningId(targetId);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          onAppendText(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError(
            isRtl
              ? "تعذر الوصول إلى الميكروفون. يرجى التكرم بتقديم صلاحيات الميكروفون للمتصفح."
              : "Microphone access was denied. Please allow microphone permissions."
          );
        } else if (event.error === "no-speech") {
          // silent pause
        } else {
          setSpeechError(
            isRtl ? `حدث تنبيه أثناء التسجيل الصوتي (${event.error})` : `Speech error: ${event.error}`
          );
        }
        setActiveListeningId(null);
      };

      recognition.onend = () => {
        setActiveListeningId(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setActiveListeningId(null);
    }
  };

  // Interactive Checklist User State (checked overrides)
  const [userChecked, setUserChecked] = useState<Record<string, boolean>>({});

  const isStage3 = stage === "3";
  const activeChecklists = isStage3 ? STAGE3_CHECKLISTS : STAGE2_CHECKLISTS;
  const currentChecklist = activeChecklists[qType] || activeChecklists["mcq"];

  const handleToggleCheck = (id: string) => {
    setUserChecked((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleImprove = async () => {
    setIsLoading(true);
    setError("");
    setAnalysisResult(null);
    setAlternatives([]);
    setIsAdded(false);
    setAppliedFixes({});

    let activeStem = stem;
    let activeOptions = options;
    let activeCorrect = correctAnswer;

    if (qType === "tf") {
      activeOptions = [isRtl ? "صواب" : "True", isRtl ? "خطأ" : "False"];
      activeCorrect = tfAnswer;
    } else if (qType === "fill") {
      activeStem = fillSentence;
      activeOptions = [];
      activeCorrect = fillTarget;
    }

    try {
      const res = await fetch("/api/audit-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qType,
          stem: activeStem,
          options: activeOptions,
          correctAnswer: activeCorrect,
          lang,
          stage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isRtl ? "فشل تحليل الصياغة" : "Audit failed"));
      }

      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isRtl ? "حدث خطأ غير متوقع." : "An unexpected error occurred."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchAlternatives = async () => {
    if (!analysisResult) return;
    setIsAltLoading(true);

    try {
      const res = await fetch("/api/generate-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem: analysisResult.enhancedStem || stem,
          qType,
          lang,
        }),
      });

      const data = await res.json();
      if (res.ok && data.alternatives) {
        setAlternatives(data.alternatives);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAltLoading(false);
    }
  };

  const handleAddToBank = () => {
    if (!analysisResult) return;

    const diffIdx = typeof analysisResult.difficultyIndex === "number" ? analysisResult.difficultyIndex : 0.60;
    const discIdx = typeof analysisResult.discriminationIndex === "number" ? analysisResult.discriminationIndex : 0.42;
    const discStatus = analysisResult.discriminationStatus || (isRtl ? "ممتاز" : "Excellent");

    const newQuestion: Question = {
      id: `improved-${Date.now()}`,
      qType,
      stem: analysisResult.enhancedStem || stem,
      options: qType === "mcq" || qType === "multi_mcq" || qType === "diagram_labeling" ? analysisResult.enhancedOptions || options : undefined,
      correctAnswer: analysisResult.enhancedCorrectAnswer || correctAnswer,
      imageUrl: diagramImage || undefined,
      bloom: analysisResult.bloomClassification || (isRtl ? "فهم" : "Understand"),
      difficulty: analysisResult.difficultyLevel || (isRtl ? "متوسطة" : "Moderate"),
      difficultyIndex: diffIdx,
      discriminationIndex: discIdx,
      discriminationStatus: discStatus,
      notes: analysisResult.defectsFound || [],
    };

    onAddQuestion(newQuestion);
    setIsAdded(true);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAltIndex(index);
    setTimeout(() => setCopiedAltIndex(null), 2000);
  };

  const activeStemForEvaluation = qType === "fill" ? fillSentence : stem;
  const activeCorrectForEvaluation = qType === "tf" ? tfAnswer : qType === "fill" ? fillTarget : correctAnswer;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Input panel & Interactive Pre-Check Checklist */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm sticky top-24 space-y-6">
        <div className="flex items-center gap-2 text-slate-900 pb-3 border-b border-slate-100">
          <FileCheck className="w-5 h-5 text-blue-600" />
          <h3 className="font-display font-bold text-lg">
            {isStage3
              ? isRtl
                ? "وحدة التقييم والتحكيم السيكومتري"
                : "Psychometric Evaluation & Audit"
              : t.title}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="qTypeImprove" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.qTypeLabel}
            </label>
            <select
              id="qTypeImprove"
              value={qType}
              onChange={(e) => {
                setQType(e.target.value as any);
                setAnalysisResult(null);
              }}
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

          <input
            type="file"
            ref={diagramImgInputRef}
            onChange={handleDiagramImageChange}
            accept="image/*"
            className="hidden"
          />

          {qType === "diagram_labeling" && (
            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-rose-600" />
                  <span>{isRtl ? "صورة أو رسم المخطط التوضيحي" : "Diagram Image / Drawing"}</span>
                </label>
                <button
                  type="button"
                  onClick={() => diagramImgInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-white hover:bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-600" />
                  <span>{diagramImage ? (isRtl ? "تغيير الصورة" : "Change Image") : (isRtl ? "رفع صورة/رسم المخطط" : "Upload Diagram")}</span>
                </button>
              </div>

              {diagramImage ? (
                <div className="relative rounded-xl overflow-hidden border border-rose-200 bg-white p-2 flex flex-col items-center">
                  <img src={diagramImage} alt="Diagram" className="max-h-48 object-contain rounded-lg shadow-2xs" />
                  <button
                    type="button"
                    onClick={() => setDiagramImage(null)}
                    className="mt-2 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRtl ? "إزالة الصورة" : "Remove Image"}</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => diagramImgInputRef.current?.click()}
                  className="border-2 border-dashed border-rose-200/80 hover:border-rose-400 bg-white rounded-xl p-4 text-center cursor-pointer transition-colors"
                >
                  <FileImage className="w-8 h-8 text-rose-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    {isRtl ? "اضغط هنا لرفع صورة الرسم أو المخطط التوضيحي" : "Click here to upload diagram image or drawing"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG, WebP</p>
                </div>
              )}
            </div>
          )}

          {(qType === "mcq" || qType === "multi_mcq" || qType === "matching" || qType === "ordering" || qType === "essay" || qType === "diagram_labeling") && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="stemMcq" className="block text-xs font-semibold text-slate-700">
                    {t.stemLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleListening("stemMcq", (text) =>
                        setStem((prev) => (prev ? `${prev} ${text}` : text))
                      )
                    }
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
                      activeListeningId === "stemMcq"
                        ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                    title={isRtl ? "إملاء صوتي / تحويل الملاحظات الصوتية للمعلم إلى نص" : "Voice dictation for teacher notes"}
                  >
                    {activeListeningId === "stemMcq" ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                        <span>{isRtl ? "إيقاف الإملاء الصوتي..." : "Stop Dictation..."}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isRtl ? "إملاء صوتي بالميكروفون" : "Voice Dictation"}</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="stemMcq"
                  value={stem}
                  onChange={(e) => setStem(e.target.value)}
                  className="w-full min-h-[90px] p-3 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900"
                  placeholder={isRtl ? "أدخل نص السؤال أو استخدم الإملاء الصوتي بالميكروفون..." : "Enter question stem or use voice dictation..."}
                />
                {activeListeningId === "stemMcq" && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold animate-pulse">
                    <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>
                      {isRtl
                        ? "جاري الاستماع... تحدث الآن لإضافة نص السؤال أو الملاحظة تلقائياً"
                        : "Listening... Speak now to dictate question text or notes automatically"}
                    </span>
                  </div>
                )}
                {speechError && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold">
                    {speechError}
                  </div>
                )}
              </div>

              {(qType === "mcq" || qType === "multi_mcq" || qType === "matching" || qType === "ordering" || qType === "diagram_labeling") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      {qType === "diagram_labeling" ? (isRtl ? "مسميات الأجزاء المراد إكمالها (1-4)" : "Target Callout Labels (1-4)") : t.optionsLabel}
                    </label>
                    <span className="text-[10px] text-blue-700 font-bold">
                      {isRtl ? "🎤 الإملاء الصوتي للخيارات متاح بضغط زر الميكروفون" : "🎤 Dictate individual options with mic"}
                    </span>
                  </div>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[idx] = e.target.value;
                            setOptions(newOpts);
                          }}
                          placeholder={isRtl ? `الخيار ${idx + 1}...` : `Option ${idx + 1}...`}
                          className={`w-full p-2 pe-9 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900 transition-colors ${
                            activeListeningId === `opt-${idx}`
                              ? "border-rose-400 bg-rose-50/70 font-semibold text-rose-950"
                              : "border-slate-300"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleListening(`opt-${idx}`, (text) => {
                              setOptions((prevOpts) => {
                                const copy = [...prevOpts];
                                copy[idx] = copy[idx] ? `${copy[idx]} ${text}` : text;
                                return copy;
                              });
                            })
                          }
                          className={`absolute end-1.5 p-1 rounded-lg transition-all cursor-pointer ${
                            activeListeningId === `opt-${idx}`
                              ? "bg-rose-600 text-white animate-pulse"
                              : "text-slate-400 hover:text-blue-600 hover:bg-slate-200/60"
                          }`}
                          title={isRtl ? `إملاء صوتي للخيار ${idx + 1}` : `Dictate option ${idx + 1}`}
                        >
                          {activeListeningId === `opt-${idx}` ? (
                            <MicOff className="w-3.5 h-3.5 animate-bounce" />
                          ) : (
                            <Mic className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="correctMcq" className="block text-xs font-semibold text-slate-700">
                    {qType === "essay" ? (isRtl ? "الإجابة النموذجية ودليل التصحيح" : "Model Answer & Rubric") : t.correctLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleListening("correctAnswer", (text) => {
                        const trimmed = text.trim();
                        if (qType === "mcq" || qType === "multi_mcq") {
                          // Try matching spoken text with existing options or ordinal words
                          const lower = trimmed.toLowerCase();
                          let matchedOpt = options.find((o) => o.toLowerCase() === lower || lower.includes(o.toLowerCase()));
                          if (!matchedOpt) {
                            if (lower.includes("أول") || lower.includes("اول") || lower.includes("first") || lower.includes("1")) {
                              matchedOpt = options[0];
                            } else if (lower.includes("ثاني") || lower.includes("second") || lower.includes("2")) {
                              matchedOpt = options[1];
                            } else if (lower.includes("ثالث") || lower.includes("third") || lower.includes("3")) {
                              matchedOpt = options[2];
                            } else if (lower.includes("رابع") || lower.includes("fourth") || lower.includes("4")) {
                              matchedOpt = options[3];
                            }
                          }
                          if (matchedOpt) {
                            setCorrectAnswer(matchedOpt);
                          } else {
                            setCorrectAnswer((prev) => (prev ? `${prev} ${text}` : text));
                          }
                        } else {
                          setCorrectAnswer((prev) => (prev ? `${prev} ${text}` : text));
                        }
                      })
                    }
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                      activeListeningId === "correctAnswer"
                        ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {activeListeningId === "correctAnswer" ? (
                      <MicOff className="w-3 h-3 text-rose-600 animate-bounce" />
                    ) : (
                      <Mic className="w-3 h-3 text-blue-600" />
                    )}
                    <span>
                      {qType === "essay"
                        ? isRtl
                          ? "إملاء الإجابة النموذجية"
                          : "Dictate rubric"
                        : isRtl
                        ? "إملاء الإجابة الصحيحة"
                        : "Dictate answer"}
                    </span>
                  </button>
                </div>
                {qType === "mcq" || qType === "multi_mcq" ? (
                  <select
                    id="correctMcq"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className={`w-full p-2.5 border rounded-xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-none font-medium ${
                      activeListeningId === "correctAnswer" ? "border-rose-400 ring-2 ring-rose-200" : "border-slate-300"
                    }`}
                  >
                    {options.map((opt, idx) => (
                      <option key={idx} value={opt}>
                        {t.optNum} {idx + 1}: {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder={
                      qType === "essay"
                        ? isRtl
                          ? "أدخل الإجابة النموذجية أو النقاط الرئيسية للإجابة أو استخدم الإملاء الصوتي..."
                          : "Enter model answer or rubric points or use voice dictation..."
                        : isRtl
                        ? "أدخل الإجابة الصحيحة أو استخدم الإملاء الصوتي..."
                        : "Enter correct answer or use voice dictation..."
                    }
                    className={`w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900 font-medium ${
                      activeListeningId === "correctAnswer" ? "border-rose-400 bg-rose-50/70" : "border-slate-300"
                    }`}
                  />
                )}
                {activeListeningId === "correctAnswer" && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold animate-pulse">
                    <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>
                      {isRtl
                        ? "جاري الاستماع... تحدث الآن لإملاء الإجابة الصحيحة"
                        : "Listening... Speak now to dictate correct answer"}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {qType === "tf" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="stemTf" className="block text-xs font-semibold text-slate-700">
                    {t.tfStatementLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleListening("stemTf", (text) =>
                        setStem((prev) => (prev ? `${prev} ${text}` : text))
                      )
                    }
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
                      activeListeningId === "stemTf"
                        ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                    title={isRtl ? "إملاء صوتي / تحويل الملاحظات الصوتية للمعلم إلى نص" : "Voice dictation for teacher notes"}
                  >
                    {activeListeningId === "stemTf" ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                        <span>{isRtl ? "إيقاف الإملاء الصوتي..." : "Stop Dictation..."}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isRtl ? "إملاء صوتي بالميكروفون" : "Voice Dictation"}</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="stemTf"
                  value={stem}
                  onChange={(e) => setStem(e.target.value)}
                  className="w-full min-h-[90px] p-3 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900"
                  placeholder={isRtl ? "أدخل عبارة السؤال أو استخدم الإملاء الصوتي..." : "Enter statement or use voice dictation..."}
                />
                {activeListeningId === "stemTf" && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold animate-pulse">
                    <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>
                      {isRtl
                        ? "جاري الاستماع... تحدث الآن لإضافة العبارة تلقائياً"
                        : "Listening... Speak now to dictate statement automatically"}
                    </span>
                  </div>
                )}
                {speechError && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold">
                    {speechError}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="tfAnswer" className="block text-xs font-semibold text-slate-700">
                    {t.tfAnswerLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleListening("tfAnswer", (text) => {
                        const lower = text.trim().toLowerCase();
                        if (lower.includes("صح") || lower.includes("صواب") || lower.includes("true") || lower.includes("صحيح")) {
                          setTfAnswer(isRtl ? "صواب" : "True");
                        } else if (lower.includes("خطأ") || lower.includes("خطا") || lower.includes("false") || lower.includes("خاطئ")) {
                          setTfAnswer(isRtl ? "خطأ" : "False");
                        }
                      })
                    }
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                      activeListeningId === "tfAnswer"
                        ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {activeListeningId === "tfAnswer" ? (
                      <MicOff className="w-3 h-3 text-rose-600 animate-bounce" />
                    ) : (
                      <Mic className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{isRtl ? "إملاء الإجابة (صواب/خطأ)" : "Dictate T/F"}</span>
                  </button>
                </div>
                <select
                  id="tfAnswer"
                  value={tfAnswer}
                  onChange={(e) => setTfAnswer(e.target.value)}
                  className={`w-full p-2.5 border rounded-xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-none font-medium ${
                    activeListeningId === "tfAnswer" ? "border-rose-400 ring-2 ring-rose-200" : "border-slate-300"
                  }`}
                >
                  <option value={isRtl ? "صواب" : "True"}>{isRtl ? "صواب" : "True"}</option>
                  <option value={isRtl ? "خطأ" : "False"}>{isRtl ? "خطأ" : "False"}</option>
                </select>
                {activeListeningId === "tfAnswer" && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold animate-pulse">
                    <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>
                      {isRtl
                        ? "قل «صواب» أو «خطأ» لتحديد الإجابة تلقائياً..."
                        : "Say 'True' or 'False' to set answer automatically..."}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {qType === "fill" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="fillSentence" className="block text-xs font-semibold text-slate-700">
                    {t.fillSentenceLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleListening("fillSentence", (text) =>
                        setFillSentence((prev) => (prev ? `${prev} ${text}` : text))
                      )
                    }
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
                      activeListeningId === "fillSentence"
                        ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                    title={isRtl ? "إملاء صوتي / تحويل الملاحظات الصوتية للمعلم إلى نص" : "Voice dictation for teacher notes"}
                  >
                    {activeListeningId === "fillSentence" ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                        <span>{isRtl ? "إيقاف الإملاء الصوتي..." : "Stop Dictation..."}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isRtl ? "إملاء صوتي بالميكروفون" : "Voice Dictation"}</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="fillSentence"
                  value={fillSentence}
                  onChange={(e) => setFillSentence(e.target.value)}
                  className="w-full min-h-[90px] p-3 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900"
                  placeholder={isRtl ? "أدخل جملة الإكمال مع كلمة بين قوسين [...] أو استخدم الإملاء الصوتي..." : "Enter completion sentence or use voice dictation..."}
                />
                {activeListeningId === "fillSentence" && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold animate-pulse">
                    <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>
                      {isRtl
                        ? "جاري الاستماع... تحدث الآن لإضافة النص تلقائياً"
                        : "Listening... Speak now to dictate sentence automatically"}
                    </span>
                  </div>
                )}
                {speechError && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold">
                    {speechError}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="fillTarget" className="block text-xs font-semibold text-slate-700">
                    {t.fillAnswerLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleListening("fillTarget", (text) =>
                        setFillTarget((prev) => (prev ? `${prev} ${text}` : text))
                      )
                    }
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                      activeListeningId === "fillTarget"
                        ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {activeListeningId === "fillTarget" ? (
                      <MicOff className="w-3 h-3 text-rose-600 animate-bounce" />
                    ) : (
                      <Mic className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{isRtl ? "إملاء الكلمة الصحيحة" : "Dictate answer"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  id="fillTarget"
                  value={fillTarget}
                  onChange={(e) => setFillTarget(e.target.value)}
                  className={`w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-slate-900 font-medium ${
                    activeListeningId === "fillTarget" ? "border-rose-400 bg-rose-50/70" : "border-slate-300"
                  }`}
                />
              </div>
            </>
          )}

          {/* Interactive Quality Checklist Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <span>
                  {isStage3
                    ? isRtl
                      ? "قائمة تحكيم الجودة والاعتماد السيكومتري (المرحلة 3)"
                      : "Stage 3 Psychometric Audit Checklist"
                    : t.checklistTitle}
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full">
                {currentChecklist.length} {isRtl ? "معايير" : "rules"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isStage3
                ? isRtl
                  ? "معايير الفحص السيكومتري الشامل، الصدق العلمي، مطابقة مستوى بلوم المعرفي، وفاعلية المشتتات والعدالة:"
                  : "Comprehensive psychometric audit rules covering Bloom alignment, scientific validity, distractor power, and fairness:"
                : t.checklistSub}
            </p>

            <div className="space-y-2 pt-1">
              {currentChecklist.map((item) => {
                const autoStatus = item.evaluate(activeStemForEvaluation, options, activeCorrectForEvaluation);
                const isCheckedManually = userChecked[item.id];
                const title = isRtl ? item.titleAr : item.titleEn;
                const desc = isRtl ? item.descAr : item.descEn;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isCheckedManually || autoStatus === "pass"
                        ? "bg-white border-slate-200 hover:border-blue-300"
                        : "bg-amber-50/60 border-amber-200 hover:border-amber-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isCheckedManually || autoStatus === "pass"}
                      onChange={() => handleToggleCheck(item.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-slate-800 text-[11px] leading-snug">{title}</span>
                        {autoStatus === "pass" ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {t.checkPass}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {t.checkWarn}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-700 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <button
            onClick={handleImprove}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all border border-white/10"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading
              ? isStage3
                ? isRtl
                  ? "جاري الفحص والتحكيم السيكومتري..."
                  : "Running Psychometric Audit..."
                : t.improveLoading
              : isStage3
              ? isRtl
                ? "أجرِ التحكيم والتقييم السيكومتري الشامل (المرحلة 3)"
                : "Run Comprehensive Stage 3 Psychometric Audit"
              : t.improveBtn}
          </button>
        </div>
      </div>

      {/* Output analysis panel */}
      <div className="lg:col-span-7 space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[300px] border border-slate-200 bg-white rounded-2xl p-8 text-center text-slate-600 space-y-4 animate-pulse shadow-sm">
            <Sparkles className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-900">
              {isStage3
                ? isRtl
                  ? "جاري التحكيم السيكومتري وفحص مطابقة بلوم والعدالة والصدق العلمي..."
                  : "Performing Stage 3 psychometric audit & Bloom alignment check..."
                : t.loadingTitle}
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              {isStage3
                ? isRtl
                  ? "يتم تحليل السؤال مقابل المعايير السيكومترية المعتمدة وتحديد ثغرات البند وبناء المخرجات المحكّمة."
                  : "Analyzing item against psychometric audit standards to verify Bloom cognitive depth and distractor quality."
                : t.loadingSub}
            </p>
          </div>
        )}

        {!isLoading && !analysisResult && (
          <div className="flex flex-col items-center justify-center min-h-[350px] border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-display font-semibold text-lg text-slate-900 mb-1">
              {isStage3
                ? isRtl
                  ? "جاهز للتحكيم والتقييم السيكومتري الشامل"
                  : "Ready for Stage 3 Psychometric Audit"
                : t.emptyTitle}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {isStage3
                ? isRtl
                  ? "أدخل بيانات السؤال وانقر على زر التحكيم السيكومتري لتوليد تقرير الاعتماد الأكاديمي الشامل للبند."
                  : "Enter item data and click the audit button to perform a complete psychometric evaluation."
                : t.emptySub}
            </p>
          </div>
        )}

        {!isLoading && analysisResult && (
          <div className="space-y-6">
            {/* Interactive Audit Summary Card & Psychometric Score Gauge */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 border border-slate-700 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <h4 className="font-display font-bold text-base text-white">{t.auditSummaryTitle}</h4>
                  </div>
                  <p className="text-xs text-slate-300">{t.auditScoreLabel}</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-xl">
                  <div className="text-center">
                    <span className="font-display text-2xl font-black text-blue-400">
                      {analysisResult.qualityScore || 85}
                    </span>
                    <span className="text-xs text-slate-400 block font-semibold">{t.outOf100}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-700"></div>
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">
                      {(analysisResult.qualityScore || 85) >= 85
                        ? isRtl
                          ? "ممتاز مطابق للمواصفات"
                          : "Excellent Compliance"
                        : (analysisResult.qualityScore || 85) >= 70
                        ? isRtl
                          ? "مقبول مع تحسينات"
                          : "Acceptable with edits"
                        : isRtl
                        ? "ضعيف يتطلب إعادة صياغة"
                        : "Requires Rephrasing"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isRtl ? "مراجعة الذكاء الاصطناعي السيكومترية" : "Psychometric AI Review"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Meter Bar */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      (analysisResult.qualityScore || 85) >= 85
                        ? "bg-gradient-to-r from-blue-500 to-emerald-400"
                        : (analysisResult.qualityScore || 85) >= 70
                        ? "bg-gradient-to-r from-blue-500 to-amber-400"
                        : "bg-gradient-to-r from-rose-500 to-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, analysisResult.qualityScore || 85))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Interactive Compliance Checklist Verification Results with One-Click Replace/Improve Proposals */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900">
                    {t.complianceListTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRtl
                      ? "المعالج الذكي يقدم اقتراحات تعديل نصية مباشرة لكل معيار لتطبيقها بضغطة زر واحدة:"
                      : "AI Processor provides direct text edit proposals for each criterion to apply with one click:"}
                  </p>
                </div>

                {analysisResult && (
                  <button
                    type="button"
                    onClick={handleApplyAllFixes}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer border border-emerald-400/30 active:scale-98"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                    <span>
                      {isRtl
                        ? "✨ موافقة وتطبيق كافة التعديلات الشاملة (بضغطة واحدة)"
                        : "✨ Approve & Apply All Suggested Edits (One-Click)"}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {currentChecklist.map((criterion, idx) => {
                  const title = isRtl ? criterion.titleAr : criterion.titleEn;
                  const desc = isRtl ? criterion.descAr : criterion.descEn;
                  const heuristic = criterion.evaluate(activeStemForEvaluation, options, activeCorrectForEvaluation);
                  // Check if any defect in analysisResult explicitly flags this criterion
                  const isFlaggedByAI = (analysisResult.defectsFound || []).some((defect: string) =>
                    defect.toLowerCase().includes(criterion.id) || defect.toLowerCase().includes(title.toLowerCase())
                  );

                  const isPass = heuristic === "pass" && !isFlaggedByAI;

                  // Find explicit criterionFix from Gemini if returned
                  const explicitFix = (analysisResult.criterionFixes || []).find((cf: any) =>
                    cf.criterionId === criterion.id ||
                    cf.criterionId?.toLowerCase().includes(criterion.id.toLowerCase()) ||
                    title.toLowerCase().includes(cf.criterionId?.toLowerCase() || "")
                  );

                  // Determine target field & direct suggested text
                  let targetField: "stem" | "options" | "correctAnswer" | "all" = explicitFix?.targetField || "stem";
                  let suggestedFixText = explicitFix?.suggestedFixText;
                  let suggestedOptions = explicitFix?.suggestedOptions;
                  let actionLabel = isRtl
                    ? explicitFix?.actionLabelAr || "تطبيق التعديل المقترح"
                    : explicitFix?.actionLabelEn || "Apply Proposed Edit";

                  if (!explicitFix) {
                    const cid = criterion.id.toLowerCase();
                    if (cid.includes("option") || cid.includes("distractor") || cid.includes("clue") || cid.includes("choice") || cid.includes("all_none")) {
                      targetField = "options";
                      suggestedOptions = analysisResult.enhancedOptions;
                      actionLabel = isRtl ? "موافقة واستبدال الخيارات والبدائل" : "Approve & Replace Choices";
                    } else if (cid.includes("answer") || cid.includes("key") || cid.includes("rubric")) {
                      targetField = "correctAnswer";
                      suggestedFixText = analysisResult.enhancedCorrectAnswer;
                      actionLabel = isRtl ? "موافقة وتحديث الإجابة النموذجية" : "Approve & Update Answer Key";
                    } else {
                      targetField = "stem";
                      suggestedFixText = analysisResult.enhancedStem;
                      actionLabel = isRtl ? "موافقة واستبدال رأس السؤال" : "Approve & Replace Stem";
                    }
                  }

                  const isApplied = appliedFixes[criterion.id] || false;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                        isApplied
                          ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200"
                          : isPass
                          ? "bg-slate-50/80 border-slate-200/90"
                          : "bg-amber-50/70 border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          {isApplied ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isPass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <span>{title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isApplied && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              {isRtl ? "تمت الموافقة والتطبيق" : "Applied"}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isPass
                                ? "bg-emerald-100/80 text-emerald-800 border-emerald-300"
                                : "bg-amber-100/80 text-amber-800 border-amber-300"
                            }`}
                          >
                            {isPass ? t.passStatus : t.warnStatus}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-[11px] leading-relaxed pr-6">{desc}</p>

                      {/* Direct One-Click Text Edit Proposal Box */}
                      <div className="mt-2 pt-2 border-t border-slate-200/80">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <Wand2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>{isRtl ? "اقتراح التعديل النصي المباشر للمعلم:" : "Direct Text Edit Proposal:"}</span>
                            </span>
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              {targetField === "stem" ? (isRtl ? "رأس السؤال (Stem)" : "Stem") : targetField === "options" ? (isRtl ? "الخيارات (Choices)" : "Choices") : (isRtl ? "الإجابة النموذجية (Key)" : "Answer Key")}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-800 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 font-mono font-medium leading-relaxed">
                            {targetField === "options" && ((suggestedOptions && suggestedOptions.length > 0) || (analysisResult.enhancedOptions && analysisResult.enhancedOptions.length > 0)) ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {(suggestedOptions || analysisResult.enhancedOptions).map((opt: string, oIdx: number) => (
                                  <div key={oIdx} className="bg-white p-1.5 rounded border border-slate-200 text-[10px] text-slate-800 font-sans">
                                    <span className="font-bold text-blue-600 ml-1">({oIdx + 1})</span> {opt}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="font-sans text-[11px] text-slate-900 leading-relaxed font-semibold">
                                {suggestedFixText || analysisResult.enhancedStem}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500 italic">
                              {isRtl ? "اضغط زر الموافقة لاستبدال النص مباشرة في محرر السؤال" : "Click approve to replace text directly in item editor"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplyFix(criterion.id, targetField, suggestedFixText, suggestedOptions)}
                              disabled={isApplied}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                isApplied
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                                  : "bg-blue-600 hover:bg-blue-700 active:scale-98 text-white border border-blue-700"
                              }`}
                            >
                              {isApplied ? (
                                <>
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{isRtl ? "تم اعتماد التعديل في المحرر" : "Applied to Editor"}</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3.5 h-3.5 text-white" />
                                  <span>{actionLabel} (بضغطة زر)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Question Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>

              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  {t.enhancedTitle}
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200 px-2.5 py-1 rounded-full text-[11px]">
                    {analysisResult.bloomClassification}
                  </span>
                  <span className="bg-violet-50 text-violet-700 font-bold border border-violet-200 px-2.5 py-1 rounded-full text-[11px]">
                    {analysisResult.difficultyLevel}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 px-2.5 py-1 rounded-full text-[11px]">
                    {isRtl ? "السهولة (p):" : "Difficulty (p):"}{" "}
                    {typeof analysisResult.difficultyIndex === "number"
                      ? `${Math.round(analysisResult.difficultyIndex * 100)}%`
                      : "62%"}
                  </span>
                  <span className="bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 px-2.5 py-1 rounded-full text-[11px]">
                    {isRtl ? "التمييز (D):" : "Discrimination (D):"}{" "}
                    {typeof analysisResult.discriminationIndex === "number"
                      ? analysisResult.discriminationIndex.toFixed(2)
                      : "0.45"}{" "}
                    ({analysisResult.discriminationStatus || (isRtl ? "ممتاز" : "Excellent")})
                  </span>
                </div>
              </div>

              {/* Psychometric Indices Summary Panel */}
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                    P
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {isRtl ? "معامل السهولة والصعوبة (Facility Value)" : "Facility Value / Difficulty Index (p)"}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      p ={" "}
                      {typeof analysisResult.difficultyIndex === "number"
                        ? `${analysisResult.difficultyIndex.toFixed(2)} (${Math.round(analysisResult.difficultyIndex * 100)}%)`
                        : "0.62 (62%)"}{" "}
                      <span className="text-[10px] text-emerald-700 font-normal">
                        ({isRtl ? "متوازن ومثالي" : "Optimal range"})
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                    D
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {isRtl ? "معامل التمييز (Discrimination Index)" : "Discrimination Index (D)"}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      D ={" "}
                      {typeof analysisResult.discriminationIndex === "number"
                        ? analysisResult.discriminationIndex.toFixed(2)
                        : "0.45"}{" "}
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        {analysisResult.discriminationStatus || (isRtl ? "ممتاز (D ≥ 0.40)" : "Excellent")}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-base font-bold text-slate-900 mb-4 leading-relaxed">
                {qType === "fill" ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: (analysisResult.enhancedStem || fillSentence).replace(
                        "___",
                        `<span class="inline-block px-3 py-0.5 border-b-2 border-dotted border-blue-600 text-blue-700 font-bold mx-1">${t.blankWord}</span>`
                      ),
                    }}
                  />
                ) : (
                  analysisResult.enhancedStem || stem
                )}
              </p>

              {(qType === "mcq" || qType === "multi_mcq" || qType === "matching" || qType === "ordering") &&
                analysisResult.enhancedOptions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    {analysisResult.enhancedOptions.map((opt: string, oIdx: number) => {
                      const isCorrect = opt === analysisResult.enhancedCorrectAnswer;
                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold ${
                            isCorrect
                              ? "border-blue-500 bg-blue-50 text-blue-950 font-bold shadow-sm"
                              : "border-slate-200 bg-slate-50/60 text-slate-700"
                          }`}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4">
                {t.modelAnswer} {analysisResult.enhancedCorrectAnswer || activeCorrectForEvaluation}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-600">
                  {t.originalScore}{" "}
                  <span className="font-bold text-blue-700">{analysisResult.qualityScore || 85}</span> {t.outOf100}
                </div>
                <button
                  onClick={handleAddToBank}
                  disabled={isAdded}
                  className={`text-xs px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    isAdded
                      ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-default"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  }`}
                >
                  {isAdded ? t.addedBtn : t.addBtn}
                </button>
              </div>
            </div>

            {/* Audit Feedback Notes */}
            {analysisResult.defectsFound && analysisResult.defectsFound.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                  {t.feedbackTitle}
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {analysisResult.defectsFound.map((item: string, idx: number) => (
                    <li key={idx} className="flex gap-2.5 items-start">
                      <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative stems generator */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900">{t.altsTitle}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.altsSub}</p>
                </div>
                <button
                  onClick={handleFetchAlternatives}
                  disabled={isAltLoading}
                  className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  {isAltLoading ? t.altsBtnLoading : t.altsBtn}
                </button>
              </div>

              {alternatives.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  {alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-800 gap-3"
                    >
                      <div className="flex gap-2">
                        <span className="font-bold text-blue-600">
                          {t.altLabel} {idx + 1}:
                        </span>
                        <span>{alt}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(alt, idx)}
                        className="text-slate-500 hover:text-blue-600 transition-colors shrink-0 p-1 cursor-pointer"
                        title={t.copyTitle}
                      >
                        {copiedAltIndex === idx ? (
                          <Check className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Toast Notification for One-Click Edit Application */}
      {fixToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{fixToast}</span>
        </div>
      )}
      </div>
    </div>
  );
}

